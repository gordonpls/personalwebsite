// Shared return math for the investments dashboard. Everything follows the
// Performance chart's method so widgets never disagree: from a window's start,
// each holding's price return is weighted by its *current* weight
// (buy-and-hold, no rebalancing). Holdings without a price at the window
// start are dropped and the rest renormalized.

export interface WeightedHolding { ticker: string | null; weightPct: number }
export type PriceMap = Record<string, Record<string, number>>; // ticker → { "YYYY-MM-DD": close }

export type Range = "1W" | "1M" | "3M" | "YTD" | "1Y" | "All";

export function parseLocalDate(s: string): Date {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, (m ?? 1) - 1, d ?? 1);
}

// Local-date → "YYYY-MM-DD". (toISOString would shift a local midnight to the
// previous UTC day for visitors east of UTC, moving every range cutoff a day early.)
export function toLocalDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Anchor the cutoff to the most recent data point we have (not "today"), so a
// stale bake on a weekend doesn't leave shorter ranges with an empty window.
export function cutoffFor(range: Range, latest: Date): string {
    const d = new Date(latest);
    if (range === "YTD") return `${d.getFullYear()}-01-01`;
    if (range === "1Y") d.setFullYear(d.getFullYear() - 1);
    else if (range === "3M") d.setMonth(d.getMonth() - 3);
    else if (range === "1M") d.setMonth(d.getMonth() - 1);
    else if (range === "1W") d.setDate(d.getDate() - 7);
    return toLocalDateStr(d);
}

export function latestDate(holdings: WeightedHolding[], prices: PriceMap): string {
    let latest = "";
    for (const h of holdings) {
        const map = h.ticker ? prices[h.ticker] : undefined;
        if (map) for (const d in map) if (d > latest) latest = d;
    }
    return latest;
}

export interface WindowSeries { ticker: string; w: number; aligned: (number | null)[]; base: number }
export interface PriceWindow { axis: string[]; series: WindowSeries[]; repW: number; totalW: number }

// Closes for every holding on a shared date axis within [from, to],
// forward-filled, keeping only holdings priced at the first axis date.
export function priceWindow(holdings: WeightedHolding[], prices: PriceMap, from: string, to = "9999-12-31"): PriceWindow {
    const totalW = holdings.reduce((s, h) => s + h.weightPct, 0) || 1;
    const items = holdings.filter((h) => h.ticker && prices[h.ticker]);
    const dateSet = new Set<string>();
    for (const h of items) for (const d in prices[h.ticker!]) if (d >= from && d <= to) dateSet.add(d);
    const axis = [...dateSet].sort();

    const series = items.map((h) => {
        const map = prices[h.ticker!];
        const tdates = Object.keys(map).sort();
        const aligned: (number | null)[] = [];
        let pi = 0, last: number | null = null;
        for (const d of axis) {
            while (pi < tdates.length && tdates[pi] <= d) { last = map[tdates[pi]]; pi++; }
            aligned.push(last);
        }
        return { ticker: h.ticker!, w: h.weightPct, aligned, base: aligned[0] as number };
    }).filter((s) => s.base != null && s.base > 0);

    return { axis, series, repW: series.reduce((s, x) => s + x.w, 0), totalW };
}

// Growth of $1 along the window's axis (1 = window start).
export function windowIndex(win: PriceWindow): number[] {
    return win.axis.map((_, i) => {
        let r = 0;
        for (const s of win.series) {
            const p = s.aligned[i];
            if (p != null) r += (s.w / win.repW) * (p / s.base - 1);
        }
        return 1 + r;
    });
}

// ── What drove returns ───────────────────────────────────────────────────────

export interface Contribution { ticker: string; pts: number; returnPct: number; weightPct: number }

// Each holding's contribution in percentage points over the range. They sum
// exactly to the Performance chart's return for the same range and scope.
export function contributions(holdings: WeightedHolding[], prices: PriceMap, range: Range): { total: number; items: Contribution[]; coveragePct: number } | null {
    const latest = latestDate(holdings, prices);
    if (!latest) return null;
    const win = priceWindow(holdings, prices, cutoffFor(range, parseLocalDate(latest)));
    if (win.axis.length < 2 || win.repW <= 0) return null;
    const last = win.axis.length - 1;
    const items = win.series.map((s) => {
        const ret = ((s.aligned[last] as number) / s.base - 1) * 100;
        const weightPct = (s.w / win.repW) * 100;
        return { ticker: s.ticker, pts: (weightPct / 100) * ret, returnPct: ret, weightPct };
    });
    return {
        total: items.reduce((s, x) => s + x.pts, 0),
        items,
        coveragePct: Math.round((win.repW / win.totalW) * 100),
    };
}

// ── Calendar years ───────────────────────────────────────────────────────────

export interface YearReturns {
    year: number;
    months: (number | null)[]; // 12 entries, % return; null = no data
    total: number | null;      // % return for the year (= chart YTD for the current year)
    benchmark: number | null;  // S&P 500 (SPY) for the same window
    axis: string[];            // the year's dates, for chaining
    index: number[];           // growth of $1 from the year's first date
}

function monthlyFromIndex(axis: string[], index: number[]): (number | null)[] {
    const months: (number | null)[] = Array(12).fill(null);
    let prev = 1; // the index starts at 1 on the year's first date
    for (let m = 0; m < 12; m++) {
        let end = -1;
        for (let i = 0; i < axis.length; i++) if (Number(axis[i].slice(5, 7)) === m + 1) end = i;
        if (end < 0) continue;
        months[m] = (index[end] / prev - 1) * 100;
        prev = index[end];
    }
    return months;
}

// One buy-and-hold window per calendar year. Months are slices of that year's
// index, so the twelve compound exactly to the year total.
export function calendarYears(holdings: WeightedHolding[], prices: PriceMap, benchmarkTicker = "SPY"): YearReturns[] {
    const latest = latestDate(holdings, prices);
    if (!latest) return [];
    let first = latest;
    for (const h of holdings) {
        const map = h.ticker ? prices[h.ticker] : undefined;
        if (map) for (const d in map) if (d < first) first = d;
    }
    const out: YearReturns[] = [];
    for (let y = Number(first.slice(0, 4)); y <= Number(latest.slice(0, 4)); y++) {
        const win = priceWindow(holdings, prices, `${y}-01-01`, `${y}-12-31`);
        if (win.axis.length < 2 || win.repW <= 0) continue;
        const index = windowIndex(win);
        const bench = priceWindow([{ ticker: benchmarkTicker, weightPct: 100 }], prices, `${y}-01-01`, `${y}-12-31`);
        const bIndex = bench.series.length ? windowIndex(bench) : null;
        out.push({
            year: y,
            months: monthlyFromIndex(win.axis, index),
            total: (index[index.length - 1] - 1) * 100,
            benchmark: bIndex ? (bIndex[bIndex.length - 1] - 1) * 100 : null,
            axis: win.axis,
            index,
        });
    }
    return out;
}

// ── Drawdown ─────────────────────────────────────────────────────────────────

export interface DrawdownPoint { date: string; value: number } // % below the running peak (≤ 0)

// Chain the calendar-year indices into one history, then measure the distance
// from the running peak at every point.
export function drawdownFromYears(years: YearReturns[]): DrawdownPoint[] {
    const out: DrawdownPoint[] = [];
    let level = 1, peak = 1;
    for (const y of years) {
        for (let i = 0; i < y.axis.length; i++) {
            const v = level * y.index[i];
            peak = Math.max(peak, v);
            out.push({ date: y.axis[i], value: (v / peak - 1) * 100 });
        }
        level *= y.index[y.index.length - 1];
    }
    return out;
}

// ── 1Y return vs risk (holdings map) ─────────────────────────────────────────

// Last close of each calendar week, so volatility is measured the same way for
// every ticker even though the bake is weekly in older years and daily lately.
function weeklyCloses(series: Record<string, number>, from: string): number[] {
    const byWeek = new Map<string, number>();
    for (const d of Object.keys(series).sort()) {
        if (d < from) continue;
        const dt = parseLocalDate(d);
        const monday = new Date(dt); monday.setDate(dt.getDate() - ((dt.getDay() + 6) % 7));
        byWeek.set(toLocalDateStr(monday), series[d]);
    }
    return [...byWeek.values()];
}

// Price return over the past year plus annualized volatility of weekly returns.
// Both null unless the series reaches back a full year; `year` is the closes
// from the cutoff on, for charting.
export function yearStats(series: Record<string, number> | undefined, cutoff1y: string) {
    if (!series) return { ret1y: null, vol: null, year: [] as number[] };
    const dates = Object.keys(series).sort();
    // Needs history reaching back a full year (a few days' grace for holidays).
    const covers = Date.parse(dates[0]) - Date.parse(cutoff1y) <= 4 * 864e5;
    const year = dates.filter((d) => d >= cutoff1y).map((d) => series[d]);
    if (!covers || year.length < 2) return { ret1y: null, vol: null, year };
    const weeks = weeklyCloses(series, cutoff1y);
    const rets = weeks.slice(1).map((p, i) => Math.log(p / weeks[i]));
    const mean = rets.reduce((s, r) => s + r, 0) / rets.length;
    const sd = Math.sqrt(rets.reduce((s, r) => s + (r - mean) ** 2, 0) / Math.max(1, rets.length - 1));
    return { ret1y: (year[year.length - 1] / year[0] - 1) * 100, vol: sd * Math.sqrt(52) * 100, year };
}
