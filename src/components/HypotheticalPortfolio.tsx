import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
    ComposedChart,
    Area,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ReferenceLine,
    ResponsiveContainer,
} from "recharts";

import { useTickerData, type TickerPoint } from "../hooks/useTickerData";

// A quiz result handed to the simulator. `nonce` changes on every apply, so
// retaking the quiz and landing on the same mix still replays the hand-off.
export interface AppliedMix {
    equity: number;
    label: string;
    color: string;
    age: number;    // quiz age: the "invested at age N" in the headline
    years: number;  // quiz time horizon: the holding period
    nonce: number;
}

interface DataPoint {
    date: string;
    month: number; // months since the start, for the age in the tooltip
    portfolio: number;
    equities: number;
    bonds: number;
}

// Holding periods on offer; a quiz horizon that isn't one of these gets its
// own button. "Max" is however far back all four funds have prices.
const YEAR_OPTIONS = [1, 3, 5, 10];
// Everyday amounts: the card is for people who haven't invested yet.
const AMOUNT_OPTIONS = [500, 1_000, 5_000, 10_000];

interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{ dataKey: string; value: number; payload: DataPoint }>;
    label?: string;
    amount: number;
    startAge: number;
}

function getAllocation(equityPct: number) {
    const eq = equityPct / 100;
    const bd = 1 - eq;
    return { VTI: eq * 0.6, VXUS: eq * 0.4, BND: bd * 0.6, BNDX: bd * 0.4 };
}

// Buy-and-hold: each fund's cumulative return weighted by its starting share.
// "All stocks" / "All bonds" are the same split at 100/0 and 0/100, which
// makes them the natural yardsticks for the mix.
function computeSeries(points: TickerPoint[], equityPct: number): DataPoint[] {
    const alloc = getAllocation(equityPct);

    return points.map(({ date, VTI, VXUS, BND, BNDX }, month) => {
        const equitiesLine = parseFloat((VTI * 0.6 + VXUS * 0.4).toFixed(2));
        const bondsLine = parseFloat((BND * 0.6 + BNDX * 0.4).toFixed(2));
        const portfolio = parseFloat(
            (VTI * alloc.VTI + VXUS * alloc.VXUS + BND * alloc.BND + BNDX * alloc.BNDX).toFixed(2)
        );
        return { date, month, equities: equitiesLine, bonds: bondsLine, portfolio };
    });
}

// Risk stats from a cumulative-return series (in %, one point per month-end).
// Annualized return and volatility need a year of months to mean anything, so
// shorter ranges get null. Drawdown is peak-to-trough on monthly closes, so it
// slightly understates intra-month lows.
interface Stats { total: number; annual: number | null; maxDrawdown: number; vol: number | null }
function computeStats(cum: number[]): Stats {
    const v = cum.map((p) => 1 + p / 100);
    const rets = v.slice(1).map((x, i) => x / v[i] - 1);
    const n = rets.length;

    let peak = v[0] ?? 1, maxDrawdown = 0;
    for (const x of v) {
        peak = Math.max(peak, x);
        maxDrawdown = Math.min(maxDrawdown, x / peak - 1);
    }

    let vol: number | null = null;
    if (n >= 12) {
        const mean = rets.reduce((s, r) => s + r, 0) / n;
        const variance = rets.reduce((s, r) => s + (r - mean) ** 2, 0) / (n - 1);
        vol = Math.sqrt(variance) * Math.sqrt(12) * 100;
    }

    return {
        total: cum[cum.length - 1] ?? 0,
        annual: n >= 12 ? (Math.pow(v[v.length - 1], 12 / n) - 1) * 100 : null,
        maxDrawdown: maxDrawdown * 100,
        vol,
    };
}

const MIX_COLOR = "#E8A020";
const LINES = [
    { key: "portfolio", label: "Your mix", color: MIX_COLOR },
    { key: "equities", label: "All stocks", color: "#378ADD" },
    { key: "bonds", label: "All bonds", color: "#7F77DD" },
] as const;

const fmtDollar = (amount: number, pct = 0) =>
    `$${Math.round(amount * (1 + pct / 100)).toLocaleString()}`;
const fmtCompact = (n: number) =>
    `$${Intl.NumberFormat("en-US", { notation: "compact", maximumSignificantDigits: 2 }).format(n)}`;
const fmtPct = (n: number, d = 1) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(d)}%`;

const CustomTooltip = ({ active, payload, label, amount, startAge }: CustomTooltipProps) => {
    if (!active || !payload?.length) return null;
    const age = startAge + Math.floor((payload[0].payload?.month ?? 0) / 12);
    return (
        <div className="bg-base-100/95 backdrop-blur border border-base-300 rounded-xl px-4 py-3 text-sm shadow-xl">
            <p className="text-base-content/70 text-xs font-medium mb-2">{label} · age {age}</p>
            {LINES.map(({ key, label: name, color }) => {
                const entry = payload.find((p) => p.dataKey === key);
                if (!entry) return null;
                const val = entry.value;
                const mine = key === "portfolio";
                return (
                    <div key={key} className={`flex items-center justify-between gap-6 py-0.5 ${mine ? "" : "opacity-80"}`}>
                        <span className={`flex items-center gap-1.5 ${mine ? "font-semibold text-base-content" : "text-base-content/80"}`}>
                            <span className="w-2 h-2 rounded-full inline-block" style={{ background: color }} />
                            {name}
                        </span>
                        <div className="text-right">
                            <span className="font-medium tabular-nums text-base-content">{fmtDollar(amount, val)}</span>
                            <div className="text-[10px] tabular-nums text-base-content/60">{fmtPct(val, 1)}</div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// One stat for the mix, with the all-stocks figure under it for comparison.
// No box: the four sit in one row split by hairlines.
const Stat = ({ label, value, compare }: { label: string; value: string; compare: string }) => (
    <div className="min-w-0 sm:px-4 sm:first:pl-0">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-base-content/60">{label}</p>
        <p className="mt-0.5 text-xl font-bold tabular-nums text-base-content">{value}</p>
        <p className="text-xs tabular-nums text-base-content/60">
            <span className="mr-1 inline-block size-1.5 -translate-y-px rounded-full bg-[#378ADD]" />
            {compare}
        </p>
    </div>
);

// One side of the mix: its share in large type, then its two funds as rows
// (color dot, plain name, $TICKER, share of the whole portfolio).
const SideGroup = ({ title, hint, pct, color, funds, alignEnd = false }: {
    title: string;
    hint: string;
    pct: number;
    color: string;
    funds: { ticker: string; label: string; pct: number; color: string }[];
    alignEnd?: boolean;
}) => (
    <div className={`min-w-0 ${alignEnd ? "text-right" : ""}`}>
        <p className="text-xs font-semibold uppercase tracking-widest text-base-content/60">{title}</p>
        <p className="text-3xl font-bold tabular-nums leading-tight" style={{ color }}>
            {pct}%<span className="ml-1.5 hidden text-xs font-medium text-base-content/60 sm:inline">{hint}</span>
        </p>
        <ul className={`mt-2 space-y-1 ${alignEnd ? "flex flex-col items-end" : ""}`}>
            {funds.map((f) => (
                <li key={f.ticker} className={`flex items-baseline gap-1.5 text-[13px] sm:text-sm ${f.pct ? "" : "opacity-40"}`}>
                    <span className="size-2.5 shrink-0 -translate-y-px self-center rounded-full" style={{ background: f.color }} />
                    <span className="whitespace-nowrap text-base-content/80">{f.label}</span>
                    <span className="font-semibold tabular-nums text-base-content">{Math.round(f.pct)}%</span>
                    <span className="text-[11px] text-base-content/60">${f.ticker}</span>
                </li>
            ))}
        </ul>
    </div>
);

interface PortfolioProps {
    applied?: AppliedMix | null;
}

export const HypotheticalPortfolio = ({ applied }: PortfolioProps = {}) => {
    const reduce = useReducedMotion();
    const [years, setYears] = useState(10);
    const [amount, setAmount] = useState(1_000);
    const [age, setAge] = useState(30);
    const [ageDraft, setAgeDraft] = useState("30"); // the box's text; may be empty while typing
    const [equityPct, setEquityPct] = useState(80);
    const equityRef = useRef(equityPct);
    equityRef.current = equityPct;

    // Quiz hand-off: "pending" until the simulator is on screen, then
    // "applying" (glow, banner, slider sweeps to the mix), then "done".
    const rootRef = useRef<HTMLDivElement>(null);
    const [handoff, setHandoff] = useState<(AppliedMix & { phase: "pending" | "applying" | "done" }) | null>(null);
    useEffect(() => {
        if (!applied) return;
        setHandoff({ ...applied, phase: "pending" });
        setAge(applied.age);
        setAgeDraft(String(applied.age));
        setYears(applied.years);
    }, [applied]);

    useEffect(() => {
        if (handoff?.phase !== "pending" || !rootRef.current) return;
        const io = new IntersectionObserver(([e]) => {
            if (e.isIntersecting) { io.disconnect(); setHandoff((h) => h && { ...h, phase: "applying" }); }
        }, { threshold: 0.35 });
        io.observe(rootRef.current);
        return () => io.disconnect();
    }, [handoff?.phase]);

    // The sweep: step the slider 10 points at a time to the target. If it's
    // already there, start from the far end so the move is still visible.
    const SWEEP_START_MS = 500, SWEEP_STEP_MS = 120;
    const sweepSteps = useRef(0);
    useEffect(() => {
        if (handoff?.phase !== "applying") return;
        const target = handoff.equity;
        if (reduce) { setEquityPct(target); setHandoff((h) => h && { ...h, phase: "done" }); return; }
        const cur = equityRef.current;
        const from = cur === target ? (target >= 50 ? 0 : 100) : cur;
        const path: number[] = [];
        for (let v = from; v !== target; v += Math.sign(target - from) * 10) path.push(v);
        path.push(target);
        sweepSteps.current = path.length;
        const timers = path.map((v, i) => window.setTimeout(() => setEquityPct(v), SWEEP_START_MS + i * SWEEP_STEP_MS));
        timers.push(window.setTimeout(() => setHandoff((h) => h && { ...h, phase: "done" }), SWEEP_START_MS + path.length * SWEEP_STEP_MS + 500));
        return () => timers.forEach(clearTimeout);
    }, [handoff?.phase, handoff?.equity, reduce]);

    // The requested period, trimmed to the history all four funds have.
    const [maxMonthsSeen, setMaxMonthsSeen] = useState(Infinity);
    const months = Math.min(years * 12, maxMonthsSeen);
    const { data: tickerData, maxMonths, isLive, isLoading, asOfDate } = useTickerData(months);
    useEffect(() => { if (maxMonths) setMaxMonthsSeen(maxMonths); }, [maxMonths]);
    const maxYears = Math.floor(maxMonthsSeen / 12);
    const heldYears = Math.round(months / 12 * 10) / 10;
    const capped = years * 12 > maxMonthsSeen;
    const yearButtons = [...new Set([...YEAR_OPTIONS, Math.min(years, maxYears)])].filter((y) => y <= maxYears).sort((a, b) => a - b);
    const alloc = getAllocation(equityPct);

    const data = useMemo(() => computeSeries(tickerData, equityPct), [tickerData, equityPct]);
    const stats = useMemo(() => data.length ? computeStats(data.map((d) => d.portfolio)) : null, [data]);
    const stockStats = useMemo(() => data.length ? computeStats(data.map((d) => d.equities)) : null, [data]);

    const bondPct = 100 - equityPct;

    const segments = [
        { ticker: "VTI", label: "US stocks", pct: alloc.VTI * 100, color: "#378ADD" },
        { ticker: "VXUS", label: "Intl stocks", pct: alloc.VXUS * 100, color: "#1D9E75" },
        { ticker: "BND", label: "US bonds", pct: alloc.BND * 100, color: "#7F77DD" },
        { ticker: "BNDX", label: "Intl bonds", pct: alloc.BNDX * 100, color: "#D85A30" },
    ];

    // Five evenly spaced y ticks from the starting amount (or the low, if the
    // range dipped below it) to the high, so the axis never invents a loss.
    const yTicks = useMemo(() => {
        const vals = data.flatMap((d) => [d.portfolio, d.equities, d.bonds]);
        const lo = Math.min(0, ...vals), hi = Math.max(0, ...vals);
        const step = (hi - lo) / 4 || 1;
        return Array.from({ length: 5 }, (_, i) => lo + i * step);
    }, [data]);

    // The chart's data is % return; the axis shows what the amount became.
    const formatTick = useCallback((v: number) => fmtCompact(amount * (1 + v / 100)), [amount]);

    const applying = handoff?.phase === "applying";
    const offQuizMix = handoff?.phase === "done" && equityPct !== handoff.equity;

    return (
        <div
            id="sec-simulator"
            ref={rootRef}
            className="scroll-mt-24 bg-base-100 border border-base-300 rounded-2xl p-6 space-y-5 transition-shadow duration-700"
            style={applying && handoff ? { boxShadow: `0 0 0 2px ${handoff.color}, 0 0 48px -8px ${handoff.color}` } : undefined}
        >

            {/* Header: the title, then the question the whole card answers,
                with the amount, age and holding period editable in place. */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-base-content">Hypothetical Diversified Portfolio</h2>
                    {isLoading ? (
                        <span className="w-2 h-2 rounded-full bg-base-content/20 animate-pulse" />
                    ) : isLive ? (
                        <span className="flex items-center gap-1 text-xs text-success font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
                            Live
                        </span>
                    ) : (
                        <span className="text-xs text-base-content/60 font-medium">Historical</span>
                    )}
                </div>

                <p className="text-lg leading-relaxed text-base-content/80 sm:text-xl">
                    If you'd invested{" "}
                    <select
                        value={amount}
                        onChange={(e) => setAmount(Number(e.target.value))}
                        aria-label="Amount invested"
                        className="cursor-pointer appearance-none rounded-md border-b-2 border-dashed border-base-content/30 bg-transparent px-1 font-semibold text-base-content hover:border-base-content/60"
                    >
                        {AMOUNT_OPTIONS.map((a) => <option key={a} value={a}>{fmtDollar(a)}</option>)}
                    </select>{" "}
                    at age{" "}
                    <input
                        inputMode="numeric"
                        value={ageDraft}
                        onChange={(e) => {
                            const v = e.target.value.replace(/\D/g, "").slice(0, 2);
                            setAgeDraft(v);
                            if (v) setAge(Number(v));
                        }}
                        onBlur={() => setAgeDraft(String(age))}
                        aria-label="Age when invested"
                        className="w-14 rounded-md border-b-2 border-dashed border-base-content/30 bg-transparent px-1 text-center font-semibold text-base-content [appearance:textfield] hover:border-base-content/60 [&::-webkit-inner-spin-button]:appearance-none"
                    />{" "}
                    and held it {heldYears} {heldYears === 1 ? "year" : "years"}, you'd have{" "}
                    <span className="whitespace-nowrap text-2xl font-bold tabular-nums sm:text-3xl" style={{ color: MIX_COLOR }}>
                        {stats ? fmtDollar(amount, stats.total) : "…"}
                    </span>{" "}
                    at {age + Math.floor(heldYears)}.
                </p>

                <div className="flex flex-wrap items-center gap-1">
                    <span className="mr-1 text-xs font-semibold uppercase tracking-widest text-base-content/60">Held for</span>
                    {yearButtons.map((y) => (
                        <button
                            key={y}
                            onClick={() => setYears(y)}
                            className={`btn btn-sm rounded-lg font-medium ${Math.min(years, maxYears) === y ? "btn-neutral" : "btn-ghost text-base-content/60"}`}
                        >
                            {y === maxYears ? `${y}Y (max)` : `${y}Y`}
                        </button>
                    ))}
                    {capped && (
                        <span className="ml-1 text-xs text-base-content/60">
                            Your {years}-year horizon is longer than the data: all four funds only go back {maxYears} years.
                        </span>
                    )}
                </div>
            </div>

            {/* Quiz hand-off banner: shown while the mix is being applied and
                after, so it's clear where the current split came from.
                It opens with a CSS grid-rows transition, NOT a framer-motion
                height:"auto" animation: measuring "auto" makes framer call
                window.scrollTo(), which cancels the smooth scroll from the
                quiz's "Applied to the simulator below" button and strands the
                visitor mid-page (the banner opens right as that scroll
                brings the simulator into view). */}
            {handoff && (
                <div
                    className="grid transition-[grid-template-rows,margin] duration-300 ease-out"
                    style={{ gridTemplateRows: handoff.phase !== "pending" ? "1fr" : "0fr", marginBlockEnd: handoff.phase !== "pending" ? undefined : 0 }}
                >
                    <motion.div
                        initial={false}
                        animate={handoff.phase !== "pending" ? { opacity: 1, y: 0 } : { opacity: 0, y: -8 }}
                        transition={{ duration: 0.3 }}
                        className="min-h-0 overflow-hidden"
                    >
                        <div
                            className="relative flex flex-wrap items-center justify-between gap-3 overflow-hidden rounded-xl px-4 py-3"
                            style={{ background: `color-mix(in oklch, ${handoff.color} 12%, transparent)` }}
                        >
                            <div className="flex items-center gap-3">
                                <span
                                    className="flex size-8 shrink-0 items-center justify-center rounded-full text-white"
                                    style={{ background: handoff.color }}
                                >
                                    {applying ? (
                                        <motion.svg viewBox="0 0 24 24" className="size-4" fill="currentColor" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }} aria-hidden="true">
                                            <path d="M12 0C12.9 6.6 17.4 11.1 24 12 17.4 12.9 12.9 17.4 12 24 11.1 17.4 6.6 12.9 0 12 6.6 11.1 11.1 6.6 12 0Z" />
                                        </motion.svg>
                                    ) : (
                                        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                                            <motion.path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4 }} />
                                        </svg>
                                    )}
                                </span>
                                <p className="text-sm text-base-content" aria-live="polite">
                                    {applying ? (
                                        <>Applying your quiz result: <span className="font-semibold" style={{ color: handoff.color }}>{handoff.label}</span>…</>
                                    ) : (
                                        <>
                                            <span className="font-semibold" style={{ color: handoff.color }}>{handoff.label}</span>
                                            {" "}mix from your quiz: {handoff.equity}% stocks / {100 - handoff.equity}% bonds
                                        </>
                                    )}
                                </p>
                            </div>
                            {offQuizMix && (
                                <button className="btn btn-xs btn-ghost" onClick={() => setEquityPct(handoff.equity)}>
                                    Back to my quiz mix
                                </button>
                            )}
                            {/* Progress along the bottom while the slider sweeps. */}
                            {applying && !reduce && (
                                <motion.span
                                    className="absolute inset-x-0 bottom-0 h-0.5 origin-left"
                                    style={{ background: handoff.color }}
                                    initial={{ scaleX: 0 }}
                                    animate={{ scaleX: 1 }}
                                    transition={{ duration: (SWEEP_START_MS + Math.max(sweepSteps.current, 1) * SWEEP_STEP_MS + 500) / 1000, ease: "linear" }}
                                />
                            )}
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Allocation as one control: bonds on the left, stocks on the
                right, each with its share and its two funds in readable rows,
                and the slider between them. Phones put both groups side by
                side above the slider. */}
            <div className="rounded-2xl border border-base-300 bg-base-200/40 p-4 sm:p-5">
                <div className="grid grid-cols-2 gap-x-4 gap-y-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_minmax(0,1fr)] lg:items-center">
                    <SideGroup title="Bonds" hint="steadier" pct={bondPct} color="#7F77DD" funds={segments.slice(2)} />
                    <div className="col-span-2 row-start-2 lg:col-span-1 lg:col-start-2 lg:row-start-1">
                        <input
                            type="range"
                            min={0}
                            max={100}
                            step={10}
                            value={equityPct}
                            onChange={(e) => setEquityPct(Number(e.target.value))}
                            aria-label="Stocks share of the portfolio"
                            className="range w-full [--range-bg:#7F77DD] [--range-thumb:#378ADD] [--range-fill:0]"
                        />
                        <p className="mt-1.5 text-center text-xs text-base-content/60">Drag to change the mix</p>
                    </div>
                    <SideGroup title="Stocks" hint="more growth" pct={equityPct} color="#378ADD" funds={segments.slice(0, 2)} alignEnd />
                </div>
            </div>

            {/* Risk & return for the mix over the range; the blue dot line under
                each is the same stat for all stocks. */}
            {stats && stockStats && (
                <div className="grid grid-cols-2 gap-y-3 divide-base-300 border-y border-base-300 py-3 sm:grid-cols-4 sm:divide-x">
                    <Stat label="Growth" value={fmtPct(stats.total)} compare={fmtPct(stockStats.total)} />
                    <Stat
                        label="Average per year"
                        value={stats.annual != null ? fmtPct(stats.annual) : "—"}
                        compare={stockStats.annual != null ? fmtPct(stockStats.annual) : "1Y+ only"}
                    />
                    <Stat label="Biggest dip" value={fmtPct(stats.maxDrawdown)} compare={fmtPct(stockStats.maxDrawdown)} />
                    <Stat
                        label="Typical swing"
                        value={stats.vol != null ? `${stats.vol.toFixed(1)}%` : "—"}
                        compare={stockStats.vol != null ? `${stockStats.vol.toFixed(1)}%` : "1Y+ only"}
                    />
                </div>
            )}

            {/* Chart: the mix as a filled area, all-stocks and all-bonds as
                dashed yardsticks, and a zero line for break-even. */}
            <div className="relative">
                {asOfDate && (
                    <span className="absolute top-1 right-1 text-[10px] text-base-content/60 z-10 pointer-events-none">
                        Monthly closes · as of {asOfDate}
                    </span>
                )}
                <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={data} margin={{ top: 20, right: 8, bottom: 0, left: 0 }}>
                        <defs>
                            <linearGradient id="mixFill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={MIX_COLOR} stopOpacity={0.35} />
                                <stop offset="100%" stopColor={MIX_COLOR} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-base-content/10" vertical={false} />
                        <XAxis
                            dataKey="date"
                            tick={{ fontSize: 11, fill: "currentColor", opacity: 0.6 }}
                            tickLine={false}
                            axisLine={false}
                            interval="preserveStartEnd"
                            minTickGap={50}
                        />
                        <YAxis
                            tickFormatter={formatTick}
                            tick={{ fontSize: 11, fill: "currentColor", opacity: 0.6 }}
                            tickLine={false}
                            axisLine={false}
                            width={56}
                            domain={[yTicks[0], yTicks[yTicks.length - 1]]}
                            ticks={yTicks}
                        />
                        <ReferenceLine y={0} stroke="currentColor" strokeOpacity={0.3} />
                        <Tooltip
                            content={<CustomTooltip amount={amount} startAge={age} />}
                            cursor={{ stroke: "currentColor", strokeOpacity: 0.2, strokeWidth: 1 }}
                        />
                        <Line type="monotone" dataKey="bonds" stroke="#7F77DD" strokeWidth={1.5} strokeDasharray="4 4" strokeOpacity={0.7} dot={false} activeDot={{ r: 3, strokeWidth: 0 }} animationDuration={300} />
                        <Line type="monotone" dataKey="equities" stroke="#378ADD" strokeWidth={1.5} strokeDasharray="4 4" strokeOpacity={0.7} dot={false} activeDot={{ r: 3, strokeWidth: 0 }} animationDuration={300} />
                        <Area
                            type="monotone"
                            dataKey="portfolio"
                            stroke={MIX_COLOR}
                            strokeWidth={3}
                            fill="url(#mixFill)"
                            dot={false}
                            activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
                            animationDuration={300}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex gap-4 flex-wrap items-center">
                {LINES.map(({ key, label, color }) => (
                    <span key={key} className="flex items-center gap-2 text-xs text-base-content/70">
                        <svg width="20" height="10" aria-hidden="true">
                            <line
                                x1="0" y1="5" x2="20" y2="5"
                                stroke={color}
                                strokeWidth={key === "portfolio" ? 3 : 2}
                                strokeDasharray={key === "portfolio" ? "" : "4 3"}
                                strokeLinecap="round"
                            />
                        </svg>
                        {label}{key === "portfolio" ? ` (${equityPct}/${bondPct})` : key === "equities" ? " (blue figures above)" : ""}
                    </span>
                ))}
                <span className="ml-auto text-[11px] text-base-content/60">Real past returns · past results don't promise future ones</span>
            </div>
        </div>
    );
};
