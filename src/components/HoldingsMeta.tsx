import { useEffect, useMemo, useState } from "react";

interface Holding {
    portfolio: string;
    ticker: string | null;
    name: string;
    type: string | null;
    weightPct: number;
    returnPct: number | null;
}
interface Stats {
    pe?: number; pb?: number; beta?: number; divYield?: number; eps?: number;
    roe?: number; profitMargin?: number; revGrowth?: number;
    return13w?: number; return26w?: number; return52w?: number; volatility?: number;
}
interface Analysts { strongBuy: number; buy: number; hold: number; sell: number; strongSell: number; period?: string; }
interface Meta {
    name?: string; type?: string; exchange?: string; currency?: string;
    week52High?: number; week52Low?: number; price?: number;
    industry?: string; logo?: string; marketCap?: number; website?: string; country?: string; ipo?: string;
    stats?: Stats; analysts?: Analysts;
}
type MetaMap = Record<string, Meta>;
type PriceMap = Record<string, Record<string, number>>;
type QuoteMap = Record<string, number>;

function fmtCap(m?: number): string | null {
    if (!m) return null; // USD millions
    if (m >= 1_000_000) return `$${(m / 1_000_000).toFixed(2)}T`;
    if (m >= 1_000) return `$${(m / 1_000).toFixed(2)}B`;
    return `$${Math.round(m)}M`;
}

const Fact = ({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) => (
    <div className="min-w-0">
        <p className="text-xs text-base-content/40">{label}</p>
        <p className={`font-medium truncate ${valueClass ?? "text-base-content"}`}>{value}</p>
    </div>
);

// SVG sparkline of the holding's ~1Y adjusted price; green if up over the window.
function Sparkline({ series }: { series?: Record<string, number> }) {
    const pts = useMemo(() => {
        if (!series) return [];
        const cut = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10);
        return Object.keys(series).filter((d) => d >= cut).sort().map((d) => series[d]);
    }, [series]);
    if (pts.length < 2) return null;
    const w = 300, h = 44, min = Math.min(...pts), max = Math.max(...pts), range = max - min || 1;
    const path = pts.map((v, i) => `${(i / (pts.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ");
    const up = pts[pts.length - 1] >= pts[0];
    return (
        <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={`w-full h-11 ${up ? "text-success" : "text-error"}`}>
            <polyline points={path} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
    );
}

const REC_LABEL = (a: Analysts): string => {
    const total = a.strongBuy + a.buy + a.hold + a.sell + a.strongSell || 1;
    const score = (a.strongBuy * 2 + a.buy - a.sell - a.strongSell * 2) / total;
    return score > 1.5 ? "Strong Buy" : score > 0.5 ? "Buy" : score > -0.5 ? "Hold" : score > -1.5 ? "Sell" : "Strong Sell";
};

function SentimentBar({ a }: { a: Analysts }) {
    const total = a.strongBuy + a.buy + a.hold + a.sell + a.strongSell;
    if (!total) return null;
    const segs = [
        { n: a.strongBuy, c: "#15803d" }, { n: a.buy, c: "#22c55e" }, { n: a.hold, c: "#9ca3af" },
        { n: a.sell, c: "#f87171" }, { n: a.strongSell, c: "#b91c1c" },
    ];
    return (
        <div>
            <div className="flex justify-between text-xs text-base-content/50 mb-1.5">
                <span>Analyst consensus</span>
                <span className="font-medium text-base-content/70">{REC_LABEL(a)} · {total}</span>
            </div>
            <div className="flex h-2 rounded-full overflow-hidden bg-base-300">
                {segs.map((s, i) => s.n > 0 && (
                    <div key={i} style={{ width: `${(s.n / total) * 100}%`, background: s.c }} title={`${s.n}`} />
                ))}
            </div>
        </div>
    );
}

export const HoldingsMeta = ({ holding }: { holding: Holding | null }) => {
    const [metaMap, setMetaMap] = useState<MetaMap | null>(null);
    const [prices, setPrices] = useState<PriceMap>({});
    const [quotes, setQuotes] = useState<QuoteMap>({});
    const [error, setError] = useState(false);

    useEffect(() => {
        let cancelled = false;
        // Static, cache-revalidated files — no per-visit API calls.
        fetch("/holdingsMeta.json", { cache: "no-cache" })
            .then((r) => r.ok ? r.json() : Promise.reject())
            .then((d) => { if (!cancelled) setMetaMap(d.meta ?? {}); })
            .catch(() => { if (!cancelled) { setMetaMap({}); setError(true); } });
        fetch("/holdingsHistory.json", { cache: "no-cache" })
            .then((r) => r.ok ? r.json() : Promise.reject())
            .then((d) => { if (!cancelled) setPrices(d.prices ?? {}); })
            .catch(() => { /* sparkline just hides */ });
        fetch("/api/quotes")
            .then((r) => r.ok ? r.json() : Promise.reject())
            .then((d) => { if (!cancelled) setQuotes(d.quotes ?? {}); })
            .catch(() => { /* today's change just hides */ });
        return () => { cancelled = true; };
    }, []);

    const ticker = holding?.ticker ?? null;
    const meta: Meta = (ticker && metaMap?.[ticker]) || {};
    const st = meta.stats ?? {};
    const name = meta.name || holding?.name || ticker || "—";
    const assetType = meta.type || (holding?.type ? holding.type.toUpperCase() : null);
    const today = ticker ? quotes[ticker] : undefined;
    const hasRange = meta.week52Low != null && meta.week52High != null && meta.week52High > meta.week52Low;
    const pos = hasRange && meta.price != null
        ? Math.max(0, Math.min(100, ((meta.price - meta.week52Low!) / (meta.week52High! - meta.week52Low!)) * 100))
        : null;

    // Ordered facts; only those present render. Returns are sign-colored.
    const pct = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;
    const facts: { label: string; value: string; cls?: string }[] = [];
    if (meta.exchange) facts.push({ label: "Exchange", value: meta.exchange });
    if (meta.industry) facts.push({ label: "Industry", value: meta.industry });
    if (fmtCap(meta.marketCap)) facts.push({ label: "Market cap", value: fmtCap(meta.marketCap)! });
    if (st.pe != null) facts.push({ label: "P/E", value: st.pe.toFixed(1) });
    if (st.divYield != null) facts.push({ label: "Dividend yield", value: `${st.divYield.toFixed(2)}%` });
    if (st.beta != null) facts.push({ label: "Beta", value: st.beta.toFixed(2) });
    if (st.roe != null) facts.push({ label: "ROE", value: `${st.roe.toFixed(1)}%` });
    if (st.profitMargin != null) facts.push({ label: "Profit margin", value: `${st.profitMargin.toFixed(1)}%` });
    if (st.revGrowth != null) facts.push({ label: "Revenue growth", value: pct(st.revGrowth), cls: st.revGrowth >= 0 ? "text-success" : "text-error" });
    if (st.return52w != null) facts.push({ label: "1Y return", value: pct(st.return52w), cls: st.return52w >= 0 ? "text-success" : "text-error" });
    if (st.return26w != null) facts.push({ label: "6M return", value: pct(st.return26w), cls: st.return26w >= 0 ? "text-success" : "text-error" });
    if (st.volatility != null) facts.push({ label: "Volatility (3M)", value: `${st.volatility.toFixed(1)}%` });
    if (meta.ipo) facts.push({ label: "IPO", value: meta.ipo });
    facts.push({ label: "Portfolio weight", value: `${(holding?.weightPct ?? 0).toFixed(1)}%` });
    if (holding?.returnPct != null) facts.push({ label: "Total return", value: pct(holding.returnPct), cls: holding.returnPct >= 0 ? "text-success" : "text-error" });

    return (
        <div className="bg-base-100 border border-base-300 rounded-2xl p-6 h-full flex flex-col">
            {!holding ? (
                <div className="flex-1 flex items-center justify-center text-sm text-base-content/40 text-center">
                    {metaMap ? "Click any holding to view its details." : "Loading…"}
                </div>
            ) : (
                <>
                    <div className="always-scrollbar flex-1 min-h-0 overflow-y-scroll pr-1 space-y-5">
                        {/* Header */}
                        <div className="flex items-center gap-3">
                            {meta.logo ? (
                                <img src={meta.logo} alt="" className="w-11 h-11 rounded-lg object-contain bg-base-200 p-1" onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} />
                            ) : (
                                <div className="w-11 h-11 rounded-lg bg-base-200 flex items-center justify-center text-base font-bold text-base-content/60">{(ticker || "?").slice(0, 2)}</div>
                            )}
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg font-bold text-base-content">{ticker ?? "—"}</span>
                                    {assetType && <span className="badge badge-sm badge-ghost">{assetType}</span>}
                                </div>
                                <p className="text-sm text-base-content/60 truncate">{name}</p>
                            </div>
                            {meta.price != null && (
                                <div className="text-right shrink-0">
                                    <div className="font-semibold text-base-content">${meta.price.toFixed(2)}</div>
                                    {typeof today === "number" && (
                                        <div className={`text-xs font-medium ${today >= 0 ? "text-success" : "text-error"}`}>
                                            {today > 0 ? "+" : ""}{today.toFixed(2)}% today
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Sparkline */}
                        <Sparkline series={ticker ? prices[ticker] : undefined} />

                        {/* Facts */}
                        <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                            {facts.map((f) => <Fact key={f.label} label={f.label} value={f.value} valueClass={f.cls} />)}
                        </div>

                        {/* 52-week range */}
                        {hasRange && (
                            <div>
                                <div className="flex justify-between text-xs text-base-content/50 mb-1.5">
                                    <span>52-week range</span>
                                </div>
                                <div className="relative h-1.5 rounded-full bg-base-300">
                                    {pos != null && <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary border-2 border-base-100 shadow" style={{ left: `calc(${pos}% - 6px)` }} />}
                                </div>
                                <div className="flex justify-between text-[11px] text-base-content/40 mt-1">
                                    <span>${meta.week52Low!.toFixed(2)}</span>
                                    <span>${meta.week52High!.toFixed(2)}</span>
                                </div>
                            </div>
                        )}

                        {/* Analyst sentiment */}
                        {meta.analysts && <SentimentBar a={meta.analysts} />}

                        {/* Website */}
                        {meta.website && (
                            <a href={meta.website} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline w-fit">Visit website ↗</a>
                        )}
                    </div>

                    {/* Hint */}
                    <p className="text-[11px] text-base-content/40 pt-4 shrink-0">
                        Click any holding to switch.{error ? " · live metadata unavailable, showing basics" : ""}
                    </p>
                </>
            )}
        </div>
    );
};
