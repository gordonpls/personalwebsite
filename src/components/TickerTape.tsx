// Wall Street–style scrolling ticker tape. Always dark (a tape is an LED board,
// not a themed surface), monospace, green ▲ / red ▼, pauses on hover.
//
// Seamless loop: one copy of the list is measured, the track repeats it enough
// times to always overfill the strip, and the animation shifts by exactly one
// copy's measured width, then wraps. Copy 2 then sits where copy 1 started, so
// the wrap is invisible however short the list or wide the screen. Spacing
// lives inside each item (no track padding or flex gap) so copies are
// identical in width.

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cachedJson } from "../services/apiCache";
import { marketStatus } from "../utils/marketHours";
import type { Holding } from "./Holdings";

export interface TapeItem { symbol: string; price: number | null; change: number | null }

const UP = "#34d399";
const SPEED = 55; // px per second, constant regardless of list length
const DOWN = "#f87171";

const Item = ({ item, redacted }: { item: TapeItem; redacted: boolean }) => {
    const up = (item.change ?? 0) >= 0;
    const color = item.change == null ? "rgba(255,255,255,0.6)" : up ? UP : DOWN;
    const hide = redacted ? "blur-[5px] select-none" : "";
    return (
        <span className="flex shrink-0 items-center gap-2.5 whitespace-nowrap pl-6 font-mono text-[13px] tabular-nums">
            <span className="font-bold tracking-wide text-white">{item.symbol}</span>
            {item.price != null && <span className={`text-white/75 ${hide}`}>{item.price.toFixed(2)}</span>}
            {item.change != null && (
                <span className={`flex items-center gap-1 font-semibold ${hide}`} style={{ color, textShadow: `0 0 10px ${color}55` }}>
                    <span className="text-[10px]" aria-hidden="true">{up ? "▲" : "▼"}</span>
                    {Math.abs(item.change).toFixed(2)}%
                </span>
            )}
            <span className="pl-4 text-white/20" aria-hidden="true">•</span>
        </span>
    );
};

// `label` names the tape for screen readers; the visible badge is NYSE status.
export const TickerTape = ({ items, label = "Markets", redacted = false, className = "" }: {
    items: TapeItem[];
    label?: string;
    redacted?: boolean;
    className?: string;
}) => {
    // Re-check every 30s so the countdown and open/closed flip stay current.
    const [market, setMarket] = useState(() => marketStatus());
    useEffect(() => {
        const id = setInterval(() => setMarket(marketStatus()), 30_000);
        return () => clearInterval(id);
    }, []);

    const viewRef = useRef<HTMLDivElement>(null);
    const unitRef = useRef<HTMLDivElement>(null);
    const [unitWidth, setUnitWidth] = useState(0);
    const [copies, setCopies] = useState(2);

    // Re-measure whenever the list or the strip's width changes.
    useLayoutEffect(() => {
        const view = viewRef.current, unit = unitRef.current;
        if (!view || !unit) return;
        const measure = () => {
            const w = unit.getBoundingClientRect().width; // fractional, so no rounding drift
            if (!w) return;
            setUnitWidth(w);
            setCopies(Math.max(2, Math.ceil(view.clientWidth / w) + 1));
        };
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(view);
        ro.observe(unit);
        return () => ro.disconnect();
    }, [items]);

    if (!items.length) return null;
    const style = {
        "--ticker-shift": `-${unitWidth}px`,
        "--ticker-duration": `${unitWidth / SPEED}s`,
    } as React.CSSProperties;

    return (
        <div className={`ticker-tape flex h-9 items-stretch overflow-hidden bg-[#0a0e13] ${className}`} role="marquee" aria-label={`${label} ticker, NYSE ${market.open ? "open" : "closed"}${market.detail ? `, ${market.detail}` : ""}`}>
            {/* Market status: amber + pulsing while NYSE is open, muted when closed. */}
            <div className={`z-10 flex shrink-0 items-center gap-2 px-3 font-mono text-[11px] font-bold uppercase tracking-[0.2em] ${market.open ? "bg-[#f5a524] text-black" : "bg-[#1c232c] text-white/70"}`}>
                <span className="relative flex h-1.5 w-1.5">
                    {market.open && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-black/60" />}
                    <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${market.open ? "bg-black" : "bg-white/50"}`} />
                </span>
                NYSE {market.open ? "Open" : "Closed"}
            </div>
            {market.detail && (
                <div className="z-10 hidden shrink-0 items-center border-r border-white/10 bg-[#11171e] px-3 font-mono text-[11px] text-white/60 sm:flex">
                    {market.detail}
                </div>
            )}
            <div ref={viewRef} className="ticker-viewport relative flex-1 overflow-hidden">
                {/* Animation starts only once a copy has been measured. */}
                <div className={`flex h-full w-max items-center ${unitWidth ? "ticker-track" : ""}`} style={style}>
                    {Array.from({ length: copies }, (_, c) => (
                        // Copies after the first are decorative; hidden from screen readers.
                        <div key={c} ref={c === 0 ? unitRef : undefined} aria-hidden={c > 0 || undefined} className="flex shrink-0 items-center">
                            {items.map((it) => <Item key={it.symbol} item={it} redacted={redacted} />)}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// Live tape of the actual holdings, largest positions first.
export const LiveTickerTape = ({ className = "" }: { className?: string }) => {
    const [items, setItems] = useState<TapeItem[]>([]);
    useEffect(() => {
        let cancelled = false;
        Promise.all([
            cachedJson<{ holdings: Holding[] }>("/api/holdings"),
            cachedJson<{ quotes: Record<string, number>; prices?: Record<string, number> }>("/api/quotes"),
        ]).then(([h, q]) => {
            if (cancelled) return;
            const seen = new Set<string>();
            const list: TapeItem[] = [];
            for (const x of [...h.holdings].sort((a, b) => b.weightPct - a.weightPct)) {
                if (!x.ticker || seen.has(x.ticker) || q.quotes[x.ticker] == null) continue;
                seen.add(x.ticker);
                list.push({ symbol: x.ticker, price: q.prices?.[x.ticker] ?? null, change: q.quotes[x.ticker] });
            }
            setItems(list);
        }).catch(() => { /* no tape is fine */ });
        return () => { cancelled = true; };
    }, []);
    return <TickerTape items={items} label="Holdings" className={className} />;
};
