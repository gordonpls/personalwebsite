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
import monthlyCache from "../data/tickerCache.json";
import dailyCache from "../data/tickerDailyCache.json";

interface Holding {
    institution: string;
    ticker: string | null;
    name: string;
    type: string | null;
    weightPct: number;
}

interface RawEntry {
    date: string;
    VT: number | null;
    VXUS: number | null;
    BND: number | null;
    BNDX: number | null;
}

// Tickers / names we treat as fixed income; everything else equity-like is equity.
const BOND_TICKERS = new Set([
    "BND", "BNDX", "BNDW", "AGG", "IAGG", "VGIT", "VCIT", "VGSH", "VGLT",
    "VTEB", "MUB", "TLT", "IEF", "GOVT", "SCHZ", "VTIP", "SCHP",
]);
const isCash = (h: Holding) => h.type === "cash" || (h.ticker ?? "").toUpperCase() === "VMFXX";
const isBond = (h: Holding) => {
    const t = (h.ticker ?? "").toUpperCase();
    if (BOND_TICKERS.has(t)) return true;
    return /\b(bond|treasury|fixed income|aggregate|municipal)\b/i.test(h.name ?? "");
};

type Range = "1W" | "1M" | "3M" | "YTD" | "1Y";
const RANGES: Range[] = ["1W", "1M", "3M", "YTD", "1Y"];

function parseLocalDate(s: string): Date {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, (m ?? 1) - 1, d ?? 1);
}

// Earliest date to include for a range. 1Y compares against monthly "YYYY-MM"
// keys; the daily ranges compare against "YYYY-MM-DD".
function cutoffFor(range: Range): string {
    const d = new Date();
    if (range === "YTD") return `${d.getFullYear()}-01-01`;
    if (range === "1Y") { d.setFullYear(d.getFullYear() - 1); return d.toISOString().slice(0, 7); }
    if (range === "1W") d.setDate(d.getDate() - 7);
    else if (range === "1M") d.setMonth(d.getMonth() - 1);
    else if (range === "3M") d.setMonth(d.getMonth() - 3);
    return d.toISOString().slice(0, 10);
}

interface ChartPoint { date: string; portfolio: number; }

// Short ranges use the daily cache; 1Y uses the monthly cache. Each ticker is
// rebased to percent-return-from-period-start, then blended by the equity/bond split.
function buildSeries(range: Range, equityFrac: number): { data: ChartPoint[]; asOf: string | null } {
    const monthly = range === "1Y";
    const source = (monthly ? monthlyCache.series : dailyCache.series) as RawEntry[];
    const cutoff = cutoffFor(range);

    const clean = source
        .filter((e) => e.date >= cutoff && e.VT != null && e.VXUS != null && e.BND != null && e.BNDX != null)
        .sort((a, b) => a.date.localeCompare(b.date)) as Array<Required<RawEntry>>;

    if (clean.length < 2) return { data: [], asOf: null };

    const base = clean[0];
    const lbl: Intl.DateTimeFormatOptions = monthly ? { month: "short", year: "2-digit" } : { month: "short", day: "numeric" };

    const data = clean.map((e) => {
        const ret = (cur: number, b: number) => (cur / b - 1) * 100;
        const equities = ret(e.VT, base.VT) * 0.6 + ret(e.VXUS, base.VXUS) * 0.4;
        const bonds = ret(e.BND, base.BND) * 0.6 + ret(e.BNDX, base.BNDX) * 0.4;
        const raw = parseLocalDate(e.date).toLocaleDateString("en-US", lbl);
        return {
            date: monthly ? raw.replace(/(\d{2})$/, "'$1") : raw,
            portfolio: parseFloat((equityFrac * equities + (1 - equityFrac) * bonds).toFixed(2)),
        };
    });

    const asOf = parseLocalDate(clean[clean.length - 1].date).toLocaleDateString("en-US",
        monthly ? { month: "short", year: "numeric" } : { month: "short", day: "numeric", year: "numeric" });
    return { data, asOf };
}

interface TipProps {
    active?: boolean;
    payload?: Array<{ dataKey: string; value: number }>;
    label?: string;
}
const CustomTooltip = ({ active, payload, label }: TipProps) => {
    if (!active || !payload?.length) return null;
    const v = payload.find((p) => p.dataKey === "portfolio")?.value;
    if (v == null) return null;
    return (
        <div className="bg-base-200 border border-base-300 rounded-xl px-4 py-3 text-sm shadow-lg">
            <p className="text-base-content/70 text-xs font-medium mb-1">{label}</p>
            <p className="font-medium text-base-content">{v > 0 ? "+" : ""}{v.toFixed(2)}%</p>
        </div>
    );
};

export const HoldingsPerformance = () => {
    const [holdings, setHoldings] = useState<Holding[] | null>(null);
    const [error, setError] = useState(false);
    const [range, setRange] = useState<Range>("YTD");

    useEffect(() => {
        let cancelled = false;
        fetch("/api/holdings")
            .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
            .then((d) => { if (!cancelled) setHoldings(d.holdings ?? []); })
            .catch(() => { if (!cancelled) setError(true); });
        return () => { cancelled = true; };
    }, []);

    // Real equity/bond split from holdings (cash excluded, renormalized to 100%).
    const equityFrac = useMemo(() => {
        let eq = 0, bd = 0;
        for (const h of holdings ?? []) {
            if (isCash(h)) continue;
            if (isBond(h)) bd += h.weightPct; else eq += h.weightPct;
        }
        const total = eq + bd;
        return total > 0 ? eq / total : 0;
    }, [holdings]);

    const { data: chartData, asOf } = useMemo(() => buildSeries(range, equityFrac), [range, equityFrac]);

    const last = chartData[chartData.length - 1];
    const equityPct = Math.round(equityFrac * 100);
    const loading = !holdings && !error;

    return (
        <div className="bg-base-100 border border-base-300 rounded-2xl p-6 space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                    <h2 className="text-lg font-semibold text-base-content">My Portfolio Performance</h2>
                    <p className="text-sm text-base-content/60 mt-0.5">
                        {error
                            ? "Your holdings are currently unavailable."
                            : `Your current mix: ${equityPct}% stocks · ${100 - equityPct}% bonds`}
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
                <p className="text-sm text-base-content/50 py-10 text-center">Connect your brokerage to see portfolio performance.</p>
            ) : loading ? (
                <div className="h-[260px] rounded bg-base-200 animate-pulse" aria-hidden="true" />
            ) : chartData.length < 2 ? (
                <p className="text-sm text-base-content/50 py-10 text-center">Not enough price history for this range yet.</p>
            ) : (
                <div className="relative">
                    {asOf && (
                        <span className="absolute top-1 right-1 text-[10px] text-base-content/30 z-10 pointer-events-none">
                            As of {asOf}
                        </span>
                    )}
                    <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-base-content/10" vertical={false} />
                            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "currentColor", opacity: 0.4 }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={50} />
                            <YAxis tickFormatter={(v: number) => `${v > 0 ? "+" : ""}${v.toFixed(0)}%`} tick={{ fontSize: 11, fill: "currentColor", opacity: 0.4 }} tickLine={false} axisLine={false} width={48} />
                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: "currentColor", strokeOpacity: 0.1, strokeWidth: 1 }} />
                            <Line type="monotone" dataKey="portfolio" stroke="#E8A020" strokeWidth={3} dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Legend + summary */}
            {!error && !loading && last && (
                <div className="flex gap-4 flex-wrap">
                    <span className="flex items-center gap-2 text-xs text-base-content/60">
                        <span className="w-3 h-0.5 rounded-full inline-block" style={{ background: "#E8A020" }} />
                        Your portfolio
                        <span className="font-medium text-base-content">{last.portfolio > 0 ? "+" : ""}{last.portfolio.toFixed(1)}%</span>
                    </span>
                </div>
            )}

            <p className="text-[11px] text-base-content/40 leading-snug">
                Illustrative: your current stock/bond split applied to broad global index returns over the selected range,
                not actual realized performance. Past performance doesn’t guarantee future results.
            </p>
        </div>
    );
};
