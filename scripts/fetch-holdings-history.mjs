import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Build-time only. Bakes dividend- & split-adjusted daily closes (total-return
// basis) into public/holdingsHistory.json, which the performance chart reads.
// Source: Yahoo Finance chart API — free, no key, and its `adjclose` reflects
// reinvested distributions, so the 1Y figure matches brokerage returns far more
// closely than raw closing prices (which omit dividends).
const HOLDINGS_URL = process.env.HOLDINGS_URL || "http://localhost:3000/api/holdings";
const CACHE_PATH = resolve(__dirname, "../public/holdingsHistory.json");
const DAYS = 400; // ~13 months of calendar days — covers the chart's 1Y range with buffer
const DELAY_MS = 350; // be polite to Yahoo between symbols
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getTickers() {
    const res = await fetch(HOLDINGS_URL);
    if (!res.ok) throw new Error(`holdings ${res.status} — is the backend running? (npm run dev:all)`);
    const d = await res.json();
    return [...new Set((d.holdings || []).map((h) => h.ticker).filter(Boolean))];
}

async function fetchAdjusted(symbol) {
    const period2 = Math.floor(Date.now() / 1000);
    const period1 = period2 - DAYS * 86400;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${period1}&period2=${period2}&interval=1d`;
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const r = json?.chart?.result?.[0];
    const ts = r?.timestamp;
    const adj = r?.indicators?.adjclose?.[0]?.adjclose;
    if (!ts || !adj) throw new Error("no adjclose in response");
    const out = {};
    for (let i = 0; i < ts.length; i++) {
        if (adj[i] == null) continue;
        const date = new Date(ts[i] * 1000).toISOString().slice(0, 10);
        out[date] = Math.round(adj[i] * 10000) / 10000;
    }
    if (!Object.keys(out).length) throw new Error("empty series");
    return out;
}

async function fetchWithRetry(symbol) {
    for (let attempt = 1; attempt <= 3; attempt++) {
        try { return await fetchAdjusted(symbol); }
        catch (e) { if (attempt === 3) throw e; await sleep(1500 * attempt); }
    }
}

function readExisting() {
    try { return JSON.parse(readFileSync(CACHE_PATH, "utf-8")).prices || {}; }
    catch { return {}; }
}

async function main() {
    const tickers = await getTickers();
    const old = readExisting();
    console.log(`Fetching dividend-adjusted history for ${tickers.length} tickers from Yahoo...`);
    const prices = {};
    const issues = [];
    let fetched = 0;
    for (const t of tickers) {
        try {
            prices[t] = await fetchWithRetry(t);
            fetched++;
        } catch (e) {
            // SAFEGUARD: keep the last good series for this ticker rather than dropping it.
            if (old[t]) { prices[t] = old[t]; issues.push(`${t} (kept previous: ${e.message})`); }
            else issues.push(`${t} (no data: ${e.message})`);
        }
        await sleep(DELAY_MS);
    }

    // SAFEGUARD: never overwrite a good cache with a wholesale failure (e.g. Yahoo
    // rate-limiting the CI runner) — bail and leave the committed file untouched.
    if (fetched === 0 && Object.keys(old).length) {
        console.error("All fetches failed; leaving existing cache untouched.");
        process.exit(1);
    }

    const cache = { fetchedAt: new Date().toISOString(), prices };
    mkdirSync(dirname(CACHE_PATH), { recursive: true });
    writeFileSync(CACHE_PATH, JSON.stringify(cache));
    console.log(`Done. ${fetched}/${tickers.length} fetched fresh${issues.length ? "; issues: " + issues.join(", ") : ""}.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
