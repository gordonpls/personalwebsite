import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Read API key from .env
let API_KEY = process.env.ALPHAVANTAGE_KEY ?? "";
if (!API_KEY) {
    try {
        const env = readFileSync(resolve(__dirname, "../.env"), "utf-8");
        const match = env.match(/VITE_ALPHAVANTAGE_KEY=(.+)/);
        if (match) API_KEY = match[1].trim();
    } catch { }
}

if (!API_KEY) {
    console.error("No ALPHAVANTAGE_KEY found in .env or environment");
    process.exit(1);
}

const TICKERS = ["VT", "VXUS", "BND", "BNDX"];
const CACHE_PATH = resolve(__dirname, "../src/data/tickerCache.json");

async function fetchTicker(ticker) {
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_MONTHLY_ADJUSTED&symbol=${ticker}&apikey=${API_KEY}`;
    const res = await fetch(url);
    const json = await res.json();
    const raw = json["Monthly Adjusted Time Series"];
    if (!raw) throw new Error(`No data for ${ticker}: ${JSON.stringify(json).slice(0, 200)}`);
    return Object.fromEntries(
        Object.entries(raw).map(([date, values]) => [date.slice(0, 7), parseFloat(values["5. adjusted close"])])
    );
}

async function main() {
    const results = {};
    for (let i = 0; i < TICKERS.length; i++) {
        const ticker = TICKERS[i];
        console.log(`Fetching ${ticker}...`);
        results[ticker] = await fetchTicker(ticker);
        if (i < TICKERS.length - 1) {
            console.log("Waiting 13s (rate limit)...");
            await new Promise((r) => setTimeout(r, 13000));
        }
    }

    const allDates = [...new Set(Object.values(results).flatMap((r) => Object.keys(r)))].sort();
    const series = allDates.map((date) => ({
        date,
        VT: results.VT[date] ?? null,
        VXUS: results.VXUS[date] ?? null,
        BND: results.BND[date] ?? null,
        BNDX: results.BNDX[date] ?? null,
    }));

    const cache = { fetchedAt: new Date().toISOString(), series };
    mkdirSync(dirname(CACHE_PATH), { recursive: true });
    writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
    console.log(`Done. ${series.length} entries written. Last date: ${allDates[allDates.length - 1]}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
