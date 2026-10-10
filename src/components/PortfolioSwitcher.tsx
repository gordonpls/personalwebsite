// Portfolio switcher: the dashboard's main control, centered under the title.
// Each portfolio is a card with an icon, a plain-English line about what it
// holds, and its share of the whole (with a bar), so it reads as "pick one of
// my portfolios" rather than a row of filter buttons. Works as a radio group:
// one selection, arrow keys move between cards.

import { useEffect, useMemo, useRef, useState } from "react";
import { cachedJson } from "../services/apiCache";
import type { Holding } from "./Holdings";

// `short` is the card's one-line description; `tiny` an optional shorter name
// for phones, where the name sits beside the icon.
export interface PortfolioOption { id: string; short: string; tiny?: string }

const icon = (id: string) => {
    const common = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true }; // size comes from the badge (smaller on phones)
    switch (id) {
        case "Core": // shield: the steady foundation
            return <svg {...common}><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" /></svg>;
        case "Tech & Speculation": // bolt: concentrated bets
            return <svg {...common}><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" /></svg>;
        case "Retirement": // hourglass: long horizon
            return <svg {...common}><path d="M6 3h12M6 21h12M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9s10 4 10 9" /></svg>;
        default: // stacked layers: everything together
            return <svg {...common}><path d="M12 3l9 5-9 5-9-5 9-5z" /><path d="M3 13l9 5 9-5" /></svg>;
    }
};

export const PortfolioSwitcher = ({ options, active, onChange, allId }: {
    options: PortfolioOption[];
    active: string;
    onChange: (id: string) => void;
    allId: string;
}) => {
    const [holdings, setHoldings] = useState<Holding[] | null>(null);
    useEffect(() => {
        let cancelled = false;
        cachedJson<{ holdings: Holding[] }>("/api/holdings").then((d) => { if (!cancelled) setHoldings(d.holdings ?? []); }).catch(() => {});
        return () => { cancelled = true; };
    }, []);

    // Share of the whole and position count per portfolio.
    const stats = useMemo(() => {
        const out = new Map<string, { share: number; count: number }>();
        if (!holdings) return out;
        const total = holdings.reduce((s, h) => s + h.weightPct, 0) || 1;
        for (const h of holdings) {
            const cur = out.get(h.portfolio) ?? { share: 0, count: 0 };
            cur.share += (h.weightPct / total) * 100; cur.count += 1;
            out.set(h.portfolio, cur);
        }
        out.set(allId, { share: 100, count: new Set(holdings.map((h) => h.ticker ?? h.name)).size });
        return out;
    }, [holdings, allId]);

    const refs = useRef<(HTMLButtonElement | null)[]>([]);
    const onKey = (e: React.KeyboardEvent, i: number) => {
        const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
        if (!step) return;
        e.preventDefault();
        const next = (i + step + options.length) % options.length;
        onChange(options[next].id);
        refs.current[next]?.focus();
    };

    return (
        <div className="mx-auto w-full max-w-4xl">
            <p id="portfolio-switcher-label" className="mb-2 text-center text-xs font-semibold uppercase tracking-widest text-base-content/60">
                Choose a portfolio
            </p>
            <div role="radiogroup" aria-labelledby="portfolio-switcher-label" className="grid grid-cols-2 gap-1.5 sm:gap-3 md:grid-cols-4">
                {options.map((o, i) => {
                    const on = active === o.id;
                    const st = stats.get(o.id);
                    return (
                        <button
                            key={o.id}
                            ref={(el) => { refs.current[i] = el; }}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            tabIndex={on ? 0 : -1}
                            onClick={() => onChange(o.id)}
                            onKeyDown={(e) => onKey(e, i)}
                            className={`group relative flex flex-col rounded-xl border px-2.5 py-2 text-left transition sm:rounded-2xl sm:p-4 ${on
                                ? "border-primary bg-primary/10 shadow-md ring-1 ring-primary/40"
                                : "border-base-300 bg-base-100 hover:border-base-content/30 hover:bg-base-200/60"}`}
                        >
                            {/* Phones: icon and name share one line and the description is
                                dropped (the line under the cards explains the pick). From
                                sm up: icon on top, then name, then description. */}
                            <div className="flex items-center justify-between gap-1.5">
                                <span className="flex min-w-0 items-center gap-2 sm:block">
                                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md sm:h-8 sm:w-8 sm:rounded-lg [&>svg]:h-3.5 [&>svg]:w-3.5 sm:[&>svg]:h-5 sm:[&>svg]:w-5 ${on ? "bg-primary text-primary-content" : "bg-base-200 text-base-content/70 group-hover:text-base-content"}`}>
                                        {icon(o.id)}
                                    </span>
                                    <span className="min-w-0 truncate text-[13px] font-bold leading-tight text-base-content sm:hidden" title={o.id}>{o.tiny ?? o.id}</span>
                                </span>
                                {on && (
                                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-primary sm:h-4 sm:w-4" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                                        <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                )}
                            </div>
                            <span className="mt-2 hidden text-sm font-bold leading-tight text-base-content sm:block">{o.id === allId ? "All portfolios" : o.id}</span>
                            <span className="mt-0.5 hidden text-xs leading-snug text-base-content/70 sm:block">{o.short}</span>
                            <span className="mt-1.5 flex items-baseline justify-between gap-1 text-[11px] tabular-nums sm:mt-3 sm:text-xs">
                                <span className={`whitespace-nowrap font-semibold ${on ? "text-primary" : "text-base-content"}`}>
                                    {st ? `${st.share.toFixed(0)}%` : "—"}
                                    <span className="hidden font-normal text-base-content/60 sm:inline"> of total</span>
                                </span>
                                {st && <span className="whitespace-nowrap text-base-content/60">{st.count} <span className="hidden sm:inline">{st.count === 1 ? "position" : "positions"}</span><span className="sm:hidden">pos.</span></span>}
                            </span>
                            <span className="mt-1 h-1 overflow-hidden rounded-full bg-base-300 sm:mt-1.5" aria-hidden="true">
                                <span className={`block h-full rounded-full transition-all duration-500 ${on ? "bg-primary" : "bg-base-content/30"}`} style={{ width: `${st?.share ?? 0}%` }} />
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
