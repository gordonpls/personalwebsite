import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Read API key from .env (VITE_ALPHAVANTAGE_KEY) or environment
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

// Powers the short ranges (1W/1M/3M/YTD) of the portfolio performance chart.
// "All" uses the monthly cache (tickerCache.json) instead.
const TICKERS = ["VT", "VXUS", "BND", "BNDX"];
// Free tier caps TIME_SERIES_DAILY at outputsize=compact (~100 trading days).
// That covers 1W/1M/3M and YTD while we're within ~100 trading days of Jan 1
// (roughly through spring); "All" uses the monthly cache instead.
const KEEP_DAYS = 120;
const CACHE_PATH = resolve(__dirname, "../src/data/tickerDailyCache.json");

async function fetchTicker(ticker) {
    // TIME_SERIES_DAILY (compact) is the free, unadjusted endpoint; full/adjusted are premium.
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${ticker}&outputsize=compact&apikey=${API_KEY}`;
    const res = await fetch(url);
    const json = await res.json();
    const raw = json["Time Series (Daily)"];
    if (!raw) throw new Error(`No daily data for ${ticker}: ${JSON.stringify(json).slice(0, 200)}`);
    return Object.fromEntries(
        Object.entries(raw).map(([date, values]) => [date, parseFloat(values["4. close"])])
    );
}

async function main() {
    const results = {};
    for (let i = 0; i < TICKERS.length; i++) {
        console.log(`Fetching ${TICKERS[i]} (daily)...`);
        results[TICKERS[i]] = await fetchTicker(TICKERS[i]);
        if (i < TICKERS.length - 1) {
            console.log("Waiting 13s (rate limit)...");
            await new Promise((r) => setTimeout(r, 13000));
        }
    }

    const allDates = [...new Set(Object.values(results).flatMap((r) => Object.keys(r)))].sort();
    const kept = allDates.slice(-KEEP_DAYS);
    const series = kept.map((date) => ({
        date,
        VT: results.VT[date] ?? null,
        VXUS: results.VXUS[date] ?? null,
        BND: results.BND[date] ?? null,
        BNDX: results.BNDX[date] ?? null,
    }));

    const cache = { fetchedAt: new Date().toISOString(), series };
    mkdirSync(dirname(CACHE_PATH), { recursive: true });
    writeFileSync(CACHE_PATH, JSON.stringify(cache));
    console.log(`Done. ${series.length} daily entries. Range: ${kept[0]} .. ${kept[kept.length - 1]}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
