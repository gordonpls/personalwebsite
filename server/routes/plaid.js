const express = require("express");
const crypto = require("crypto");
const { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } = require("plaid");
const items = require("../lib/plaid-items");
const { logPlaid, logPlaidResponse, logPlaidError } = require("../lib/plaid-log");
const { sendPlaidRelinkEmail } = require("../lib/notify");

const router = express.Router();

const env = process.env.PLAID_ENV || "sandbox";

const plaidConfig = new Configuration({
    basePath: PlaidEnvironments[env],
    baseOptions: {
        headers: {
            "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
            "PLAID-SECRET": env === "production"
                ? process.env.PLAID_SECRET_PRODUCTION
                : process.env.PLAID_SECRET_SANDBOX,
        },
    },
});

const plaidClient = new PlaidApi(plaidConfig);

// Plaid Items live in server/.plaid-items.json (preferred) or legacy env vars
// (backwards-compat). See server/lib/plaid-items.js for the storage rationale.
function getTokens() {
    return items.loadItems().map((i) => ({ institution: i.institution, token: i.accessToken, itemId: i.itemId }));
}

// Cached fetcher with two free-tier safeguards:
//  1. in-flight dedup — concurrent requests on a cold cache share ONE upstream
//     fetch instead of each firing their own (prevents a traffic stampede from
//     multiplying Plaid/Finnhub calls).
//  2. serve-stale-on-error — a failed/rate-limited refresh returns the last good
//     data rather than erroring (which would invite immediate client retries).
// Together with the TTLs, this bounds upstream calls to ~one batch per TTL.
// The returned function also has an .invalidate() method for post-relink cache busting.
function cached(ttlMs) {
    const s = { at: 0, data: null, inFlight: null };
    const fn = (fetcher) => {
        if (s.data && Date.now() - s.at < ttlMs) return Promise.resolve(s.data);
        if (s.inFlight) return s.inFlight;
        s.inFlight = Promise.resolve()
            .then(fetcher)
            .then((data) => { s.at = Date.now(); s.data = data; return data; })
            .catch((err) => { if (s.data) return s.data; throw err; })
            .finally(() => { s.inFlight = null; });
        return s.inFlight;
    };
    fn.invalidate = () => { s.at = 0; s.data = null; };
    return fn;
}
const getHoldings = cached(6 * 60 * 60 * 1000); // 6h — Plaid is billed per call
const getQuotes = cached(2 * 60 * 1000);        // 2 min — Finnhub free is 60/min

// One-time nonce for the relink completion handshake (prevents CSRF on the callback).
let _relinkNonce = null;

// Plaid reports each security's name as the brokerage labels it, which is
// sometimes cryptically abbreviated (VXUS -> "Vng Ttl Intl St Shs") or simply
// wrong (META has come through as "National Access Cannabis Corp"). Override
// the display name for tickers we know Plaid mislabels; every other ticker
// falls back to Plaid's name, so newly-added holdings still work automatically.
const NAME_OVERRIDES = {
    VXUS: "Vanguard Total International Stock ETF",
    BND: "Vanguard Total Bond Market ETF",
    BNDX: "Vanguard Total International Bond ETF",
    META: "Meta Platforms, Inc.",
    LIFE: "Ethos Technologies Inc.",
};

// Per-share average cost overrides for tickers whose brokerage-reported cost
// basis is bad data (e.g. a near-zero cost basis that yields an absurd return).
// When set, the Return calc uses avgCost * quantity instead of Plaid's value.
const COST_BASIS_OVERRIDE = { HL: 6.17 };

// Force specific tickers into a display portfolio regardless of which account
// holds them (e.g. semiconductor ADRs held in a Vanguard account that belong in
// the speculative bucket). Checked before the institution/subtype mapping.
const PORTFOLIO_OVERRIDE = {
    ASMIY: "Tech & Speculation",
    DSCSY: "Tech & Speculation",
    RNECY: "Tech & Speculation",
};

// Map institution + account subtype to a display portfolio bucket.
// Vanguard is the diversified "Core"; Robinhood splits by account type.
function portfolioOf(institution, subtype) {
    if (institution !== "Robinhood") return "Core";
    return /ira|roth|401|403|457|pension|retire|sep|simple|keogh|tsp/.test(subtype || "")
        ? "Retirement"
        : "Tech & Speculation";
}

// ── Link token: create OR update-mode ──
// Body { access_token? }
//   omitted → fresh Link flow for a brand-new Item (one-time setup).
//   present → update mode: regenerates the Item's session so a stuck
//             ITEM_LOGIN_REQUIRED / PENDING_EXPIRATION / etc. Item can be
//             re-authorized without exchanging for a new access token. The
//             same access_token resumes working after the user completes Link.
router.post("/link/token/create", async (req, res) => {
    if (process.env.PLAID_SETUP_ENABLED !== "true") return res.status(404).end();
    const { access_token } = req.body || {};
    try {
        const payload = {
            user: { client_user_id: "owner" },
            client_name: "Gordon Zhong Portfolio",
            country_codes: [CountryCode.Us],
            language: "en",
        };
        if (access_token) {
            // Update mode: omit `products`, pass the stuck access_token.
            payload.access_token = access_token;
        } else {
            // New-Item mode.
            payload.products = [Products.Investments];
        }
        const response = await plaidClient.linkTokenCreate(payload);
        logPlaidResponse("link.token.create", response, { mode: access_token ? "update" : "new" });
        res.json({ link_token: response.data.link_token, mode: access_token ? "update" : "new" });
    } catch (err) {
        logPlaidError("link.token.create", err);
        res.status(500).json({ error: "Failed to create link token" });
    }
});

// ── One-time setup: exchange the public token Plaid Link gives you ──
// After completing Link, POST the public_token + the institution label here.
// The item is persisted to server/.plaid-items.json automatically; the
// access_token is also returned for the operator to copy into env vars as a
// belt-and-suspenders backup.
router.post("/link/token/exchange", async (req, res) => {
    if (process.env.PLAID_SETUP_ENABLED !== "true") return res.status(404).end();
    const { public_token, institution } = req.body || {};
    if (!public_token) return res.status(400).json({ error: "public_token required" });
    try {
        const response = await plaidClient.itemPublicTokenExchange({ public_token });
        const { access_token, item_id } = response.data;
        const persistedInstitution = institution || "Unknown";
        try {
            items.addItem({ institution: persistedInstitution, accessToken: access_token, itemId: item_id });
        } catch (e) {
            // Catalog write failure shouldn't lose the token for the operator —
            // they can still copy it from the response. Surface the error in logs.
            logPlaid({ level: "warn", event: "items.add.fail", item_id, message: e.message });
        }
        logPlaidResponse("link.token.exchange", response, { institution: persistedInstitution, item_id });
        // access_token returned for the operator's records; never logged.
        res.json({ access_token, item_id, institution: persistedInstitution });
    } catch (err) {
        logPlaidError("link.token.exchange", err);
        res.status(500).json({ error: "Failed to exchange token" });
    }
});

// ── Admin: list the catalogued items (no tokens) ──
router.get("/items", (_req, res) => {
    if (process.env.PLAID_SETUP_ENABLED !== "true") return res.status(404).end();
    res.json({ items: items.listPublic() });
});

// ── Admin: remove an item upstream + drop it from the catalog ──
// Best practice (per Plaid): delete Items via /item/remove when no longer
// needed (user offboarding, prolonged error state, etc.). This calls the
// upstream remove, then expires the local catalog entry.
router.post("/items/remove", async (req, res) => {
    if (process.env.PLAID_SETUP_ENABLED !== "true") return res.status(404).end();
    const { item_id } = req.body || {};
    if (!item_id) return res.status(400).json({ error: "item_id required" });
    const target = items.loadItems().find((i) => i.itemId === item_id);
    if (!target) return res.status(404).json({ error: "item_id not found in catalog" });
    try {
        const response = await plaidClient.itemRemove({ access_token: target.accessToken });
        logPlaidResponse("item.remove", response, { item_id });
        items.removeItem(item_id);
        res.json({ removed: 1, request_id: response.data.request_id });
    } catch (err) {
        logPlaidError("item.remove", err, { item_id });
        res.status(500).json({ error: "Failed to remove item" });
    }
});

// ── Admin: enrich every catalog Item with institution + accounts so you can
// spot duplicates before calling /items/remove. Uses Plaid's accountsGet
// (returns the accounts list + the Item's institution_id) and
// institutionsGetById (turns institution_id into a friendly display name).
// Items sharing the same plaidInstitutionId are flagged as `duplicateGroup`. ──
router.get("/items/inspect", async (_req, res) => {
    if (process.env.PLAID_SETUP_ENABLED !== "true") return res.status(404).end();
    const cat = items.loadItems();
    const enriched = await Promise.all(cat.map(async (entry) => {
        if (!entry.accessToken) {
            return { itemId: entry.itemId, institution: entry.institution, error: "no access token in catalog entry" };
        }
        try {
            const acctResp = await plaidClient.accountsGet({ access_token: entry.accessToken });
            const { accounts, item } = acctResp.data;
            logPlaidResponse("accounts.get", acctResp, { item_id: item?.item_id, institution: entry.institution });
            let institutionName = null;
            if (item?.institution_id) {
                try {
                    const instResp = await plaidClient.institutionsGetById({
                        institution_id: item.institution_id,
                        country_codes: [CountryCode.Us],
                    });
                    institutionName = instResp.data.institution?.name ?? null;
                    logPlaidResponse("institutions.get_by_id", instResp, { item_id: item.item_id });
                } catch (instErr) {
                    logPlaidError("institutions.get_by_id", instErr, { item_id: item?.item_id });
                }
            }
            return {
                itemId: item?.item_id ?? entry.itemId,
                catalogLabel: entry.institution,
                plaidInstitutionId: item?.institution_id ?? null,
                plaidInstitutionName: institutionName,
                linkedAt: entry.linkedAt,
                lastSyncedAt: entry.lastSyncedAt,
                itemCreatedAt: item?.created_at ?? null,
                itemError: item?.error ?? null,
                consentedProducts: item?.consented_products ?? null,
                accounts: (accounts || []).map((a) => ({
                    accountId: a.account_id,
                    name: a.name,
                    officialName: a.official_name,
                    mask: a.mask,
                    type: a.type,
                    subtype: a.subtype,
                })),
            };
        } catch (err) {
            logPlaidError("accounts.get", err, { item_id: entry.itemId, institution: entry.institution });
            return {
                itemId: entry.itemId,
                catalogLabel: entry.institution,
                error: err.response?.data?.error_message ?? err.message,
                errorCode: err.response?.data?.error_code ?? null,
            };
        }
    }));
    // Mark duplicate groups by plaidInstitutionId. Two items sharing an
    // institution_id is suspicious (you probably linked the same bank twice);
    // sharing institution_id AND an accountId is definitely a duplicate.
    const byInst = new Map();
    for (const it of enriched) {
        if (!it.plaidInstitutionId) continue;
        const arr = byInst.get(it.plaidInstitutionId) ?? [];
        arr.push(it);
        byInst.set(it.plaidInstitutionId, arr);
    }
    for (const group of byInst.values()) {
        if (group.length > 1) {
            for (const it of group) it.duplicateGroup = it.plaidInstitutionId;
        }
    }
    res.json({ items: enriched });
});

// Build the privacy-safe holdings payload from Plaid (no $ amounts/account names).
async function fetchHoldingsPayload() {
    const agg = new Map(); // "Portfolio|TICKER" -> { ..., value }
    let total = 0, costSum = 0, costValueSum = 0;

    for (const { institution, token, itemId } of getTokens()) {
        let resp;
        try {
            resp = await plaidClient.investmentsHoldingsGet({ access_token: token });
        } catch (err) {
            const code = err.response?.data?.error_code;
            logPlaidError("investments.holdings.get", err, { institution, item_id: itemId });
            if (code === "ITEM_LOGIN_REQUIRED" || code === "PENDING_EXPIRATION") {
                console.error(
                    `[plaid] ${code} on item ${itemId} (${institution}).\n` +
                    `        Relink required: visit /api/plaid/relink?secret=<PLAID_RELINK_SECRET>`
                );
                if (itemId) {
                    // Only email on the first detection — not on every retry while the
                    // error persists (the catalog already has error+errorAt at that point).
                    const alreadyFlagged = items.loadItems().find((i) => i.itemId === itemId)?.error;
                    items.markError(itemId, code);
                    if (!alreadyFlagged) {
                        sendPlaidRelinkEmail({ institution, itemId, errorCode: code })
                            .catch((e) => console.error("[notify] email failed:", e.message));
                    }
                }
            }
            throw err;
        }
        logPlaidResponse("investments.holdings.get", resp, { institution, item_id: itemId ?? resp.data?.item?.item_id });
        if (resp.data?.item?.item_id) items.markSynced(resp.data.item.item_id);

        // Self-heal a missing/"Unknown" institution label (which would otherwise
        // mis-bucket this item's holdings into "Core"). Resolve the real name from
        // Plaid once and persist it; subsequent fetches use the catalog value.
        let inst = institution;
        if (!inst || inst === "Unknown") {
            const instId = resp.data?.item?.institution_id;
            const realItemId = itemId ?? resp.data?.item?.item_id;
            if (instId) {
                try {
                    const ir = await plaidClient.institutionsGetById({
                        institution_id: instId,
                        country_codes: [CountryCode.Us],
                    });
                    const name = ir.data?.institution?.name;
                    if (name) {
                        inst = name;
                        if (realItemId) items.setInstitution(realItemId, name);
                        logPlaid({ level: "info", event: "items.institution.resolved", item_id: realItemId, institution: name });
                    }
                } catch (e) {
                    logPlaidError("institutions.get_by_id", e, { item_id: realItemId });
                }
            }
        }

        const { holdings, securities, accounts } = resp.data;
        const secMap = Object.fromEntries(securities.map((s) => [s.security_id, s]));
        const acctSubtype = Object.fromEntries((accounts || []).map((a) => [a.account_id, (a.subtype || "").toLowerCase()]));

        for (const h of holdings) {
            const value = h.institution_value ?? 0;
            if (value <= 0) continue; // skip empty positions
            const sec = secMap[h.security_id] ?? {};
            const stype = (sec.type || "").toLowerCase();
            const tkr = (sec.ticker_symbol || "").toUpperCase();
            // exclude cash / money-market and crypto from the portfolio view
            if (sec.is_cash_equivalent === true || stype === "cash" || tkr.startsWith("CUR:")) continue;
            if (stype === "cryptocurrency") continue;
            total += value;
            const override = COST_BASIS_OVERRIDE[tkr];
            const lotCost = override != null ? override * (h.quantity ?? 0) : h.cost_basis;
            const hasCost = lotCost != null && lotCost > 0;
            if (hasCost) { costSum += lotCost; costValueSum += value; }
            const portfolio = PORTFOLIO_OVERRIDE[tkr] ?? portfolioOf(inst, acctSubtype[h.account_id]);
            const ticker = sec.ticker_symbol ?? sec.name ?? "Unknown";
            const key = `${portfolio}|${ticker}`;
            const cur = agg.get(key) ?? {
                portfolio,
                ticker: sec.ticker_symbol ?? null,
                name: NAME_OVERRIDES[tkr] ?? sec.name ?? ticker,
                type: sec.type ?? null,
                value: 0,
                cbCost: 0,   // summed cost basis of the lots that report it
                cbValue: 0,  // current value of those same lots (so the % is consistent)
            };
            cur.value += value;
            if (hasCost) { cur.cbCost += lotCost; cur.cbValue += value; }
            agg.set(key, cur);
        }
    }

    const holdings = [...agg.values()]
        .map((h) => ({
            portfolio: h.portfolio,
            ticker: h.ticker,
            name: h.name,
            type: h.type,
            weightPct: total > 0 ? Math.round((h.value / total) * 10000) / 100 : 0,
            // total return since purchase for this position (% only); null when the
            // brokerage didn't report cost basis for it.
            returnPct: h.cbCost > 0 ? Math.round(((h.cbValue - h.cbCost) / h.cbCost) * 1000) / 10 : null,
        }))
        .filter((h) => h.weightPct > 0) // drop only true dust; renormalized per portfolio on the client
        .sort((a, b) => b.weightPct - a.weightPct);

    // Overall total return vs cost basis (% only — never a dollar amount).
    const totalReturnPct = costSum > 0 ? Math.round(((costValueSum - costSum) / costSum) * 1000) / 10 : null;

    return { asOf: new Date().toISOString(), totalReturnPct, holdings };
}

// Live daily % change per ticker from Finnhub (free tier: 60/min).
async function fetchQuotesPayload(tickers) {
    const key = process.env.FINNHUB_API_KEY;
    const quotes = {};
    await Promise.all(tickers.map(async (t) => {
        try {
            const r = await fetch(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(t)}&token=${key}`);
            const q = await r.json();
            // dp = daily percent change; c = current price (0 for symbols Finnhub can't quote)
            if (q && typeof q.dp === "number" && q.c) quotes[t] = Math.round(q.dp * 100) / 100;
        } catch { /* skip unquotable ticker */ }
    }));
    return { asOf: new Date().toISOString(), quotes };
}

// ── Public, privacy-safe holdings: portfolio + ticker + relative weight only ──
router.get("/holdings", async (_req, res) => {
    if (!getTokens().length) return res.status(503).json({ error: "No access tokens configured" });
    try {
        res.json(await getHoldings(fetchHoldingsPayload));
    } catch (err) {
        console.error("[holdings]", err.response?.data ?? err.message);
        res.status(500).json({ error: "Failed to fetch holdings" });
    }
});

// ── Public: live daily % change per holding ticker (Finnhub), for the heatmap ──
router.get("/quotes", async (_req, res) => {
    if (!process.env.FINNHUB_API_KEY) return res.status(503).json({ error: "No quote provider configured" });
    try {
        const h = await getHoldings(fetchHoldingsPayload); // reuse cached holdings for the ticker list
        const tickers = [...new Set((h.holdings || []).map((x) => x.ticker).filter(Boolean))];
        res.json(await getQuotes(() => fetchQuotesPayload(tickers)));
    } catch (err) {
        console.error("[quotes]", err.response?.data ?? err.message);
        res.status(500).json({ error: "Failed to fetch quotes" });
    }
});

// ── Relink flow ──────────────────────────────────────────────────────────────
// When a Plaid Item enters ITEM_LOGIN_REQUIRED (bank credentials changed, MFA
// changed, institution revoked access), the same access_token can be recovered
// without relinking from scratch — Plaid Link's "update mode" re-authenticates
// the user at the institution and clears the error, keeping the same token.
//
// Usage (no PLAID_SETUP_ENABLED flag needed — gated by PLAID_RELINK_SECRET):
//   GET /api/plaid/relink?secret=<PLAID_RELINK_SECRET>[&item_id=<itemId>]
//   → opens Plaid Link in update mode for the specified item (or the first
//     item in error state, or the first item in the catalog if none are errored).
//   After Link completes, the page POSTs to /api/plaid/relink/complete automatically.
//
// One-time setup: set PLAID_RELINK_SECRET in server/.env.

router.get("/plaid/relink", async (req, res) => {
    const secret = process.env.PLAID_RELINK_SECRET;
    if (!secret || req.query.secret !== secret) return res.status(401).send("Unauthorized");

    const allItems = items.loadItems();
    if (!allItems.length) return res.status(404).send("No items in catalog.");

    let target;
    if (req.query.item_id) {
        target = allItems.find((i) => i.itemId === req.query.item_id);
        if (!target) return res.status(404).send(`item_id ${req.query.item_id} not found in catalog.`);
    } else {
        // Prefer an item already flagged as errored; fall back to first item.
        target = allItems.find((i) => i.error) ?? allItems[0];
    }

    let link_token;
    try {
        const response = await plaidClient.linkTokenCreate({
            user: { client_user_id: "owner" },
            client_name: "Gordon Zhong Portfolio",
            country_codes: [CountryCode.Us],
            language: "en",
            access_token: target.accessToken,
        });
        logPlaidResponse("link.token.create", response, { mode: "relink", institution: target.institution });
        link_token = response.data.link_token;
    } catch (err) {
        logPlaidError("link.token.create", err);
        return res.status(500).send("Failed to create link token: " + (err.response?.data?.error_message ?? err.message));
    }

    // Generate a one-time nonce so the completion endpoint doesn't need the secret in HTML.
    _relinkNonce = crypto.randomBytes(16).toString("hex");
    setTimeout(() => { _relinkNonce = null; }, 30 * 60 * 1000); // expires in 30 min

    // Escape values embedded in HTML.
    const safeInstitution = target.institution.replace(/[<>"'&]/g, "");
    const safeItemId = (target.itemId ?? "").replace(/[^a-zA-Z0-9_-]/g, "");
    const safeLinkToken = link_token.replace(/[^a-zA-Z0-9_-]/g, "");
    const safeNonce = _relinkNonce;

    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Relink ${safeInstitution}</title>
  <style>body{font-family:system-ui,sans-serif;max-width:480px;margin:4rem auto;padding:1rem}</style>
</head>
<body>
  <h2>Relink ${safeInstitution}</h2>
  <p id="status">Opening Plaid Link…</p>
  <script src="https://cdn.plaid.com/link/v2/stable/link-initialize.js"></script>
  <script>
    const handler = Plaid.create({
      token: "${safeLinkToken}",
      onSuccess: async function(_pub, _meta) {
        document.getElementById("status").textContent = "Completing relink…";
        const r = await fetch("/api/plaid/relink/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nonce: "${safeNonce}", item_id: "${safeItemId}" }),
        });
        const j = await r.json();
        document.getElementById("status").textContent = r.ok
          ? "✅ Relink complete. Holdings will refresh on the next poll (up to 6 h)."
          : "❌ " + (j.error || "Unknown error completing relink.");
      },
      onExit: function(err) {
        document.getElementById("status").textContent = err
          ? "❌ " + (err.error_message || "Plaid Link error.")
          : "Cancelled — close this tab and try again if needed.";
      },
    });
    handler.open();
  </script>
</body>
</html>`);
});

router.post("/plaid/relink/complete", async (req, res) => {
    const { nonce, item_id } = req.body || {};
    if (!nonce || !_relinkNonce || nonce !== _relinkNonce) {
        return res.status(400).json({ error: "Invalid or expired nonce — restart the flow via /api/plaid/relink." });
    }
    _relinkNonce = null; // consume nonce

    // item_id is null for legacy env-var tokens (no catalog entry); clearError
    // is a no-op in that case, but we still must bust the holdings cache.
    if (item_id) items.clearError(item_id);
    getHoldings.invalidate();

    console.log(`[plaid] Relink complete${item_id ? ` for item ${item_id}` : " (legacy token, no item_id)"}. Holdings cache invalidated.`);
    res.json({ ok: true, item_id: item_id || null });
});

// ── Test: fire a sample notification email ────────────────────────────────────
// Gated by PLAID_RELINK_SECRET. Visit in a browser to verify email delivery
// after deploy — especially useful after server changes to the notify module.
// GET /api/plaid/notify-test?secret=<PLAID_RELINK_SECRET>
router.get("/plaid/notify-test", async (req, res) => {
    const secret = process.env.PLAID_RELINK_SECRET;
    if (!secret || req.query.secret !== secret) return res.status(401).send("Unauthorized");

    const to = process.env.NOTIFY_TO;
    if (!to) return res.status(503).send("NOTIFY_TO not set in server/.env — no recipient configured.");

    try {
        await sendPlaidRelinkEmail({
            institution: "Test Institution",
            itemId: "test-item-id",
            errorCode: "TEST_NOTIFICATION",
        });
        res.send(`✅ Test email sent to ${to}. Check your inbox (and spam folder).`);
    } catch (err) {
        console.error("[notify] test email failed:", err.message);
        res.status(500).send(`❌ Email failed: ${err.message}`);
    }
});

module.exports = router;
