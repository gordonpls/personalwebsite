// "What drove returns": which positions added the most to, and held back, the
// portfolio's return over a range. Contribution = weight × return, in
// percentage points, so the rows sum to the Performance chart's figure for the
// same range and scope.

import { useEffect, useMemo, useState } from "react";
import { cachedJson } from "../services/apiCache";
import { contributions, type PriceMap, type Range } from "../utils/portfolioMath";
import { HoldingLogo, type LogoMeta } from "./HoldingLogo";
import { PortfolioScopePill } from "./PortfolioScopePill";
import type { Holding } from "./Holdings";

const RANGES: Range[] = ["1M", "3M", "YTD", "1Y"];
const RANGE_LABEL: Partial<Record<Range, string>> = { "1M": "past month", "3M": "past 3 months", YTD: "year to date", "1Y": "past year" };
const ROWS = 5;

const pts = (n: number) => `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(2)} pts`;

export const ReturnDrivers = ({ portfolio, scopeLabel, onScopeChange, scopeOptions }: {
    portfolio?: string;
    scopeLabel?: string;
    onScopeChange?: (next: string) => void;
    scopeOptions?: readonly string[];
}) => {
    const [holdings, setHoldings] = useState<Holding[] | null>(null);
    const [prices, setPrices] = useState<PriceMap | null>(null);
    const [meta, setMeta] = useState<Record<string, LogoMeta>>({});
    const [error, setError] = useState(false);
    const [range, setRange] = useState<Range>("YTD");

    useEffect(() => {
        let cancelled = false;
        cachedJson<{ holdings: Holding[] }>("/api/holdings").then((d) => { if (!cancelled) setHoldings(d.holdings ?? []); }).catch(() => { if (!cancelled) setError(true); });
        cachedJson<{ prices: PriceMap }>("/api/finance/history").then((d) => { if (!cancelled) setPrices(d.prices ?? {}); }).catch(() => { if (!cancelled) setError(true); });
        cachedJson<{ meta: Record<string, LogoMeta> }>("/api/finance/meta").then((d) => { if (!cancelled) setMeta(d.meta ?? {}); }).catch(() => {});
        return () => { cancelled = true; };
    }, []);

    const result = useMemo(() => {
        if (!holdings || !prices) return null;
        const scoped = portfolio ? holdings.filter((h) => h.portfolio === portfolio) : holdings;
        // A ticker held in several portfolios is one position here (same total).
        const byTicker = new Map<string, { ticker: string; weightPct: number }>();
        for (const h of scoped) {
            if (!h.ticker) continue;
            const cur = byTicker.get(h.ticker);
            if (cur) cur.weightPct += h.weightPct;
            else byTicker.set(h.ticker, { ticker: h.ticker, weightPct: h.weightPct });
        }
        return contributions([...byTicker.values()], prices, range);
    }, [holdings, prices, portfolio, range]);

    const sorted = result ? [...result.items].sort((a, b) => b.pts - a.pts) : [];
    const top = sorted.slice(0, ROWS).filter((c) => c.pts > 0);
    const bottom = sorted.slice(-ROWS).reverse().filter((c) => c.pts < 0);
    const maxAbs = Math.max(0.01, ...[...top, ...bottom].map((c) => Math.abs(c.pts)));
    const topShare = result && result.total !== 0 ? (top.reduce((s, c) => s + c.pts, 0) / result.total) * 100 : null;

    const Row = ({ c }: { c: (typeof sorted)[number] }) => {
        const up = c.pts >= 0;
        return (
            <li className="grid grid-cols-[1.75rem_3.5rem_1fr_4.75rem] items-center gap-2" title={`${c.ticker}: ${c.returnPct >= 0 ? "+" : ""}${c.returnPct.toFixed(1)}% return × ${c.weightPct.toFixed(1)}% weight`}>
                <HoldingLogo ticker={c.ticker} meta={meta[c.ticker]} className="size-7 rounded-md" />
                <span className="truncate text-sm font-semibold text-base-content">{c.ticker}</span>
                <div className="h-2 rounded-full bg-base-200">
                    <div className={`h-full rounded-full ${up ? "bg-success" : "bg-error"}`} style={{ width: `${(Math.abs(c.pts) / maxAbs) * 100}%` }} />
                </div>
                <span className={`text-right text-xs font-semibold tabular-nums ${up ? "text-success" : "text-error"}`}>{pts(c.pts)}</span>
            </li>
        );
    };

    return (
        <div className="flex h-full flex-col rounded-2xl border border-base-300 bg-base-100 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-bold text-base-content">What drove returns</h3>
                    {scopeLabel && onScopeChange && scopeOptions && (
                        <PortfolioScopePill current={scopeLabel} onChange={onScopeChange} options={scopeOptions} align="start" />
                    )}
                </div>
                <div className="flex gap-0.5">
                    {RANGES.map((r) => (
                        <button
                            key={r}
                            type="button"
                            onClick={() => setRange(r)}
                            aria-pressed={range === r}
                            className={`btn btn-xs border-none ${range === r ? "bg-base-300 text-base-content" : "btn-ghost text-base-content/60"}`}
                        >
                            {r}
                        </button>
                    ))}
                </div>
            </div>

            {error ? (
                <p className="mt-6 text-sm text-base-content/60">Unavailable.</p>
            ) : !result ? (
                <div className="mt-6 flex-1 animate-pulse rounded-xl bg-base-200" />
            ) : (
                <>
                    <p className="mt-1 text-sm text-base-content/70">
                        <span className={`font-semibold ${result.total >= 0 ? "text-success" : "text-error"}`}>
                            {result.total >= 0 ? "+" : ""}{result.total.toFixed(2)}%
                        </span>{" "}
                        {RANGE_LABEL[range]}
                        {topShare != null && top.length > 0 && result.total > 0 && (
                            <> · top {top.length} gave {Math.round(topShare)}% of it</>
                        )}
                    </p>

                    <div className="mt-5 flex flex-1 flex-col gap-5">
                        <section>
                            <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-base-content/60">Added the most</h4>
                            {top.length ? <ul className="space-y-2">{top.map((c) => <Row key={c.ticker} c={c} />)}</ul>
                                : <p className="text-xs text-base-content/60">Nothing gained over this range.</p>}
                        </section>
                        <section>
                            <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-base-content/60">Held back</h4>
                            {bottom.length ? <ul className="space-y-2">{bottom.map((c) => <Row key={c.ticker} c={c} />)}</ul>
                                : <p className="text-xs text-base-content/60">No position lost ground over this range.</p>}
                        </section>
                    </div>

                    <p className="mt-4 text-[11px] leading-snug text-base-content/60">
                        Contribution = current weight × price return over the range, in percentage points. Rows add up to the Performance chart's figure.
                        {result.coveragePct < 98 && ` Covers ${result.coveragePct}% of holdings by weight.`}
                    </p>
                </>
            )}
        </div>
    );
};
