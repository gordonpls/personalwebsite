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

// Cache holdings in-process so a public page doesn't hit Plaid (billed) per visit.
const HOLDINGS_TTL_MS = 6 * 60 * 60 * 1000; // 6h
let holdingsCache = { at: 0, data: null };

// Live quotes refresh far more often than holdings.
const QUOTES_TTL_MS = 2 * 60 * 1000; // 2 min
let quotesCache = { at: 0, data: null };

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

// ── Public, privacy-safe holdings: ticker + relative weight only ──
// Aggregates every institution's holdings by (institution, ticker) and returns
// each as a % of the total portfolio. Deliberately exposes NO dollar amounts,
// account names, balances, or quantities — safe to serve on a public page.
router.get("/holdings", async (_req, res) => {
    const tokens = getTokens();
    if (!tokens.length) return res.status(503).json({ error: "No access tokens configured" });

    if (holdingsCache.data && Date.now() - holdingsCache.at < HOLDINGS_TTL_MS) {
        return res.json(holdingsCache.data);
    }

    try {
        const agg = new Map(); // "Institution|TICKER" -> { ..., value }
        let total = 0;

        for (const { institution, token } of tokens) {
            const resp = await plaidClient.investmentsHoldingsGet({ access_token: token });
            const { holdings, securities } = resp.data;
            const secMap = Object.fromEntries(securities.map((s) => [s.security_id, s]));

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
                const ticker = sec.ticker_symbol ?? sec.name ?? "Unknown";
                const key = `${institution}|${ticker}`;
                const cur = agg.get(key) ?? {
                    institution,
                    ticker: sec.ticker_symbol ?? null,
                    name: sec.name ?? ticker,
                    type: sec.type ?? null,
                    value: 0,
                };
                cur.value += value;
                agg.set(key, cur);
            }
        }

        // Strip raw values; emit only rounded weights.
        const holdings = [...agg.values()]
            .map((h) => ({
                institution: h.institution,
                ticker: h.ticker,
                name: h.name,
                type: h.type,
                weightPct: total > 0 ? Math.round((h.value / total) * 1000) / 10 : 0,
            }))
            .filter((h) => h.weightPct >= 0.1) // keep the table neat
            .sort((a, b) => b.weightPct - a.weightPct);

        const payload = { asOf: new Date().toISOString(), holdings };
        holdingsCache = { at: Date.now(), data: payload };
        res.json(payload);
    } catch (err) {
        console.error("[holdings]", err.response?.data ?? err.message);
        res.status(500).json({ error: "Failed to fetch holdings" });
    }
});

// ── Public: live daily % change per holding ticker (Finnhub), for the heatmap ──
// Returns only ticker -> daily percent change (public market data; no dollars).
router.get("/quotes", async (_req, res) => {
    const key = process.env.FINNHUB_API_KEY;
    if (!key) return res.status(503).json({ error: "No quote provider configured" });

    if (quotesCache.data && Date.now() - quotesCache.at < QUOTES_TTL_MS) {
        return res.json(quotesCache.data);
    }

    try {
        // Determine which tickers to quote from holdings (reuse the holdings cache when warm).
        let tickers = [];
        if (holdingsCache.data) {
            tickers = [...new Set(holdingsCache.data.holdings.map((h) => h.ticker).filter(Boolean))];
        } else {
            const set = new Set();
            for (const { token } of getTokens()) {
                const r = await plaidClient.investmentsHoldingsGet({ access_token: token });
                const secMap = Object.fromEntries(r.data.securities.map((s) => [s.security_id, s]));
                for (const h of r.data.holdings) {
                    const t = secMap[h.security_id]?.ticker_symbol;
                    if (t) set.add(t);
                }
            }
            tickers = [...set];
        }

        const quotes = {};
        await Promise.all(tickers.map(async (t) => {
            try {
                const r = await fetch(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(t)}&token=${key}`);
                const q = await r.json();
                // dp = daily percent change; c = current price (0 for symbols Finnhub can't quote)
                if (q && typeof q.dp === "number" && q.c) quotes[t] = Math.round(q.dp * 100) / 100;
            } catch { /* skip unquotable ticker */ }
        }));

        const payload = { asOf: new Date().toISOString(), quotes };
        quotesCache = { at: Date.now(), data: payload };
        res.json(payload);
    } catch (err) {
        console.error("[quotes]", err.response?.data ?? err.message);
        res.status(500).json({ error: "Failed to fetch quotes" });
    }
});

module.exports = router;
