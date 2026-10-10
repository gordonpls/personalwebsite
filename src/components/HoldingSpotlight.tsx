// "Holding of the day": one position featured beside the performance chart.
// Same pick for every visitor all day (seeded by the date), rotating at
// midnight, drawn from the 20 largest positions that have price history.

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { HoldingLogo, type LogoMeta } from "./HoldingLogo";
import type { Holding } from "./Holdings";
import { cachedJson } from "../services/apiCache";

interface Meta extends LogoMeta { industry?: string }
type Series = Record<string, number>; // "YYYY-MM-DD" → close

const pct = (n: number, digits = 1) => `${n >= 0 ? "+" : ""}${n.toFixed(digits)}%`;
const tone = (n: number | null | undefined) => (n == null ? "text-base-content" : n >= 0 ? "text-success" : "text-error");

function pickOfTheDay(holdings: Holding[], prices: Record<string, Series>): Holding | null {
    const seen = new Set<string>();
    const pool = [...holdings]
        .sort((a, b) => b.weightPct - a.weightPct)
        .filter((h) => h.ticker && prices[h.ticker] && !seen.has(h.ticker) && seen.add(h.ticker))
        .slice(0, 20);
    if (!pool.length) return null;
    let hash = 0;
    for (const c of new Date().toISOString().slice(0, 10)) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
    return pool[hash % pool.length];
}

const Spark = ({ series }: { series: number[] }) => {
    if (series.length < 2) return null;
    // Honest scale: the y-range is at least ±10% of the mean price, so a 2%
    // wiggle doesn't get stretched into a dramatic cliff.
    const lo = Math.min(...series), hi = Math.max(...series);
    const mid = (lo + hi) / 2;
    const span = Math.max(hi - lo, mid * 0.2);
    const min = mid - span / 2;
    const pts = series.map((v, i) => [(i / (series.length - 1)) * 300, 96 - ((v - min) / span) * 88]);
    const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
    const color = series[series.length - 1] >= series[0] ? "var(--color-success)" : "var(--color-error)";
    return (
        <svg viewBox="0 0 300 100" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
            <defs>
                <linearGradient id="spotlightFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0" stopColor={color} stopOpacity="0.28" />
                    <stop offset="1" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <path d={`${line} L300 100 L0 100 Z`} fill="url(#spotlightFill)" />
            <path d={line} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        </svg>
    );
};

export const HoldingSpotlight = ({ onView }: { onView?: (h: Holding) => void }) => {
    const [holdings, setHoldings] = useState<Holding[] | null>(null);
    const [quotes, setQuotes] = useState<Record<string, number>>({});
    const [meta, setMeta] = useState<Record<string, Meta>>({});
    const [prices, setPrices] = useState<Record<string, Series>>({});

    useEffect(() => {
        let cancelled = false;
        cachedJson<{ holdings: Holding[] }>("/api/holdings").then((d) => { if (!cancelled) setHoldings(d.holdings ?? []); }).catch(() => { if (!cancelled) setHoldings([]); });
        cachedJson<{ quotes: Record<string, number> }>("/api/quotes").then((d) => { if (!cancelled) setQuotes(d.quotes ?? {}); }).catch(() => {});
        cachedJson<{ meta: Record<string, any> }>("/api/finance/meta").then((d) => { if (!cancelled) setMeta(d.meta ?? {}); }).catch(() => {});
        cachedJson<{ prices: Record<string, Record<string, number>> }>("/api/finance/history").then((d) => { if (!cancelled) setPrices(d.prices ?? {}); }).catch(() => {});
        return () => { cancelled = true; };
    }, []);

    const pick = useMemo(() => (holdings ? pickOfTheDay(holdings, prices) : null), [holdings, prices]);
    const series = useMemo(() => {
        if (!pick?.ticker || !prices[pick.ticker]) return [];
        return Object.entries(prices[pick.ticker]).sort(([a], [b]) => a.localeCompare(b)).slice(-26).map(([, v]) => v); // ~6 months of weekly closes
    }, [pick, prices]);

    const shell = "relative flex h-full flex-col overflow-hidden rounded-2xl border border-base-300 bg-base-100 p-5";
    if (!pick?.ticker) {
        return <div className={shell}><div className="h-full min-h-[18rem] animate-pulse rounded-xl bg-base-200" /></div>;
    }

    const m = meta[pick.ticker];
    const sixMonth = series.length > 1 ? (series[series.length - 1] / series[0] - 1) * 100 : null;
    const today = quotes[pick.ticker];

    return (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className={shell}>
            <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-warning/15 blur-3xl" />

            <div className="relative flex items-center justify-between">
                <span className="badge badge-sm border-none bg-warning/20 font-semibold text-warning">★ Holding of the day</span>
                <span className="text-[11px] text-base-content/60">Rotates daily</span>
            </div>

            <div className="relative mt-4 flex items-center gap-3">
                <HoldingLogo ticker={pick.ticker} meta={m} className="h-12 w-12 rounded-xl" fallbackTextClass="text-sm" />
                <div className="min-w-0">
                    <p className="text-2xl font-bold leading-tight tracking-tight text-base-content">{pick.ticker}</p>
                    <p className="truncate text-sm text-base-content/70">{m?.name ?? pick.name}</p>
                </div>
            </div>

            <div className="relative mt-4 flex items-baseline justify-between text-xs">
                <span className="text-base-content/60">{m?.industry ?? "Last 6 months"}</span>
                {sixMonth != null && <span className={`font-semibold ${tone(sixMonth)}`}>{pct(sixMonth)} · 6M</span>}
            </div>
            <div className="relative mt-1 min-h-[6rem] flex-1">
                <Spark series={series} />
            </div>

            <dl className="relative mt-4 grid grid-cols-3 gap-2">
                {[
                    { k: "Weight", v: `${pick.weightPct.toFixed(1)}%`, t: "text-base-content" },
                    { k: "Since buy", v: pick.returnPct != null ? pct(pick.returnPct) : "—", t: tone(pick.returnPct) },
                    { k: "Today", v: today != null ? pct(today, 2) : "—", t: tone(today) },
                ].map((s) => (
                    <div key={s.k} className="rounded-xl bg-base-200 px-3 py-2">
                        <dt className="text-[11px] text-base-content/60">{s.k}</dt>
                        <dd className={`text-base font-bold tabular-nums ${s.t}`}>{s.v}</dd>
                    </div>
                ))}
            </dl>

            {onView && (
                <button type="button" onClick={() => onView(pick)} className="btn btn-ghost btn-sm relative mt-3 justify-between text-primary">
                    View details
                    <span aria-hidden="true">→</span>
                </button>
            )}
        </motion.div>
    );
};
