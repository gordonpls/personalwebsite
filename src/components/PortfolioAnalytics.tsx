import { useEffect, useMemo, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { PortfolioScopePill } from "./PortfolioScopePill";
import { cachedJson } from "../services/apiCache";
import { categoryOf } from "../utils/holdingCategory";
import { formatWeightPct } from "../utils/format";

interface Holding {
    portfolio: string;
    ticker: string | null;
    name: string;
    type: string | null;
    weightPct: number;
    returnPct: number | null;
}
interface Meta { type?: string; industry?: string; stats?: { beta?: number; volatility?: number; dividendYield?: number } }
type MetaMap = Record<string, Meta>;
type PriceMap = Record<string, Record<string, number>>;
const parseLocalDate = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, (m ?? 1) - 1, d ?? 1); };

const COLORS = ["#E8A020", "#378ADD", "#1D9E75", "#7F77DD", "#D85A30", "#56CC5A", "#E0556B", "#5AA9C9", "#9C8B3E", "#A35ABF"];

interface Slice { name: string; value: number }
const DonutTip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: Slice }> }) => {
    if (!active || !payload?.length) return null;
    const s = payload[0].payload;
    return (
        <div className="bg-base-200 border border-base-300 rounded-lg px-3 py-1.5 text-xs shadow-lg">
            <span className="font-medium text-base-content">{s.name}</span>
            <span className="text-base-content/60"> · {formatWeightPct(s.value)}</span>
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
// Tab-scoped: the optional `portfolio` filters the same /api/holdings feed the
// heatmap uses, so both cards always agree on what they're showing. When the
// scope pill in the header is wired (scopeLabel/onScopeChange/scopeOptions),
// the user can also change scope from this component instead of scrolling to
// the global tabs.
// `show` renders one card on its own: "risk" as a full-width strip of four
// headline numbers, "allocation" as the donut. Omitted = both, stacked.
export const PortfolioAnalytics = ({
    portfolio,
    scopeLabel,
    onScopeChange,
    scopeOptions,
    show,
}: {
    portfolio?: string;
    scopeLabel?: string;
    onScopeChange?: (next: string) => void;
    scopeOptions?: readonly string[];
    show?: "risk" | "allocation";
} = {}) => {
    const [holdings, setHoldings] = useState<Holding[] | null>(null);
    const [meta, setMeta] = useState<MetaMap>({});
    const [prices, setPrices] = useState<PriceMap>({});
    const [error, setError] = useState(false);

    useEffect(() => {
        let cancelled = false;
        cachedJson("/api/holdings")
            .then((d) => { if (!cancelled) setHoldings(d.holdings ?? []); })
            .catch(() => { if (!cancelled) setError(true); });
        cachedJson("/api/finance/meta")
            .then((d) => { if (!cancelled) setMeta(d.meta ?? {}); })
            .catch(() => { /* sector labels just fall back to type */ });
        cachedJson("/api/finance/history")
            .then((d) => { if (!cancelled) setPrices(d.prices ?? {}); })
            .catch(() => { /* 1Y return falls back to "—" */ });
        return () => { cancelled = true; };
    }, []);

    const { slices, beta, vol, ret1y, divYield } = useMemo(() => {
        const all = holdings ?? [];
        const hs = portfolio ? all.filter((h) => h.portfolio === portfolio) : all;
        const catW = new Map<string, number>();
        let bSum = 0, bW = 0, vSum = 0, vW = 0, rSum = 0, rW = 0, dSum = 0, dW = 0;

        // 1Y return is computed from the same baked Yahoo dividend-adjusted closes
        // as the performance chart, so the two never disagree. Cutoff is anchored
        // to the latest data point we have (not "today") to survive weekend lag.
        let latestStr = "";
        for (const t in prices) for (const d in prices[t]) if (d > latestStr) latestStr = d;
        let cutoff1y = "";
        if (latestStr) {
            const c = parseLocalDate(latestStr);
            c.setFullYear(c.getFullYear() - 1); // same cutoff as the chart's 1Y range
            cutoff1y = `${c.getFullYear()}-${String(c.getMonth() + 1).padStart(2, "0")}-${String(c.getDate()).padStart(2, "0")}`;
        }

        for (const h of hs) {
            if (!h.ticker || h.weightPct <= 0) continue;
            const m = meta[h.ticker];
            const cat = categoryOf(h, m);
            catW.set(cat, (catW.get(cat) || 0) + h.weightPct);
            const st = m?.stats;
            if (st?.beta != null) { bSum += h.weightPct * st.beta; bW += h.weightPct; }
            if (st?.volatility != null) { vSum += h.weightPct * st.volatility; vW += h.weightPct; }
            if (st?.dividendYield != null) { dSum += h.weightPct * st.dividendYield; dW += h.weightPct; } // 0 = non-payer, still counted

            // Dividend-adjusted 1Y total return from prices.
            const s = prices[h.ticker];
            if (s && cutoff1y) {
                const dates = Object.keys(s).sort();
                const last = s[dates[dates.length - 1]];
                const baseIdx = dates.findIndex((d) => d >= cutoff1y);
                // Require history reaching back to the cutoff — a ticker that listed
                // mid-year would otherwise report its since-IPO return as "1Y"
                // (the chart excludes these too). Allow a few days for a weekend/holiday.
                const coversYear = Date.parse(dates[0]) - Date.parse(cutoff1y) <= 4 * 86400000;
                if (coversYear && baseIdx >= 0 && baseIdx < dates.length - 1) {
                    const base = s[dates[baseIdx]];
                    if (base > 0 && last > 0) {
                        rSum += h.weightPct * ((last / base - 1) * 100);
                        rW += h.weightPct;
                    }
                }
            }
        }
        let arr: Slice[] = [...catW.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
        // Surface up to 8 named slices + collapse the long tail into "Other".
        const MAX_SLICES = 8;
        if (arr.length > MAX_SLICES + 1) {
            const other = arr.slice(MAX_SLICES).reduce((s, x) => s + x.value, 0);
            arr = [...arr.slice(0, MAX_SLICES), { name: "Other", value: other }];
        }
        return {
            slices: arr,
            beta: bW > 0 ? bSum / bW : null,
            vol: vW > 0 ? vSum / vW : null,
            ret1y: rW > 0 ? rSum / rW : null,
            divYield: dW > 0 ? dSum / dW : null,
        };
    }, [holdings, meta, prices, portfolio]);

    const loading = !holdings && !error;

    return (
        <>
            {/* Risk & income */}
            {show !== "allocation" && (show === "risk" ? (
                <div className="bg-base-100 border border-base-300 rounded-2xl px-5 py-4">
                    {/* Title and numbers share a row only from lg up; narrower, the
                        numbers get the full width beneath (2×2, then 4 across). */}
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-6">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-semibold text-base-content">Risk, return &amp; income</h3>
                            {scopeLabel && onScopeChange && scopeOptions && (
                                <PortfolioScopePill current={scopeLabel} onChange={onScopeChange} options={scopeOptions} align="start" />
                            )}
                        </div>
                        {error ? (
                            <p className="text-xs text-base-content/50">Unavailable.</p>
                        ) : loading ? (
                            <div className="h-12 w-full flex-1 rounded bg-base-200 animate-pulse" />
                        ) : (
                            <div className="grid min-w-0 flex-1 grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4 md:divide-x md:divide-base-300 [&>*]:md:pl-6 [&>*:first-child]:md:pl-0">
                                <Stat label="Beta" value={beta != null ? beta.toFixed(2) : "—"} />
                                <Stat label="Avg volatility" value={vol != null ? `${vol.toFixed(1)}%` : "—"} />
                                <Stat label="1Y return" value={ret1y != null ? `${ret1y > 0 ? "+" : ""}${ret1y.toFixed(1)}%` : "—"} valueClass={ret1y != null ? (ret1y >= 0 ? "text-success" : "text-error") : undefined} />
                                <Stat label="Div yield" value={divYield != null ? `${divYield.toFixed(2)}%` : "—"} />
                            </div>
                        )}
                    </div>
                    <p className="text-[11px] text-base-content/60 mt-3 leading-snug">Weighted by holding · 1Y return and yield are dividend-adjusted · volatility is a weighted average.</p>
                </div>
            ) : (
            /* xl:flex-none: in the narrow stacked column this card takes its natural
               height and the donut below gets the rest. */
            <div className="bg-base-100 border border-base-300 rounded-2xl p-5 lg:flex-1 lg:basis-0 lg:min-h-0 xl:flex-none xl:basis-auto flex flex-col">
                <div className="flex items-center gap-2 flex-wrap mb-3">
                    <h3 className="text-sm font-semibold text-base-content">Risk, return &amp; income</h3>
                    {scopeLabel && onScopeChange && scopeOptions && (
                        <PortfolioScopePill current={scopeLabel} onChange={onScopeChange} options={scopeOptions} align="start" />
                    )}
                </div>
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
                <p className="text-[11px] text-base-content/60 mt-2 leading-snug">Weighted by holding · 1Y return and yield are dividend-adjusted · volatility is a weighted average.</p>
            </div>
            ))}

            {/* Allocation donut */}
            {show !== "risk" && (
            <div className="bg-base-100 border border-base-300 rounded-2xl p-5 flex flex-col lg:flex-1 lg:basis-0 lg:min-h-0">
                <div className="flex items-baseline gap-2 shrink-0">
                    <h3 className="text-sm font-semibold text-base-content">Allocation</h3>
                    <p className="text-xs text-base-content/50">By category</p>
                </div>
                {error ? (
                    <p className="text-xs text-base-content/50 py-8 text-center">Unavailable.</p>
                ) : loading ? (
                    <div className="h-56 lg:h-auto lg:flex-1 lg:min-h-[12rem] rounded bg-base-200 animate-pulse mt-3" />
                ) : (
                    <div className="flex flex-col mt-2 lg:flex-1 lg:min-h-0">
                        {/* Fixed mobile height (no flex parent to grow into) → flex on lg. */}
                        <div className="h-56 lg:h-auto lg:flex-1 lg:min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={slices} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="56%" outerRadius="94%" paddingAngle={1} stroke="none">
                                        {slices.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip content={<DonutTip />} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        {/* Two columns at every breakpoint so the donut keeps room
                            to breathe. Long labels truncate; each row carries a
                            native title= so the full name + share appears on hover. */}
                        <div className={`grid grid-cols-2 gap-x-3 gap-y-1 mt-3 text-xs shrink-0 ${show === "allocation" ? "xl:grid-cols-1" : ""}`}>
                            {slices.map((s, i) => (
                                <div key={s.name} className="flex items-center gap-1.5 min-w-0" title={`${s.name} · ${formatWeightPct(s.value)}`}>
                                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                                    <span className="truncate text-base-content/70">{s.name}</span>
                                    <span className="ml-auto tabular-nums text-base-content/50 shrink-0">{s.value.toFixed(0)}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            )}
        </>
    );
};
