import { useEffect, useMemo, useState } from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

interface Holding {
    portfolio: string;
    ticker: string | null;
    name: string;
    type: string | null;
    weightPct: number;
    returnPct: number | null; // cost-basis return since purchase
}
type PriceMap = Record<string, Record<string, number>>; // ticker -> { "YYYY-MM-DD": close }

type Range = "1W" | "1M" | "3M" | "YTD" | "1Y" | "All";
const RANGES: Range[] = ["1W", "1M", "3M", "YTD", "1Y", "All"];
const RANGE_LABEL: Record<Range, string> = {
    "1W": "past week",
    "1M": "past month",
    "3M": "past 3 months",
    YTD: "year to date",
    "1Y": "past year",
    All: "all time",
};

function parseLocalDate(s: string): Date {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function cutoffFor(range: Range): string {
    const d = new Date();
    if (range === "YTD") return `${d.getFullYear()}-01-01`;
    if (range === "1Y") d.setFullYear(d.getFullYear() - 1);
    else if (range === "3M") d.setMonth(d.getMonth() - 3);
    else if (range === "1M") d.setMonth(d.getMonth() - 1);
    else if (range === "1W") d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
}

interface ChartPoint { date: string; value: number; }

// Blend each holding's real % return (rebased to the range start) by its weight.
// Tickers without price history, or without a price at the range start, are
// dropped and the remaining weights renormalized; coveragePct reports how much
// of the portfolio (by weight) the curve represents.
function buildSeries(range: Range, holdings: Holding[], prices: PriceMap): { data: ChartPoint[]; coveragePct: number; asOfLast: string | null } {
    const cutoff = cutoffFor(range);
    const totalW = holdings.reduce((s, h) => s + h.weightPct, 0) || 1;
    const items = holdings.filter((h) => h.ticker && prices[h.ticker as string]);

    const dateSet = new Set<string>();
    for (const h of items) for (const d in prices[h.ticker as string]) if (d >= cutoff) dateSet.add(d);
    const axis = [...dateSet].sort();
    if (axis.length < 2) return { data: [], coveragePct: 0, asOfLast: null };

    // Forward-fill each ticker's close along the shared date axis.
    const series = items.map((h) => {
        const map = prices[h.ticker as string];
        const tdates = Object.keys(map).sort();
        const aligned: (number | null)[] = [];
        let pi = 0, last: number | null = null;
        for (const d of axis) {
            while (pi < tdates.length && tdates[pi] <= d) { last = map[tdates[pi]]; pi++; }
            aligned.push(last);
        }
        return { w: h.weightPct, aligned, base: aligned[0] };
    }).filter((s) => s.base != null && s.base > 0);

    const repW = series.reduce((s, x) => s + x.w, 0);
    if (repW <= 0) return { data: [], coveragePct: 0, asOfLast: null };

    const data = axis.map((d, idx) => {
        let r = 0;
        for (const s of series) {
            const p = s.aligned[idx];
            if (p == null) continue;
            r += (s.w / repW) * ((p / (s.base as number) - 1) * 100);
        }
        return { date: d, value: parseFloat(r.toFixed(2)) }; // raw YYYY-MM-DD; formatted at render
    });

    return { data, coveragePct: Math.round((repW / totalW) * 100), asOfLast: axis[axis.length - 1] };
}

// "All" / since-inception: a true holding-period-return curve. Each holding is
// rebased to its cost price (current price ÷ (1 + its cost-basis return)) and
// weighted by cost, so value(d) = Σcost·(price(d)/costPrice − 1) / Σcost is the
// portfolio's return-vs-cost at each date, ending exactly at the all-time HPR.
// Holdings without a cost-basis return are excluded.
function buildAllSeries(holdings: Holding[], prices: PriceMap): { data: ChartPoint[]; coveragePct: number; asOfLast: string | null } {
    const totalW = holdings.reduce((s, h) => s + h.weightPct, 0) || 1;
    const items = holdings.filter((h) => h.ticker && prices[h.ticker as string] && h.returnPct != null);

    const dateSet = new Set<string>();
    for (const h of items) for (const d in prices[h.ticker as string]) dateSet.add(d);
    const axis = [...dateSet].sort();
    if (axis.length < 2) return { data: [], coveragePct: 0, asOfLast: null };

    const series = items.map((h) => {
        const map = prices[h.ticker as string];
        const tdates = Object.keys(map).sort();
        const aligned: (number | null)[] = [];
        let pi = 0, last: number | null = null;
        for (const d of axis) { while (pi < tdates.length && tdates[pi] <= d) { last = map[tdates[pi]]; pi++; } aligned.push(last); }
        const lastPrice = aligned[aligned.length - 1];
        const ret = h.returnPct as number;
        if (lastPrice == null || 1 + ret / 100 <= 0) return null;
        const costPrice = lastPrice / (1 + ret / 100);          // implied per-share cost
        return { costWeight: h.weightPct / (1 + ret / 100), w: h.weightPct, aligned, costPrice };
    }).filter((s): s is { costWeight: number; w: number; aligned: (number | null)[]; costPrice: number } => s != null && s.costPrice > 0);

    const repW = series.reduce((s, x) => s + x.w, 0);
    if (!series.length) return { data: [], coveragePct: 0, asOfLast: null };

    const data = axis.map((d, idx) => {
        let r = 0, wsum = 0;
        for (const s of series) {
            const p = s.aligned[idx];
            if (p == null) continue;
            r += s.costWeight * ((p / s.costPrice - 1) * 100);
            wsum += s.costWeight;
        }
        return { date: d, value: parseFloat((wsum > 0 ? r / wsum : 0).toFixed(2)) }; // raw YYYY-MM-DD
    });

    return { data, coveragePct: Math.round((repW / totalW) * 100), asOfLast: axis[axis.length - 1] };
}

interface TipProps {
    active?: boolean;
    payload?: Array<{ value: number }>;
    label?: string;
}
const CustomTooltip = ({ active, payload, label }: TipProps) => {
    if (!active || !payload?.length) return null;
    const v = payload[0].value;
    const when = label ? parseLocalDate(label).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";
    return (
        <div className="bg-base-200 border border-base-300 rounded-xl px-4 py-3 text-sm shadow-lg">
            <p className="text-base-content/70 text-xs font-medium mb-1">{when}</p>
            <p className="font-medium text-base-content">{v > 0 ? "+" : ""}{v.toFixed(2)}%</p>
        </div>
    );
};

// Display label for an x-axis tick (raw YYYY-MM-DD → "May 22" or "May '26").
function formatTick(d: string, range: Range): string {
    const dt = parseLocalDate(d);
    return range === "1Y" || range === "All"
        ? dt.toLocaleDateString("en-US", { month: "short", year: "2-digit" }).replace(/(\d{2})$/, "'$1")
        : dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Evenly-spaced tick dates (by index), always including the first and last point,
// so x-axis gaps are uniform — no oversized gap before a forced final label.
function evenTicks(data: ChartPoint[], count: number): string[] {
    const n = data.length;
    if (n <= count) return data.map((p) => p.date);
    const out: string[] = [];
    for (let i = 0; i < count; i++) out.push(data[Math.round((i * (n - 1)) / (count - 1))].date);
    return [...new Set(out)];
}

export const HoldingsPerformance = ({ title }: { title?: string } = {}) => {
    const [holdings, setHoldings] = useState<Holding[] | null>(null);
    const [totalReturnPct, setTotalReturnPct] = useState<number | null>(null); // cost-basis return since purchase (all-time)
    const [prices, setPrices] = useState<PriceMap | null>(null);
    const [error, setError] = useState(false);
    const [range, setRange] = useState<Range>("YTD");

    useEffect(() => {
        let cancelled = false;
        fetch("/api/holdings")
            .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
            .then((d) => { if (!cancelled) { setHoldings(d.holdings ?? []); setTotalReturnPct(d.totalReturnPct ?? null); } })
            .catch(() => { if (!cancelled) setError(true); });

        // no-cache: always revalidate so a redeploy/weekly refresh of this static
        // file is picked up instead of serving a stale (shorter) cached copy.
        fetch("/holdingsHistory.json", { cache: "no-cache" })
            .then((r) => r.ok ? r.json() : Promise.reject())
            .then((d) => { if (!cancelled) setPrices(d.prices ?? {}); })
            .catch(() => { if (!cancelled) setPrices({}); });

        return () => { cancelled = true; };
    }, []);

    const { data, coveragePct } = useMemo(
        () => {
            if (!holdings || !prices) return { data: [], coveragePct: 0, asOfLast: null };
            return range === "All" ? buildAllSeries(holdings, prices) : buildSeries(range, holdings, prices);
        },
        [range, holdings, prices],
    );

    const last = data[data.length - 1];
    const loading = (!holdings || !prices) && !error;

    return (
        <div className="bg-base-100 border border-base-300 rounded-2xl p-6 space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                    <h2 className="text-lg font-semibold text-base-content">{title ?? "My Portfolio Performance"}</h2>
                    <p className="text-sm text-base-content/60 mt-0.5">
                        {error ? "Performance is currently unavailable."
                            : range === "All" && totalReturnPct != null
                                ? <><span className={`font-semibold ${totalReturnPct >= 0 ? "text-success" : "text-error"}`}>
                                        {totalReturnPct > 0 ? "+" : ""}{totalReturnPct}%
                                    </span>{" "}all time</>
                                : last
                                    ? <><span className={`font-semibold ${last.value >= 0 ? "text-success" : "text-error"}`}>
                                            {last.value > 0 ? "+" : ""}{last.value.toFixed(2)}%
                                        </span>{" "}{RANGE_LABEL[range]}</>
                                    : "Performance over the selected range"}
                    </p>
                </div>
                <div className="flex gap-1">
                    {RANGES.map((r) => (
                        <button
                            key={r}
                            onClick={() => setRange(r)}
                            className={`btn btn-sm rounded-lg font-medium ${range === r ? "btn-neutral" : "btn-ghost text-base-content/50"}`}
                        >
                            {r}
                        </button>
                    ))}
                </div>
            </div>

            {/* Chart */}
            {error ? (
                <p className="text-sm text-base-content/50 py-10 text-center">Connect your brokerage to see performance.</p>
            ) : loading ? (
                <div className="h-[260px] rounded bg-base-200 animate-pulse" aria-hidden="true" />
            ) : data.length < 2 ? (
                <p className="text-sm text-base-content/50 py-10 text-center">Not enough price history for this range yet.</p>
            ) : (
                <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-base-content/10" vertical={false} />
                        <XAxis dataKey="date" tickFormatter={(d: string) => formatTick(d, range)} ticks={evenTicks(data, 7)} tick={{ fontSize: 11, fill: "currentColor", opacity: 0.4 }} tickLine={false} axisLine={false} interval={0} minTickGap={20} />
                        <YAxis tickFormatter={(v: number) => `${v > 0 ? "+" : ""}${v.toFixed(0)}%`} tick={{ fontSize: 11, fill: "currentColor", opacity: 0.4 }} tickLine={false} axisLine={false} width={48} />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: "currentColor", strokeOpacity: 0.1, strokeWidth: 1 }} />
                        <Line type="monotone" dataKey="value" stroke="#E8A020" strokeWidth={3} dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }} />
                    </LineChart>
                </ResponsiveContainer>
            )}

            {/* Summary */}
            {!error && !loading && last && (
                <div className="flex items-center gap-2 flex-wrap text-xs text-base-content/60">
                    <span className="w-3 h-0.5 rounded-full inline-block" style={{ background: "#E8A020" }} />
                    My portfolio return
                    {coveragePct < 98 && <span className="text-base-content/40">· represents {coveragePct}% of holdings by weight</span>}
                </div>
            )}

            <p className="text-[11px] text-base-content/40 leading-snug">
                Performance reflects each holding’s dividend-adjusted total return over the selected range, blended by
                current portfolio weight — a close estimate, not an exact account return, since it doesn’t account for
                trades or contributions made within the range. All-time return is measured against cost basis. Past
                performance doesn’t guarantee future results.
            </p>
        </div>
    );
};
