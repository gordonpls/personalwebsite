import { useEffect, useMemo, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface Holding {
    portfolio: string;
    ticker: string | null;
    name: string;
    type: string | null;
    weightPct: number;
    returnPct: number | null;
}
interface Meta { type?: string; industry?: string; stats?: { beta?: number; volatility?: number; return52w?: number; dividendYield?: number } }
type MetaMap = Record<string, Meta>;

const COLORS = ["#E8A020", "#378ADD", "#1D9E75", "#7F77DD", "#D85A30", "#56CC5A", "#E0556B", "#5AA9C9", "#9C8B3E", "#A35ABF"];

const cap = (s?: string | null) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : null);
const isFund = (h: Holding, m?: Meta) => {
    const t = (m?.type || h.type || "").toLowerCase();
    return t.includes("etf") || t.includes("fund");
};

interface Slice { name: string; value: number }
const DonutTip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: Slice }> }) => {
    if (!active || !payload?.length) return null;
    const s = payload[0].payload;
    return (
        <div className="bg-base-200 border border-base-300 rounded-lg px-3 py-1.5 text-xs shadow-lg">
            <span className="font-medium text-base-content">{s.name}</span>
            <span className="text-base-content/60"> · {s.value.toFixed(1)}%</span>
        </div>
    );
};

const Stat = ({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) => (
    <div className="min-w-0">
        <p className={`text-2xl font-bold tracking-tight tabular-nums ${valueClass ?? "text-base-content"}`}>{value}</p>
        <p className="text-xs text-base-content/50 leading-tight">{label}</p>
    </div>
);

// Sector/asset-class allocation donut + portfolio-level risk/income stats.
// All overall (every holding), matching the all-holdings heatmap it sits beside.
// Reuses /api/holdings + the baked /holdingsMeta.json — no extra API calls.
export const PortfolioAnalytics = () => {
    const [holdings, setHoldings] = useState<Holding[] | null>(null);
    const [meta, setMeta] = useState<MetaMap>({});
    const [error, setError] = useState(false);

    useEffect(() => {
        let cancelled = false;
        fetch("/api/holdings")
            .then((r) => r.ok ? r.json() : Promise.reject())
            .then((d) => { if (!cancelled) setHoldings(d.holdings ?? []); })
            .catch(() => { if (!cancelled) setError(true); });
        fetch("/holdingsMeta.json", { cache: "no-cache" })
            .then((r) => r.ok ? r.json() : Promise.reject())
            .then((d) => { if (!cancelled) setMeta(d.meta ?? {}); })
            .catch(() => { /* sector labels just fall back to type */ });
        return () => { cancelled = true; };
    }, []);

    const { slices, beta, vol, ret1y, divYield } = useMemo(() => {
        const hs = holdings ?? [];
        const catW = new Map<string, number>();
        let bSum = 0, bW = 0, vSum = 0, vW = 0, rSum = 0, rW = 0, dSum = 0, dW = 0;
        for (const h of hs) {
            if (!h.ticker || h.weightPct <= 0) continue;
            const m = meta[h.ticker];
            const cat = isFund(h, m) ? "ETFs & Funds" : (m?.industry || cap(h.type) || "Other");
            catW.set(cat, (catW.get(cat) || 0) + h.weightPct);
            const st = m?.stats;
            if (st?.beta != null) { bSum += h.weightPct * st.beta; bW += h.weightPct; }
            if (st?.volatility != null) { vSum += h.weightPct * st.volatility; vW += h.weightPct; }
            if (st?.return52w != null) { rSum += h.weightPct * st.return52w; rW += h.weightPct; }
            if (st?.dividendYield != null) { dSum += h.weightPct * st.dividendYield; dW += h.weightPct; } // 0 = non-payer, still counted
        }
        let arr: Slice[] = [...catW.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
        if (arr.length > 7) {
            const other = arr.slice(6).reduce((s, x) => s + x.value, 0);
            arr = [...arr.slice(0, 6), { name: "Other", value: other }];
        }
        return {
            slices: arr,
            beta: bW > 0 ? bSum / bW : null,
            vol: vW > 0 ? vSum / vW : null,
            ret1y: rW > 0 ? rSum / rW : null,
            divYield: dW > 0 ? dSum / dW : null,
        };
    }, [holdings, meta]);

    const loading = !holdings && !error;

    return (
        <>
            {/* Risk & income */}
            <div className="bg-base-100 border border-base-300 rounded-2xl p-5 shrink-0">
                <h3 className="text-sm font-semibold text-base-content mb-3">Risk, return &amp; income</h3>
                {error ? (
                    <p className="text-xs text-base-content/50">Unavailable.</p>
                ) : loading ? (
                    <div className="h-12 rounded bg-base-200 animate-pulse" />
                ) : (
                    <div className="grid grid-cols-2 gap-x-3 gap-y-4">
                        <Stat label="Beta" value={beta != null ? beta.toFixed(2) : "—"} />
                        <Stat label="Avg volatility" value={vol != null ? `${vol.toFixed(1)}%` : "—"} />
                        <Stat label="1Y return" value={ret1y != null ? `${ret1y > 0 ? "+" : ""}${ret1y.toFixed(1)}%` : "—"} valueClass={ret1y != null ? (ret1y >= 0 ? "text-success" : "text-error") : undefined} />
                        <Stat label="Div yield" value={divYield != null ? `${divYield.toFixed(2)}%` : "—"} />
                    </div>
                )}
                <p className="text-[10px] text-base-content/30 mt-2 leading-snug">Weighted by holding · volatility is a weighted average · yield is trailing-12-month.</p>
            </div>

            {/* Allocation donut */}
            <div className="bg-base-100 border border-base-300 rounded-2xl p-5 flex flex-col lg:flex-1 lg:min-h-0">
                <h3 className="text-sm font-semibold text-base-content shrink-0">Allocation</h3>
                <p className="text-xs text-base-content/50 mt-0.5 shrink-0">By sector &amp; fund</p>
                {error ? (
                    <p className="text-xs text-base-content/50 py-8 text-center">Unavailable.</p>
                ) : loading ? (
                    <div className="flex-1 min-h-[12rem] rounded bg-base-200 animate-pulse mt-3" />
                ) : (
                    <div className="flex-1 min-h-0 flex flex-col mt-2">
                        <div className="flex-1 min-h-[5rem]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={slices} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="58%" outerRadius="82%" paddingAngle={1} stroke="none">
                                        {slices.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip content={<DonutTip />} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-3 text-xs shrink-0">
                            {slices.map((s, i) => (
                                <div key={s.name} className="flex items-center gap-1.5 min-w-0">
                                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                                    <span className="truncate text-base-content/70">{s.name}</span>
                                    <span className="ml-auto tabular-nums text-base-content/50 shrink-0">{s.value.toFixed(0)}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};
