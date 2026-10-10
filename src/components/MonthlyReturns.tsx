// Monthly returns calendar: years down, months across, shaded by size, with
// the year total beside the S&P 500 for the same window. Each year uses the
// Performance chart's method, so the current year's total equals the chart's
// YTD figure, and each row's months compound exactly to its total.

import { useEffect, useMemo, useState } from "react";
import { cachedJson } from "../services/apiCache";
import { calendarYears, type PriceMap, type YearReturns } from "../utils/portfolioMath";
import { PortfolioScopePill } from "./PortfolioScopePill";
import type { Holding } from "./Holdings";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const FULL_AT = 8; // a ±8% month gets the strongest shade

const fmt = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}`;

// Tint strength scales with magnitude, so big months read at a glance.
function cellStyle(v: number | null, fullAt = FULL_AT): React.CSSProperties | undefined {
    if (v == null) return undefined;
    const strength = Math.min(1, Math.abs(v) / fullAt);
    const color = v >= 0 ? "var(--color-success)" : "var(--color-error)";
    return { background: `color-mix(in oklch, ${color} ${Math.round(12 + strength * 58)}%, transparent)` };
}

// Shared data hook, also used by the drawdown chart.
export function useCalendarYears(portfolio?: string) {
    const [holdings, setHoldings] = useState<Holding[] | null>(null);
    const [prices, setPrices] = useState<PriceMap | null>(null);
    const [error, setError] = useState(false);
    useEffect(() => {
        let cancelled = false;
        cachedJson<{ holdings: Holding[] }>("/api/holdings").then((d) => { if (!cancelled) setHoldings(d.holdings ?? []); }).catch(() => { if (!cancelled) setError(true); });
        cachedJson<{ prices: PriceMap }>("/api/finance/history").then((d) => { if (!cancelled) setPrices(d.prices ?? {}); }).catch(() => { if (!cancelled) setError(true); });
        return () => { cancelled = true; };
    }, []);
    const years = useMemo<YearReturns[] | null>(() => {
        if (!holdings || !prices) return null;
        const scoped = portfolio ? holdings.filter((h) => h.portfolio === portfolio) : holdings;
        return calendarYears(scoped, prices);
    }, [holdings, prices, portfolio]);
    return { years, prices, error };
}

export const MonthlyReturns = ({ portfolio, scopeLabel, onScopeChange, scopeOptions }: {
    portfolio?: string;
    scopeLabel?: string;
    onScopeChange?: (next: string) => void;
    scopeOptions?: readonly string[];
}) => {
    const { years, error } = useCalendarYears(portfolio);
    const rows = years ? [...years].reverse() : [];
    const beat = rows.filter((y) => y.total != null && y.benchmark != null && y.total > y.benchmark).length;
    const compared = rows.filter((y) => y.total != null && y.benchmark != null).length;

    return (
        <div className="rounded-2xl border border-base-300 bg-base-100 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-bold text-base-content">Monthly returns</h3>
                    {scopeLabel && onScopeChange && scopeOptions && (
                        <PortfolioScopePill current={scopeLabel} onChange={onScopeChange} options={scopeOptions} align="start" />
                    )}
                </div>
                {compared > 0 && (
                    <p className="text-sm text-base-content/70">
                        Beat the S&amp;P 500 in <span className="font-semibold text-base-content">{beat} of {compared}</span> calendar years
                    </p>
                )}
            </div>

            {error ? (
                <p className="mt-6 text-sm text-base-content/60">Unavailable.</p>
            ) : !years ? (
                <div className="mt-5 h-48 animate-pulse rounded-xl bg-base-200" />
            ) : (
                // Scrolls sideways on narrow screens, with the year column pinned.
                <div className="mt-5 overflow-x-auto">
                    <table className="w-full min-w-[46rem] border-separate border-spacing-1 text-center text-xs tabular-nums">
                        <thead>
                            <tr className="text-[11px] font-medium text-base-content/60">
                                <th className="sticky left-0 z-10 bg-base-100 pr-2 text-left font-medium">Year</th>
                                {MONTHS.map((m) => <th key={m} className="font-medium">{m}</th>)}
                                <th className="pl-2 font-semibold text-base-content/80">Year</th>
                                <th className="font-medium">S&amp;P</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((y) => {
                                const ahead = y.total != null && y.benchmark != null ? y.total - y.benchmark : null;
                                return (
                                    <tr key={y.year}>
                                        <th scope="row" className="sticky left-0 z-10 bg-base-100 pr-2 text-left text-sm font-semibold text-base-content">{y.year}</th>
                                        {y.months.map((v, i) => (
                                            <td key={i} className="h-9 rounded-md text-base-content" style={cellStyle(v)}
                                                title={v != null ? `${MONTHS[i]} ${y.year}: ${fmt(v)}%` : undefined}>
                                                {v != null ? fmt(v) : <span className="text-base-content/20">·</span>}
                                            </td>
                                        ))}
                                        <td className="rounded-md pl-2 text-sm font-bold text-base-content" style={cellStyle(y.total, FULL_AT * 3)}>
                                            {y.total != null ? `${fmt(y.total)}%` : "—"}
                                        </td>
                                        <td className="text-base-content/70" title={ahead != null ? `${ahead >= 0 ? "Ahead of" : "Behind"} the S&P 500 by ${Math.abs(ahead).toFixed(1)} pts` : undefined}>
                                            {y.benchmark != null ? `${fmt(y.benchmark)}%` : "—"}
                                            {ahead != null && <span className={`ml-1 ${ahead >= 0 ? "text-success" : "text-error"}`}>{ahead >= 0 ? "▲" : "▼"}</span>}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <p className="mt-3 text-[11px] leading-snug text-base-content/60">
                Each year blends today's holdings by current weight, the same method as the Performance chart, so months compound to the year total. The first year starts when price history begins.
            </p>
        </div>
    );
};
