import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Build-time only. Reads TWELVE_DATA_KEY from .env; never used at runtime.
let API_KEY = process.env.TWELVE_DATA_KEY ?? "";
if (!API_KEY) {
    try {
        const env = readFileSync(resolve(__dirname, "../.env"), "utf-8");
        const m = env.match(/TWELVE_DATA_KEY=(.+)/);
        if (m) API_KEY = m[1].trim();
    } catch { }
}
if (!API_KEY) {
    console.error("No TWELVE_DATA_KEY in .env or environment");
    process.exit(1);
}

const HOLDINGS_URL = process.env.HOLDINGS_URL || "http://localhost:3000/api/holdings";
const CACHE_PATH = resolve(__dirname, "../public/holdingsHistory.json");
const OUTPUTSIZE = 300; // ~1.2y of trading days — covers up to the 1Y range

// SAFEGUARD: Twelve Data free tier is 8 API credits/min, 800/day. Each symbol in
// a /time_series call costs 1 credit, so we send <=8 symbols per request and wait
// a minute between requests. ~50 tickers => ~7 requests => ~6 min, ~50 credits/day.
const BATCH = 8;
const WAIT_MS = 62_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getTickers() {
    const res = await fetch(HOLDINGS_URL);
    if (!res.ok) throw new Error(`holdings ${res.status} — is the backend running? (npm run dev:all)`);
    const d = await res.json();
    return [...new Set((d.holdings || []).map((h) => h.ticker).filter(Boolean))];
}

async function fetchBatch(symbols) {
    const url = new URL("https://api.twelvedata.com/time_series");
    url.searchParams.set("symbol", symbols.join(","));
    url.searchParams.set("interval", "1day");
    url.searchParams.set("outputsize", String(OUTPUTSIZE));
    url.searchParams.set("apikey", API_KEY);
    const json = await (await fetch(url)).json();
    const out = {};
    // A single-symbol response isn't keyed by symbol; multi-symbol is.
    if (symbols.length === 1) {
        if (json.values) out[symbols[0]] = json.values;
    } else {
        for (const s of symbols) if (json[s]?.values) out[s] = json[s].values;
    }
    return out;
}

async function main() {
    const tickers = await getTickers();
    console.log(`Fetching daily history for ${tickers.length} tickers (<=${BATCH}/min)...`);
    const prices = {};
    const missing = [];
    for (let i = 0; i < tickers.length; i += BATCH) {
        const chunk = tickers.slice(i, i + BATCH);
        console.log(`  [${i + 1}-${i + chunk.length}/${tickers.length}] ${chunk.join(", ")}`);
        let res = {};
        try { res = await fetchBatch(chunk); } catch (e) { console.warn("   batch error:", e.message); }
        for (const t of chunk) {
            const vals = res[t];
            if (!vals) { missing.push(t); continue; }
            prices[t] = Object.fromEntries(vals.map((v) => [v.datetime, parseFloat(v.close)]));
        }
        if (i + BATCH < tickers.length) {
            console.log(`   waiting ${WAIT_MS / 1000}s (rate limit)...`);
            await sleep(WAIT_MS);
        }
    }
    const cache = { fetchedAt: new Date().toISOString(), prices };
    mkdirSync(dirname(CACHE_PATH), { recursive: true });
    writeFileSync(CACHE_PATH, JSON.stringify(cache));
    console.log(`Done. ${Object.keys(prices).length} tickers cached, ${missing.length} missing${missing.length ? ": " + missing.join(", ") : ""}.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
