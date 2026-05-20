const API_KEY = import.meta.env.VITE_ALPHAVANTAGE_KEY as string | undefined;
const CACHE_KEY = "av_ticker_cache_v2";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const SERVER_CACHE_URL = "/api/tickers.json";
const SERVER_CACHE_MAX_AGE_MS = 25 * 60 * 60 * 1000;

const TICKERS = ["VT", "VXUS", "BND", "BNDX"] as const;
type TickerKey = (typeof TICKERS)[number];

export interface SeriesEntry {
    date: string; // "YYYY-MM"
    VT: number | null;
    VXUS: number | null;
    BND: number | null;
    BNDX: number | null;
}

interface StoredCache {
    fetchedAt: number;
    series: SeriesEntry[];
}

export interface TickerResult {
    series: SeriesEntry[];
    isLive: boolean;
    lastDate: string | null;
}

interface ServerCache {
    fetchedAt: number;
    tickers: Record<TickerKey, Record<string, number>>;
}

function buildEntries(tickers: Record<TickerKey, Record<string, number>>): SeriesEntry[] {
    const allDates = [...new Set(TICKERS.flatMap((t) => Object.keys(tickers[t] ?? {})))].sort();
    return allDates.map((date) => ({
        date,
        VT: tickers.VT?.[date] ?? null,
        VXUS: tickers.VXUS?.[date] ?? null,
        BND: tickers.BND?.[date] ?? null,
        BNDX: tickers.BNDX?.[date] ?? null,
    }));
}

async function fetchServerCache(): Promise<StoredCache | null> {
    try {
        const res = await fetch(SERVER_CACHE_URL);
        if (!res.ok) return null;
        const json: ServerCache = await res.json();
        if (!json.fetchedAt || !json.tickers) return null;
        if (Date.now() - json.fetchedAt > SERVER_CACHE_MAX_AGE_MS) return null;
        return { fetchedAt: json.fetchedAt, series: buildEntries(json.tickers) };
    } catch {
        return null;
    }
}

async function fetchMonthlyPrices(ticker: TickerKey): Promise<Record<string, number>> {
    const url = new URL("https://www.alphavantage.co/query");
    url.searchParams.set("function", "TIME_SERIES_MONTHLY_ADJUSTED");
    url.searchParams.set("symbol", ticker);
    url.searchParams.set("apikey", API_KEY ?? "demo");

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${ticker}`);

    const json = await res.json();
    const raw: Record<string, { "5. adjusted close": string }> = json["Monthly Adjusted Time Series"];
    if (!raw) throw new Error(`No data for ${ticker}: ${JSON.stringify(json).slice(0, 200)}`);

    // Normalize date to "YYYY-MM" to ensure alignment across tickers
    return Object.fromEntries(
        Object.entries(raw).map(([date, values]) => {
            const price = parseFloat(values["5. adjusted close"]);
            const monthKey = date.slice(0, 7);
            return [monthKey, price];
        })
    );
}

function readLocalCache(): StoredCache | null {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const parsed: StoredCache = JSON.parse(raw);
        if (!parsed.fetchedAt || !Array.isArray(parsed.series)) return null;
        return parsed;
    } catch {
        return null;
    }
}

function writeLocalCache(cache: StoredCache): void {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch { }
}

function lastDate(series: SeriesEntry[]): string | null {
    if (!series.length) return null;
    return [...series].sort((a, b) => b.date.localeCompare(a.date))[0].date;
}

function toResult(series: SeriesEntry[], isLive: boolean): TickerResult {
    return { series, isLive, lastDate: lastDate(series) };
}

export async function getTickerSeries(): Promise<TickerResult> {
    const cached = readLocalCache();

    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
        return toResult(cached.series, true);
    }

    const serverCache = await fetchServerCache();
    if (serverCache) {
        writeLocalCache(serverCache);
        return toResult(serverCache.series, true);
    }

    if (!API_KEY) {
        return toResult(cached?.series ?? [], false);
    }

    try {
        const results: Partial<Record<TickerKey, Record<string, number>>> = {};
        for (const ticker of TICKERS) {
            results[ticker] = await fetchMonthlyPrices(ticker);
            if (ticker !== TICKERS[TICKERS.length - 1]) {
                await new Promise((r) => setTimeout(r, 1000));
            }
        }

        const allDates = [
            ...new Set(Object.values(results).flatMap((r) => Object.keys(r ?? {}))),
        ].sort();

        const series: SeriesEntry[] = allDates.map((date) => ({
            date,
            VT: results.VT?.[date] ?? null,
            VXUS: results.VXUS?.[date] ?? null,
            BND: results.BND?.[date] ?? null,
            BNDX: results.BNDX?.[date] ?? null,
        }));

        writeLocalCache({ fetchedAt: Date.now(), series });
        return toResult(series, true);
    } catch {
        if (cached?.series?.length) {
            return toResult(cached.series, false);
        }
        return toResult([], false);
    }
}