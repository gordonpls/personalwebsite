import fs from "fs";
import path from "path";
import axios from "axios";
import cron from "node-cron";

const API_KEY = import.meta.env.VITE_ALPHAVANTAGE_KEY ?? process.env.ALPHAVANTAGE_KEY ?? "";
const CACHE_PATH = path.resolve("src/data/tickerCache.json");
const TICKERS = ["VT", "VXUS", "BND", "BNDX"] as const;

export type TickerKey = (typeof TICKERS)[number];

export interface CacheEntry {
    date: string;        // "YYYY-MM-DD"
    VT: number;
    VXUS: number;
    BND: number;
    BNDX: number;
}

export interface CacheFile {
    fetchedAt: string;   // ISO timestamp
    series: CacheEntry[];
}

async function fetchMonthlyReturns(ticker: TickerKey): Promise<Record<string, number>> {
    const url = "https://www.alphavantage.co/query";
    const { data } = await axios.get(url, {
        params: {
            function: "TIME_SERIES_MONTHLY_ADJUSTED",
            symbol: ticker,
            apikey: API_KEY,
        },
    });

    const raw: Record<string, { "5. adjusted close": string }> =
        data["Monthly Adjusted Time Series"];

    if (!raw) throw new Error(`No data returned for ${ticker}: ${JSON.stringify(data)}`);

    // Sort dates ascending — store raw adjusted close prices
    // Period returns are computed on demand in useTickerData as (price/basePrice - 1) * 100
    const dates = Object.keys(raw).sort();

    return Object.fromEntries(
        dates.map((date) => {
            const price = parseFloat(raw[date]["5. adjusted close"]);
            return [date, price];
        })
    );
}

export async function buildCache(): Promise<void> {
    console.log("[tickerCache] Fetching ticker data from Alpha Vantage...");

    try {
        // Fetch all tickers — stagger slightly to respect rate limits (5 req/min free tier)
        const results: Record<TickerKey, Record<string, number>> = {} as never;
        for (const ticker of TICKERS) {
            results[ticker] = await fetchMonthlyReturns(ticker);
            await new Promise((r) => setTimeout(r, 13_000)); // 13s gap → safe under 5/min
        }

        // Build unified date-keyed series across all tickers
        const allDates = Array.from(
            new Set(Object.values(results).flatMap((r) => Object.keys(r)))
        ).sort();

        const series: CacheEntry[] = allDates.map((date) => ({
            date,
            VT: results.VT[date] ?? 0,
            VXUS: results.VXUS[date] ?? 0,
            BND: results.BND[date] ?? 0,
            BNDX: results.BNDX[date] ?? 0,
        }));

        const cache: CacheFile = { fetchedAt: new Date().toISOString(), series };
        fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
        fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
        console.log(`[tickerCache] Cache written with ${series.length} data points.`);
    } catch (err) {
        console.error("[tickerCache] Fetch failed:", err);
    }
}

export function isCacheStale(): boolean {
    if (!fs.existsSync(CACHE_PATH)) return true;
    const cache: CacheFile = JSON.parse(fs.readFileSync(CACHE_PATH, "utf-8"));
    const fetched = new Date(cache.fetchedAt);
    const now = new Date();
    const hoursDiff = (now.getTime() - fetched.getTime()) / (1000 * 60 * 60);
    return hoursDiff > 23;
}

export function readCache(): CacheFile | null {
    if (!fs.existsSync(CACHE_PATH)) return null;
    return JSON.parse(fs.readFileSync(CACHE_PATH, "utf-8"));
}

// Schedule: run once at startup if stale, then daily at 6am
export function startCacheScheduler(): void {
    if (isCacheStale()) buildCache();
    cron.schedule("0 6 * * *", buildCache);
    console.log("[tickerCache] Scheduler running — daily refresh at 06:00.");
}