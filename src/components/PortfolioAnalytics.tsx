import { useEffect, useMemo, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { PortfolioScopePill } from "./PortfolioScopePill";

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

const cap = (s?: string | null) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : null);
const isFund = (h: Holding, m?: Meta) => {
    const t = (m?.type || h.type || "").toLowerCase();
    return t.includes("etf") || t.includes("fund");
};

// Roll Finnhub's industry (sub-sector level) up to a GICS-ish sector so the donut
// stays readable. Anything unrecognized is passed through, so genuine outliers
// still get their own slice (and may end up bucketed into "Other" if small).
const SECTOR_OF_INDUSTRY: Record<string, string> = {
    "Technology": "Technology",
    "Semiconductors": "Technology",
    "Software": "Technology",
    "Hardware": "Technology",
    "Internet": "Technology",
    "Media": "Communication Services",
    "Telecommunication": "Communication Services",
    "Pharmaceuticals": "Healthcare",
    "Biotechnology": "Healthcare",
    "Health Care": "Healthcare",
    "Medical Devices": "Healthcare",
    "Financial Services": "Financials",
    "Banks": "Financials",
    "Insurance": "Financials",
    "Capital Markets": "Financials",
    "Retail": "Consumer Discretionary",
    "Automobiles": "Consumer Discretionary",
    "Consumer Durables": "Consumer Discretionary",
    "Hotels, Restaurants & Leisure": "Consumer Discretionary",
    "Food, Beverage & Tobacco": "Consumer Staples",
    "Household Products": "Consumer Staples",
    "Personal Products": "Consumer Staples",
    "Energy": "Energy",
    "Oil & Gas": "Energy",
    "Electrical Equipment": "Industrials",
    "Aerospace & Defense": "Industrials",
    "Machinery": "Industrials",
    "Transportation": "Industrials",
    "Construction": "Industrials",
    "Materials": "Materials",
    "Chemicals": "Materials",
    "Metals & Mining": "Materials",
    "Real Estate": "Real Estate",
    "Utilities": "Utilities",
};

// Map a fund/ETF to a meaningful bucket using its name + ticker.
// Order matters: bonds first, then international, then sectors, then broad market.
function classifyFund(h: Holding, m?: Meta): string {
    const name = (m?.name || h.name || "").toLowerCase();
    const t = (h.ticker || "").toUpperCase();
    if (/bond|treasur|aggregate|fixed income|municipal/.test(name)) return "Bonds";
    if (/internation|ex-?us|emerging|developed market|world ex|eafe|all-world/.test(name)) return "International Equity";
    if (/uranium|nuclear|energy/.test(name)) return "Energy";
    if (/semiconductor/.test(name)) return "Technology";
    if (/digital infrastructure|data center|cloud/.test(name)) return "Technology";
    if (/real estate|reit/.test(name)) return "Real Estate";
    if (/health|biotech|pharma/.test(name)) return "Healthcare";
    if (/financ|bank/.test(name)) return "Financials";
    if (/utilit/.test(name)) return "Utilities";
    if (/gold|silver|preciou|commod/.test(name) || ["GLD", "SLV", "IAU"].includes(t)) return "Commodities";
    if (/small-?cap/.test(name)) return "US Small/Mid-Cap";
    if (/mid-?cap|extended market/.test(name)) return "US Small/Mid-Cap";
    if (/growth/.test(name)) return "US Growth";
    if (/value/.test(name)) return "US Value";
    if (/momentum/.test(name)) return "US Factor";
    if (/s&p 500|total stock market|total us|us market|large-?cap|nasdaq/.test(name)) return "US Broad Market";
    return "Other Funds";
}

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
// Tab-scoped: the optional `portfolio` filters the same /api/holdings feed the
// heatmap uses, so both cards always agree on what they're showing. When the
// scope pill in the header is wired (scopeLabel/onScopeChange/scopeOptions),
// the user can also change scope from this component instead of scrolling to
// the global tabs.
export const PortfolioAnalytics = ({
    portfolio,
    scopeLabel,
    onScopeChange,
    scopeOptions,
}: {
    portfolio?: string;
    scopeLabel?: string;
    onScopeChange?: (next: string) => void;
    scopeOptions?: readonly string[];
} = {}) => {
    const [holdings, setHoldings] = useState<Holding[] | null>(null);
    const [meta, setMeta] = useState<MetaMap>({});
    const [prices, setPrices] = useState<PriceMap>({});
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
        fetch("/holdingsHistory.json", { cache: "no-cache" })
            .then((r) => r.ok ? r.json() : Promise.reject())
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
        const cutoff1y = latestStr
            ? new Date(parseLocalDate(latestStr).getTime() - 365 * 86400000).toISOString().slice(0, 10)
            : "";

        for (const h of hs) {
            if (!h.ticker || h.weightPct <= 0) continue;
            const m = meta[h.ticker];
            const cat = isFund(h, m)
                ? classifyFund(h, m)
                : (SECTOR_OF_INDUSTRY[m?.industry ?? ""] || m?.industry || cap(h.type) || "Other");
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
                if (baseIdx >= 0 && baseIdx < dates.length - 1) {
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
            <div className="bg-base-100 border border-base-300 rounded-2xl p-5 lg:flex-1 lg:basis-0 lg:min-h-0 flex flex-col">
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

            {/* Allocation donut */}
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
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-3 text-xs shrink-0">
                            {slices.map((s, i) => (
                                <div key={s.name} className="flex items-center gap-1.5 min-w-0" title={`${s.name} · ${s.value.toFixed(1)}%`}>
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
