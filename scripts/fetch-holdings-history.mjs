import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Build-time only. Bakes two static files the finance UI reads at runtime (so
// there are zero per-visit API calls):
//   • public/holdingsHistory.json — dividend/split-adjusted daily closes
//     (total-return basis) from Yahoo Finance; powers the performance chart.
//   • public/holdingsMeta.json — per-holding metadata: name/type/exchange/52wk
//     from the same Yahoo response (free), plus logo/industry/market-cap/site
//     from Finnhub for stocks. Powers the holding detail panel.
const HOLDINGS_URL = process.env.HOLDINGS_URL || "http://localhost:3000/api/holdings";
const HISTORY_PATH = resolve(__dirname, "../public/holdingsHistory.json");
const META_PATH = resolve(__dirname, "../public/holdingsMeta.json");
const HISTORY_DAYS = 365 * 6 + 14;   // ~6 years — covers the "All" (since-inception) view
const RECENT_DAILY_DAYS = 400;       // keep daily granularity within ~13 months; thin older to weekly
const DELAY_MS = 250;                // light pacing for Yahoo (Finnhub is throttled separately)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Finnhub key (CI: env from secret; local: fall back to server/.env).
let FINNHUB_KEY = process.env.FINNHUB_API_KEY || "";
if (!FINNHUB_KEY) {
    try {
        const m = readFileSync(resolve(__dirname, "../server/.env"), "utf-8").match(/FINNHUB_API_KEY=(.+)/);
        if (m) FINNHUB_KEY = m[1].trim();
    } catch { /* none */ }
}

// Throttle every Finnhub call to ~1/sec so we stay well under the 60/min free limit.
let lastFinnhub = 0;
async function finnhubGet(pathWithQuery) {
    const wait = lastFinnhub + 1100 - Date.now();
    if (wait > 0) await sleep(wait);
    lastFinnhub = Date.now();
    const r = await fetch(`https://finnhub.io/api/v1${pathWithQuery}&token=${FINNHUB_KEY}`);
    if (!r.ok) throw new Error(`finnhub ${r.status}`);
    return r.json();
}

// Keep every day inside the recent window, but only ~one point per week before
// that — keeps the committed file small while the long "All" curve stays smooth.
function thin(series) {
    const recentCutoff = new Date(Date.now() - RECENT_DAILY_DAYS * 86400000).toISOString().slice(0, 10);
    const out = {};
    let lastOld = null;
    for (const d of Object.keys(series).sort()) {
        if (d >= recentCutoff) { out[d] = series[d]; continue; }
        if (lastOld === null || Date.parse(d) - Date.parse(lastOld) >= 6 * 86400000) { out[d] = series[d]; lastOld = d; }
    }
    return out;
}

async function getTickers() {
    const res = await fetch(HOLDINGS_URL);
    if (!res.ok) throw new Error(`holdings ${res.status} — is the backend running? (npm run dev:all)`);
    const d = await res.json();
    // SPY is always included as the S&P 500 benchmark for the performance chart,
    // even though it isn't a holding.
    return [...new Set([...(d.holdings || []).map((h) => h.ticker).filter(Boolean), "SPY"])];
}

// One Yahoo chart call yields both the price series AND the metadata block.
async function fetchYahoo(symbol) {
    const period2 = Math.floor(Date.now() / 1000);
    const period1 = period2 - HISTORY_DAYS * 86400;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${period1}&period2=${period2}&interval=1d`;
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const r = (await res.json())?.chart?.result?.[0];
    const ts = r?.timestamp;
    const adj = r?.indicators?.adjclose?.[0]?.adjclose;
    if (!ts || !adj) throw new Error("no adjclose in response");
    const series = {};
    for (let i = 0; i < ts.length; i++) {
        if (adj[i] == null) continue;
        series[new Date(ts[i] * 1000).toISOString().slice(0, 10)] = Math.round(adj[i] * 10000) / 10000;
    }
    if (!Object.keys(series).length) throw new Error("empty series");
    const m = r.meta || {};
    return {
        prices: thin(series),
        meta: {
            name: m.longName || m.shortName || null,
            type: m.instrumentType || null,           // EQUITY / ETF
            exchange: m.fullExchangeName || null,
            currency: m.currency || null,
            week52High: m.fiftyTwoWeekHigh ?? null,
            week52Low: m.fiftyTwoWeekLow ?? null,
            price: m.regularMarketPrice ?? null,
        },
    };
}

async function fetchWithRetry(symbol) {
    for (let attempt = 1; attempt <= 3; attempt++) {
        try { return await fetchYahoo(symbol); }
        catch (e) { if (attempt === 3) throw e; await sleep(1500 * attempt); }
    }
}

// Finnhub company profile (stocks only; ETFs return {}). Enriches the metadata.
async function finnhubProfile(symbol) {
    const p = await finnhubGet(`/stock/profile2?symbol=${encodeURIComponent(symbol)}`);
    const out = {};
    if (p.finnhubIndustry) out.industry = p.finnhubIndustry;
    if (p.logo) out.logo = p.logo;
    if (p.marketCapitalization) out.marketCap = Math.round(p.marketCapitalization); // USD millions
    if (p.weburl) out.website = p.weburl;
    if (p.country) out.country = p.country;
    if (p.ipo) out.ipo = p.ipo;
    return out;
}

// Valuation/return/quality metrics (works for stocks; ETFs give returns/volatility only).
async function finnhubMetric(symbol) {
    const d = (await finnhubGet(`/stock/metric?symbol=${encodeURIComponent(symbol)}&metric=all`)).metric || {};
    const s = {};
    const set = (k, v) => { if (v != null && isFinite(v)) s[k] = Math.round(v * 100) / 100; };
    set("pe", d.peTTM); set("pb", d.pbAnnual); set("beta", d.beta);
    set("divYield", d.dividendYieldIndicatedAnnual); set("eps", d.epsTTM);
    set("roe", d.roeTTM); set("profitMargin", d.netProfitMarginTTM); set("revGrowth", d.revenueGrowthTTMYoy);
    set("return13w", d["13WeekPriceReturnDaily"]); set("return26w", d["26WeekPriceReturnDaily"]);
    set("return52w", d["52WeekPriceReturnDaily"]); set("volatility", d["3MonthADReturnStd"]);
    return Object.keys(s).length ? s : undefined;
}

// Latest analyst recommendation breakdown (stocks).
async function finnhubRec(symbol) {
    const arr = await finnhubGet(`/stock/recommendation?symbol=${encodeURIComponent(symbol)}`);
    if (!Array.isArray(arr) || !arr.length) return undefined;
    const a = arr[0];
    const total = (a.strongBuy || 0) + (a.buy || 0) + (a.hold || 0) + (a.sell || 0) + (a.strongSell || 0);
    if (!total) return undefined;
    return { strongBuy: a.strongBuy || 0, buy: a.buy || 0, hold: a.hold || 0, sell: a.sell || 0, strongSell: a.strongSell || 0, period: a.period };
}

function readJson(path, key) {
    try { return JSON.parse(readFileSync(path, "utf-8"))[key] || {}; }
    catch { return {}; }
}

async function main() {
    const tickers = await getTickers();
    const oldPrices = readJson(HISTORY_PATH, "prices");
    const oldMeta = readJson(META_PATH, "meta");
    console.log(`Fetching history + metadata for ${tickers.length} tickers...`);
    const prices = {}, meta = {};
    const issues = [];
    let fetched = 0;
    for (const t of tickers) {
        try {
            const { prices: p, meta: m } = await fetchWithRetry(t);
            prices[t] = p;
            meta[t] = m;
            fetched++;
            if (FINNHUB_KEY) {
                try { const st = await finnhubMetric(t); if (st) meta[t].stats = st; } catch { /* skip */ }
                if (m.type === "EQUITY") {
                    try { Object.assign(meta[t], await finnhubProfile(t)); } catch { /* keep Yahoo-only meta */ }
                    try { const an = await finnhubRec(t); if (an) meta[t].analysts = an; } catch { /* skip */ }
                }
            }
        } catch (e) {
            // SAFEGUARD: keep last-good data for this ticker rather than dropping it.
            if (oldPrices[t]) prices[t] = oldPrices[t];
            if (oldMeta[t]) meta[t] = oldMeta[t];
            issues.push(`${t} (${oldPrices[t] ? "kept previous" : "no data"}: ${e.message})`);
        }
        await sleep(DELAY_MS);
    }

    // SAFEGUARD: never overwrite good caches with a wholesale failure.
    if (fetched === 0 && Object.keys(oldPrices).length) {
        console.error("All fetches failed; leaving existing caches untouched.");
        process.exit(1);
    }

    mkdirSync(dirname(HISTORY_PATH), { recursive: true });
    writeFileSync(HISTORY_PATH, JSON.stringify({ fetchedAt: new Date().toISOString(), prices }));
    writeFileSync(META_PATH, JSON.stringify({ fetchedAt: new Date().toISOString(), meta }));
    console.log(`Done. ${fetched}/${tickers.length} fetched fresh${issues.length ? "; issues: " + issues.join(", ") : ""}.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
