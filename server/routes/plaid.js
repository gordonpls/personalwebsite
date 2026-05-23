const express = require("express");
const { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } = require("plaid");

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

// One Plaid item (access token) per institution. Vanguard falls back to the
// legacy PLAID_ACCESS_TOKEN var so existing deploys keep working.
function getTokens() {
    return [
        { institution: "Vanguard", token: process.env.PLAID_TOKEN_VANGUARD || process.env.PLAID_ACCESS_TOKEN },
        { institution: "Robinhood", token: process.env.PLAID_TOKEN_ROBINHOOD },
    ].filter((t) => t.token);
}

// Cached fetcher with two free-tier safeguards:
//  1. in-flight dedup — concurrent requests on a cold cache share ONE upstream
//     fetch instead of each firing their own (prevents a traffic stampede from
//     multiplying Plaid/Finnhub calls).
//  2. serve-stale-on-error — a failed/rate-limited refresh returns the last good
//     data rather than erroring (which would invite immediate client retries).
// Together with the TTLs, this bounds upstream calls to ~one batch per TTL.
function cached(ttlMs) {
    const s = { at: 0, data: null, inFlight: null };
    return (fetcher) => {
        if (s.data && Date.now() - s.at < ttlMs) return Promise.resolve(s.data);
        if (s.inFlight) return s.inFlight;
        s.inFlight = Promise.resolve()
            .then(fetcher)
            .then((data) => { s.at = Date.now(); s.data = data; return data; })
            .catch((err) => { if (s.data) return s.data; throw err; })
            .finally(() => { s.inFlight = null; });
        return s.inFlight;
    };
}
const getHoldings = cached(6 * 60 * 60 * 1000); // 6h — Plaid is billed per call
const getQuotes = cached(2 * 60 * 1000);        // 2 min — Finnhub free is 60/min

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

// Map institution + account subtype to a display portfolio bucket.
// Vanguard is the diversified "Core"; Robinhood splits by account type.
function portfolioOf(institution, subtype) {
    if (institution !== "Robinhood") return "Core";
    return /ira|roth|401|403|457|pension|retire|sep|simple|keogh|tsp/.test(subtype || "")
        ? "Retirement"
        : "Tech & Speculation";
}

// ── One-time setup: create a Link token so you can connect your brokerage ──
// Call this once from your browser dev tools or Postman, then open the
// returned link_token in Plaid Link to authorize your accounts.
router.post("/link/token/create", async (_req, res) => {
    if (process.env.PLAID_SETUP_ENABLED !== "true") return res.status(404).end();
    try {
        const response = await plaidClient.linkTokenCreate({
            user: { client_user_id: "owner" },
            client_name: "Gordon Zhong Portfolio",
            products: [Products.Investments],
            country_codes: [CountryCode.Us],
            language: "en",
        });
        res.json({ link_token: response.data.link_token });
    } catch (err) {
        console.error("[link/token/create]", err.response?.data ?? err.message);
        res.status(500).json({ error: "Failed to create link token" });
    }
});

// ── One-time setup: exchange the public token Plaid Link gives you ──
// After completing Link, POST the public_token here to get your access token.
// Copy the returned access_token into PLAID_ACCESS_TOKEN in your env vars.
router.post("/link/token/exchange", async (req, res) => {
    if (process.env.PLAID_SETUP_ENABLED !== "true") return res.status(404).end();
    const { public_token } = req.body;
    if (!public_token) return res.status(400).json({ error: "public_token required" });
    try {
        const response = await plaidClient.itemPublicTokenExchange({ public_token });
        const { access_token, item_id } = response.data;
        // Log once so you can copy it — then store in env, never log again
        console.log("[SETUP] access_token:", access_token);
        console.log("[SETUP] item_id:", item_id);
        res.json({ access_token, item_id });
    } catch (err) {
        console.error("[link/token/exchange]", err.response?.data ?? err.message);
        res.status(500).json({ error: "Failed to exchange token" });
    }
});

// Build the privacy-safe holdings payload from Plaid (no $ amounts/account names).
async function fetchHoldingsPayload() {
    const agg = new Map(); // "Portfolio|TICKER" -> { ..., value }
    let total = 0, costSum = 0, costValueSum = 0;

    for (const { institution, token } of getTokens()) {
        const resp = await plaidClient.investmentsHoldingsGet({ access_token: token });
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
            if (h.cost_basis != null && h.cost_basis > 0) { costSum += h.cost_basis; costValueSum += value; }
            const portfolio = portfolioOf(institution, acctSubtype[h.account_id]);
            const ticker = sec.ticker_symbol ?? sec.name ?? "Unknown";
            const key = `${portfolio}|${ticker}`;
            const cur = agg.get(key) ?? {
                portfolio,
                ticker: sec.ticker_symbol ?? null,
                name: NAME_OVERRIDES[tkr] ?? sec.name ?? ticker,
                type: sec.type ?? null,
                value: 0,
            };
            cur.value += value;
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

module.exports = router;
