// Risk vs return: every holding placed by its past-year return (up) and
// volatility (across), sized by weight, colored by today's move, with the
// S&P 500 as a crosshair splitting the chart into four plain-English
// quadrants. A plain, readable chart: no hover or clicks. Every bubble is
// labeled; crowded ones get their label pulled out with a leader line.
// Bubbles glide to their new spots when the portfolio scope changes.

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Holding } from "./Holdings";
import { PortfolioScopePill } from "./PortfolioScopePill";
import { cachedJson } from "../services/apiCache";
import { parseLocalDate, toLocalDateStr, yearStats, type PriceMap } from "../utils/portfolioMath";

// ── Data ─────────────────────────────────────────────────────────────────────

interface Stock {
    ticker: string;
    weightPct: number;
    today: number | null;   // today's % move, for the bubble color
    ret1y: number | null;   // price return over the past year
    vol: number | null;     // annualized volatility of weekly returns, past year
}
type Spy = { ret1y: number | null; vol: number | null };

function useStocks(portfolio?: string) {
    const [state, setState] = useState<{ stocks: Stock[]; spy: Spy } | null>(null);
    const [error, setError] = useState(false);
    useEffect(() => {
        let cancelled = false;
        Promise.all([
            cachedJson<{ holdings: Holding[] }>("/api/holdings"),
            cachedJson<{ quotes: Record<string, number> }>("/api/quotes").catch(() => ({ quotes: {} as Record<string, number> })),
            cachedJson<{ prices: PriceMap }>("/api/finance/history"),
        ]).then(([h, q, hist]) => {
            if (cancelled) return;
            const prices = hist.prices ?? {};
            let latest = "";
            for (const t in prices) for (const d in prices[t]) if (d > latest) latest = d;
            const c1y = parseLocalDate(latest); c1y.setFullYear(c1y.getFullYear() - 1);
            const cutoff1y = toLocalDateStr(c1y);

            // A ticker held in several portfolios (VXF in Core and Retirement)
            // is one bubble with their combined weight.
            const weights = new Map<string, number>();
            for (const x of h.holdings) {
                if (!x.ticker || (portfolio && x.portfolio !== portfolio)) continue;
                weights.set(x.ticker, (weights.get(x.ticker) ?? 0) + x.weightPct);
            }
            const stocks: Stock[] = [...weights].map(([ticker, weightPct]) => {
                const { ret1y, vol } = yearStats(prices[ticker], cutoff1y);
                return { ticker, weightPct, today: q.quotes?.[ticker] ?? null, ret1y, vol };
            });
            const spy = yearStats(prices.SPY, cutoff1y);
            setState({ stocks, spy: { ret1y: spy.ret1y, vol: spy.vol } });
        }).catch(() => { if (!cancelled) setError(true); });
        return () => { cancelled = true; };
    }, [portfolio]);
    return { data: state, error };
}

// ── Formatting ───────────────────────────────────────────────────────────────

const pct = (n: number | null | undefined, digits = 1) => (n == null ? "—" : `${n >= 0 ? "+" : ""}${n.toFixed(digits)}%`);

// ── Chart ────────────────────────────────────────────────────────────────────

// The chart is laid out at its real pixel width (measured), so text stays a
// true 11px whether the card is full width or half. Height follows width.
const PAD = { l: 52, r: 20, t: 48, b: 44 }; // tall top: room for pinned outliers
const MIN_W = 340, ASPECT = 0.62;
// Background-colored outline behind text so labels read over bubbles.
const HALO: React.CSSProperties = { paintOrder: "stroke", stroke: "var(--color-base-100)", strokeWidth: 3, strokeLinejoin: "round" };
const LABEL_PX = 11;                       // label font size, in px
const QUADRANTS = [
    { text: "Beat the S&P, less risk", top: true, right: false },
    { text: "Beat the S&P, more risk", top: true, right: true },
    { text: "Trailed, less risk", top: false, right: false },
    { text: "Trailed, more risk", top: false, right: true },
];
// Label width in viewBox units, measured in the page's own font (an average
// character width underestimates wide all-caps tickers like "AMZN").
let measureCtx: CanvasRenderingContext2D | null | undefined;
function textWidth(text: string, bold: boolean): number {
    if (measureCtx === undefined) {
        measureCtx = typeof document !== "undefined" ? document.createElement("canvas").getContext("2d") : null;
    }
    if (!measureCtx) return text.length * (bold ? 7 : 6.2);
    measureCtx.font = `${bold ? 700 : 400} ${LABEL_PX}px ${getComputedStyle(document.body).fontFamily}`;
    return measureCtx.measureText(text).width;
}

function niceRange(lo: number, hi: number, step: number) {
    return [Math.floor(lo / step) * step, Math.ceil(hi / step) * step];
}

interface Rect { x0: number; y0: number; x1: number; y1: number }
const overlaps = (a: Rect, b: Rect) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

interface Bubble { key: string; tickers: string[]; cx: number; cy: number; r: number; today: number | null; off: number | null }
interface Label {
    key: string; x: number; y: number; anchor: "start" | "middle" | "end"; text: string; inside: boolean; tone: string;
    leader?: { x1: number; y1: number; x2: number; y2: number }; // pulled-out label for a crowded bubble
}

const BubbleMap = ({ stocks, spy }: { stocks: Stock[]; spy: Spy }) => {
    const plotted = useMemo(() => stocks.filter((s) => s.ret1y != null && s.vol != null), [stocks]);

    const wrapRef = useRef<HTMLDivElement>(null);
    const [W, setW] = useState(800);
    useEffect(() => {
        const el = wrapRef.current;
        if (!el) return;
        const ro = new ResizeObserver(([e]) => setW(Math.max(MIN_W, Math.round(e.contentRect.width))));
        ro.observe(el);
        return () => ro.disconnect();
    }, []);
    const H = Math.round(Math.max(300, W * ASPECT));

    const scale = useMemo(() => {
        const vols = plotted.map((s) => s.vol!).concat(spy.vol ?? []);
        const rets = plotted.map((s) => s.ret1y!).concat(spy.ret1y ?? [], 0);
        // Cap the axis at the bulk of the data (90th percentile, with room) so a
        // couple of moonshots don't squash everyone else; they're pinned to the
        // top edge and labeled with their real return instead.
        const sorted = [...rets].sort((a, b) => a - b);
        const p90 = sorted[Math.floor(sorted.length * 0.9)] ?? 0;
        const top = Math.min(Math.max(...rets), Math.max(p90 * 1.25, (spy.ret1y ?? 0) + 25, 25));
        const [x0, x1] = niceRange(0, Math.max(...vols, 10), 10);
        const [y0, y1] = niceRange(Math.min(...rets), top, 25);
        const maxW = Math.max(...plotted.map((s) => s.weightPct), 1);
        return {
            x: (v: number) => PAD.l + ((v - x0) / (x1 - x0)) * (W - PAD.l - PAD.r),
            y: (v: number) => PAD.t + (1 - (v - y0) / (y1 - y0)) * (H - PAD.t - PAD.b),
            // area ∝ weight; the largest bubble scales a little with the chart
            r: (w: number) => 4 + Math.sqrt(w / maxW) * Math.min(24, W / 34),
            xTicks: Array.from({ length: (x1 - x0) / 10 + 1 }, (_, i) => x0 + i * 10),
            yTicks: Array.from({ length: (y1 - y0) / 25 + 1 }, (_, i) => y0 + i * 25),
            yMax: y1,
        };
    }, [plotted, spy, W, H]);
    const { x, y, xTicks, yTicks } = scale;

    // Holdings with practically the same risk and return (IVV, VTI and VOO all
    // track broad US stocks) become one bubble with a shared label. Decided on
    // the data, not on-screen distance, so a small screen never merges two
    // genuinely different holdings.
    const bubbles = useMemo<Bubble[]>(() => {
        const SAME = 0.5; // percentage points, on both axes
        const out: (Bubble & { w: number; vol: number; ret: number })[] = [];
        for (const s of [...plotted].sort((a, b) => b.weightPct - a.weightPct)) {
            const twin = out.find((b) => Math.abs(b.vol - s.vol!) < SAME && Math.abs(b.ret - s.ret1y!) < SAME);
            if (twin) { twin.tickers.push(s.ticker); twin.w += s.weightPct; twin.r = scale.r(twin.w); continue; }
            out.push({
                key: s.ticker, tickers: [s.ticker], vol: s.vol!, ret: s.ret1y!, w: s.weightPct,
                cx: x(s.vol!), cy: y(Math.min(s.ret1y!, scale.yMax)), r: scale.r(s.weightPct),
                today: s.today, off: s.ret1y! > scale.yMax ? s.ret1y! : null,
            });
        }
        return out;
    }, [plotted, scale, x, y]);

    // Greedy label placement, biggest bubbles first: try inside, then the
    // sides, then the diagonals; take the first spot that stays on the plot
    // and doesn't collide with a label already placed or read as belonging to
    // another bubble. Bubbles too crowded to label in place get a label pulled
    // outward with a leader line.
    const labels = useMemo<Label[]>(() => {
        const placed: Rect[] = [];
        const out: Label[] = [];
        // The S&P marker's label and the four corner captions are fixed; keep
        // bubble labels off them.
        if (spy.vol != null && spy.ret1y != null) {
            const sx = x(spy.vol), sy = y(spy.ret1y);
            placed.push({ x0: sx - 62, y0: sy - 20, x1: sx - 8, y1: sy - 6 });
            for (const c of QUADRANTS) {
                const w = textWidth(c.text, false);
                const cx = c.right ? W - PAD.r - 6 - w : PAD.l + 6;
                const cy = c.top ? PAD.t + 12 : H - PAD.b - 8;
                placed.push({ x0: cx - 2, y0: cy - 11, x1: cx + w + 2, y1: cy + 3 });
            }
        }
        // A rect sits on a bubble if the circle's centre is within r of the
        // rect's nearest point.
        const coversBubble = (rect: Rect, o: Bubble) =>
            Math.hypot(o.cx - Math.max(rect.x0, Math.min(o.cx, rect.x1)), o.cy - Math.max(rect.y0, Math.min(o.cy, rect.y1))) < o.r;
        const rectFor = (x: number, y: number, anchor: Label["anchor"], w: number, h: number): Rect => {
            const x0 = anchor === "start" ? x : anchor === "end" ? x - w : x - w / 2;
            return { x0: x0 - 1, y0: y - h + 2, x1: x0 + w + 1, y1: y + 3 };
        };
        const onPlot = (r: Rect) => r.x0 >= PAD.l && r.x1 <= W - PAD.r + 4 && r.y0 >= 4 && r.y1 <= H - PAD.b;

        for (const b of [...bubbles].sort((a, c) => c.r - a.r)) {
            const text = b.tickers.join(" · ") + (b.off != null ? ` ▲${b.off >= 0 ? "+" : ""}${b.off.toFixed(0)}%` : "");
            const w = textWidth(text, true), h = LABEL_PX + 2, gap = 3;
            const tone = b.off != null ? (b.today != null && b.today < 0 ? "var(--color-error)" : "var(--color-success)") : "currentColor";
            const others = bubbles.filter((o) => o !== b);
            // "Too clustered": overlapping two or more neighbours.
            const neighbours = others.filter((o) => Math.hypot(o.cx - b.cx, o.cy - b.cy) < o.r + b.r + 2);
            const clustered = neighbours.length >= 2;

            const near: Omit<Label, "key" | "text" | "tone">[] = [
                ...(b.off == null && w + 4 <= b.r * 2 ? [{ x: b.cx, y: b.cy + 3.5, anchor: "middle" as const, inside: true }] : []),
                { x: b.cx + b.r + gap, y: b.cy + 3.5, anchor: "start", inside: false },
                { x: b.cx - b.r - gap, y: b.cy + 3.5, anchor: "end", inside: false },
                { x: b.cx, y: b.cy - b.r - gap - 1, anchor: "middle", inside: false },
                { x: b.cx, y: b.cy + b.r + gap + h - 2, anchor: "middle", inside: false },
                { x: b.cx + b.r * 0.7 + gap, y: b.cy - b.r * 0.7 - 1, anchor: "start", inside: false },
                { x: b.cx - b.r * 0.7 - gap, y: b.cy - b.r * 0.7 - 1, anchor: "end", inside: false },
                { x: b.cx + b.r * 0.7 + gap, y: b.cy + b.r * 0.7 + h - 2, anchor: "start", inside: false },
                { x: b.cx - b.r * 0.7 - gap, y: b.cy + b.r * 0.7 + h - 2, anchor: "end", inside: false },
            ];
            let done = false;
            for (const t of near) {
                const rect = rectFor(t.x, t.y, t.anchor, w, h);
                if (!onPlot(rect) || placed.some((q) => overlaps(q, rect))) continue;
                // Never let a label read as another holding's: its centre can't sit
                // inside a different bubble. In a cluster, it must clear them entirely.
                const mid = { x: (rect.x0 + rect.x1) / 2, y: (rect.y0 + rect.y1) / 2 };
                if (others.some((o) => Math.hypot(o.cx - mid.x, o.cy - mid.y) < o.r + 2)) continue;
                if (clustered && others.some((o) => coversBubble(rect, o))) continue;
                placed.push(rect);
                out.push({ key: b.key, text, tone, ...t });
                done = true;
                break;
            }
            if (done) continue;

            // Leader line: walk outward, away from the cluster's centre, until the
            // label lands somewhere clear of labels and bubbles.
            const pool = clustered ? neighbours : others.filter((o) => Math.hypot(o.cx - b.cx, o.cy - b.cy) < 80);
            const mx = pool.reduce((s, o) => s + o.cx, b.cx) / (pool.length + 1);
            const my = pool.reduce((s, o) => s + o.cy, b.cy) / (pool.length + 1);
            const away = Math.atan2(b.cy - my, b.cx - mx) || -Math.PI / 2;
            const angles = Array.from({ length: 16 }, (_, i) => (i * Math.PI) / 8)
                .sort((p, q) => Math.abs(Math.atan2(Math.sin(p - away), Math.cos(p - away))) - Math.abs(Math.atan2(Math.sin(q - away), Math.cos(q - away))));
            search: for (const dist of [22, 36, 52, 70, 92]) {
                for (const ang of angles) {
                    const ex = b.cx + Math.cos(ang) * (b.r + dist), ey = b.cy + Math.sin(ang) * (b.r + dist);
                    const anchor: Label["anchor"] = Math.cos(ang) > 0.35 ? "start" : Math.cos(ang) < -0.35 ? "end" : "middle";
                    const lx = ex + (anchor === "start" ? 3 : anchor === "end" ? -3 : 0);
                    const ly = ey + (Math.sin(ang) > 0.35 ? h - 1 : Math.sin(ang) < -0.35 ? -2 : 3.5);
                    const rect = rectFor(lx, ly, anchor, w, h);
                    if (!onPlot(rect) || placed.some((q) => overlaps(q, rect)) || bubbles.some((o) => coversBubble(rect, o))) continue;
                    placed.push(rect);
                    out.push({
                        key: b.key, text, tone, x: lx, y: ly, anchor, inside: false,
                        leader: { x1: b.cx + Math.cos(ang) * (b.r + 1), y1: b.cy + Math.sin(ang) * (b.r + 1), x2: ex, y2: ey },
                    });
                    break search;
                }
            }
        }
        return out;
    }, [bubbles, spy, x, y, W, H]);

    const missing = stocks.length - plotted.length;
    const unlabeled = bubbles.length - labels.length;
    const spring = { type: "spring" as const, stiffness: 170, damping: 24 };

    return (
        <div ref={wrapRef}>
            <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img"
                aria-label={`One-year return against volatility for ${plotted.length} holdings, sized by weight. The data is listed below the chart.`}>
                {yTicks.map((t) => (
                    <g key={`y${t}`}>
                        <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="currentColor" strokeOpacity={t === 0 ? 0.3 : 0.07} />
                        <text x={PAD.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="currentColor" opacity="0.6">{t}%</text>
                    </g>
                ))}
                {xTicks.map((t) => (
                    <text key={`x${t}`} x={x(t)} y={H - PAD.b + 18} textAnchor="middle" fontSize="11" fill="currentColor" opacity="0.6">{t}%</text>
                ))}
                <text x={(PAD.l + W - PAD.r) / 2} y={H - 6} textAnchor="middle" fontSize="11" fill="currentColor" opacity="0.7">Volatility, past year → riskier</text>
                <text transform={`translate(14 ${(PAD.t + H - PAD.b) / 2}) rotate(-90)`} textAnchor="middle" fontSize="11" fill="currentColor" opacity="0.7">1Y return</text>

                {/* S&P 500 crosshair splits the plane into four plain-English quadrants. */}
                {spy.vol != null && spy.ret1y != null && (
                    <g>
                        <line x1={x(spy.vol)} x2={x(spy.vol)} y1={PAD.t} y2={H - PAD.b} stroke="currentColor" strokeOpacity="0.25" strokeDasharray="4 4" />
                        <line x1={PAD.l} x2={W - PAD.r} y1={y(spy.ret1y)} y2={y(spy.ret1y)} stroke="currentColor" strokeOpacity="0.25" strokeDasharray="4 4" />
                        {QUADRANTS.map((c) => (
                            <text key={c.text} x={c.right ? W - PAD.r - 6 : PAD.l + 6} y={c.top ? PAD.t + 12 : H - PAD.b - 8}
                                textAnchor={c.right ? "end" : "start"} fontSize="10" fill="currentColor" opacity="0.5">{c.text}</text>
                        ))}
                    </g>
                )}

                <AnimatePresence>
                    {bubbles.map((b) => {
                        const hue = b.today == null ? "currentColor" : b.today >= 0 ? "var(--color-success)" : "var(--color-error)";
                        return (
                            <motion.circle
                                key={b.key}
                                initial={{ cx: b.cx, cy: b.cy, r: 0, opacity: 0 }}
                                animate={{ cx: b.cx, cy: b.cy, r: b.r, opacity: 1 }}
                                exit={{ r: 0, opacity: 0 }}
                                transition={spring}
                                fill={hue} fillOpacity={b.today == null ? 0.12 : 0.3}
                                stroke={hue} strokeOpacity={0.8} strokeWidth={1.2}
                            />
                        );
                    })}
                </AnimatePresence>

                {/* S&P marker sits above the bubbles. */}
                {spy.vol != null && spy.ret1y != null && (
                    <g>
                        <rect x={x(spy.vol) - 6} y={y(spy.ret1y) - 6} width="12" height="12" transform={`rotate(45 ${x(spy.vol)} ${y(spy.ret1y)})`} fill="var(--color-base-100)" stroke="currentColor" strokeWidth="1.5" />
                        <text x={x(spy.vol) - 10} y={y(spy.ret1y) - 9} textAnchor="end" fontSize={LABEL_PX} fontWeight="700" fill="currentColor" style={HALO}>S&amp;P 500</text>
                    </g>
                )}

                <AnimatePresence>
                    {labels.filter((l) => l.leader).map((l) => (
                        <motion.line
                            key={`lead-${l.key}`}
                            initial={{ ...l.leader!, opacity: 0 }}
                            animate={{ ...l.leader!, opacity: 0.55 }}
                            exit={{ opacity: 0 }}
                            transition={spring}
                            stroke="currentColor" strokeWidth={1}
                        />
                    ))}
                </AnimatePresence>

                <AnimatePresence>
                    {labels.map((l) => (
                        <motion.text
                            key={l.key}
                            initial={{ x: l.x, y: l.y, opacity: 0 }}
                            animate={{ x: l.x, y: l.y, opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={spring}
                            textAnchor={l.anchor}
                            fontSize={LABEL_PX}
                            fontWeight={700}
                            fill={l.tone}
                            style={HALO}
                        >
                            {l.text}
                        </motion.text>
                    ))}
                </AnimatePresence>
            </svg>

            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-base-content/70">
                <span>Bubble size = weight</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-success/60" />Up today</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-error/60" />Down today</span>
                {bubbles.some((b) => b.off != null) && <span>▲ above the chart, labeled with its return</span>}
                {unlabeled > 0 && <span>{unlabeled} small {unlabeled === 1 ? "bubble" : "bubbles"} unlabeled to avoid overlap</span>}
                {missing > 0 && <span>{missing} without a full year of history not shown</span>}
            </div>

            {/* The same data as text, for screen readers. */}
            <ul className="sr-only">
                {plotted.map((s) => (
                    <li key={s.ticker}>{s.ticker}: {pct(s.ret1y)} past year, {s.vol!.toFixed(0)}% volatility, {s.weightPct.toFixed(1)}% of the portfolio, {pct(s.today, 2)} today</li>
                ))}
            </ul>
        </div>
    );
};

export const RiskReturnMap = ({ portfolio, scopeLabel, onScopeChange, scopeOptions }: {
    portfolio?: string;
    scopeLabel?: string;
    onScopeChange?: (next: string) => void;
    scopeOptions?: readonly string[];
}) => {
    const { data, error } = useStocks(portfolio);
    return (
        <div className="rounded-2xl border border-base-300 bg-base-100 p-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-bold text-base-content">Risk vs return</h3>
                    {scopeLabel && onScopeChange && scopeOptions && (
                        <PortfolioScopePill current={scopeLabel} onChange={onScopeChange} options={scopeOptions} align="start" />
                    )}
                </div>
                <p className="text-sm text-base-content/70">Past year, against the S&amp;P 500</p>
            </div>
            {error ? <p className="py-8 text-sm text-base-content/60">Unavailable.</p>
                : !data ? <div className="h-80 animate-pulse rounded-xl bg-base-200" />
                    : <BubbleMap stocks={data.stocks} spy={data.spy} />}
        </div>
    );
};
