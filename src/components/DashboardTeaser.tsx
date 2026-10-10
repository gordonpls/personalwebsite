// What a locked visitor sees behind the password card: the dashboard's shape,
// colors, and labels, with every value blurred out. Labels stay crisp ("Total
// return", "vs S&P 500") so it's clear what's there; only the numbers hide.
//
// Every value here is invented and has no relation to the real portfolio.
// Plain markup + CSS only (no fetches, no charts lib) so the locked page stays
// cheap; blur is applied per element, never to one huge layer.

import { useEffect, useState } from "react";
import { PortfolioIcon } from "./PortfolioSwitcher";

const Hidden = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <span className={`inline-block select-none blur-[6px] ${className}`}>{children}</span>
);

const Panel = ({ title, aside, children, className = "" }: {
    title: string;
    aside?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
}) => (
    <div className={`rounded-2xl border border-base-300 bg-base-100 p-4 ${className}`}>
        <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-base-content">{title}</h3>
            {aside}
        </div>
        {children}
    </div>
);

const LiveDot = () => (
    <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-success">
        <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
        </span>
        Live
    </span>
);

const KPIS = [
    { label: "Total return", value: "+142.8%", tone: "text-success" },
    { label: "vs S&P 500", value: "+31.6 pts", tone: "text-success" },
    { label: "Positions", value: "38", tone: "text-base-content" },
    { label: "Dividend yield", value: "1.84%", tone: "text-base-content" },
];

const ROWS = [
    { logo: "bg-success", w: "w-[92%]", ret: "+212.4%", up: true },
    { logo: "bg-info", w: "w-[71%]", ret: "+48.1%", up: true },
    { logo: "bg-warning", w: "w-[58%]", ret: "+96.0%", up: true },
    { logo: "bg-error", w: "w-[44%]", ret: "-6.3%", up: false },
    { logo: "bg-primary", w: "w-[39%]", ret: "+27.9%", up: true },
    { logo: "bg-secondary", w: "w-[30%]", ret: "+133.5%", up: true },
    { logo: "bg-accent", w: "w-[22%]", ret: "-2.1%", up: false },
];

// Heatmap tiles: [grid span classes, tint]. Varied sizes read as "weighted".
const TILES = [
    ["col-span-2 row-span-2", "bg-success/60"], ["col-span-1 row-span-1", "bg-success/30"],
    ["col-span-1 row-span-2", "bg-error/40"], ["col-span-1 row-span-1", "bg-success/45"],
    ["col-span-1 row-span-1", "bg-error/25"], ["col-span-2 row-span-1", "bg-success/35"],
    ["col-span-1 row-span-1", "bg-success/20"], ["col-span-1 row-span-1", "bg-error/50"],
    ["col-span-1 row-span-1", "bg-success/50"], ["col-span-1 row-span-1", "bg-error/20"],
];

// ── Performance loop ─────────────────────────────────────────────────────────
// One 6s clock drives every moving part, all sharing the same keyTimes and
// easing, so they stay locked together forever:
//   0 → 45%   the line draws in; the dot rides exactly on its tip
//   45 → 75%  the dot lands, a single ring ripples out, the fill blooms
//   75 → 100% the tail erases toward the dot, which shrinks to nothing at the
//             exact instant the line vanishes. That's the seam, and the next
//             cycle starts from nothing, so the loop never visibly restarts.
// pathLength=1 makes dash offsets and animateMotion keyPoints both measure
// fractions of the same arc length, which is why the dot can't drift off the
// tip. The S&P dashes drift exactly three whole periods per cycle, so they
// wrap seamlessly too. Uniform scaling (no preserveAspectRatio="none") keeps
// the dot a true circle.

const LOOP = "6s";
const KEY_TIMES = "0;0.45;0.75;1";
const EASE = "0.65 0 0.35 1"; // easeInOutCubic
const SPLINES = `${EASE};0 0 1 1;${EASE}`;

const PORTFOLIO = "M0 140 L45 132 L90 136 L135 118 L180 122 L225 100 L270 106 L315 84 L360 90 L405 62 L450 70 L495 44 L540 38 L578 18";
const BENCHMARK = "M0 140 L45 136 L90 138 L135 128 L180 130 L225 118 L270 120 L315 108 L360 110 L405 96 L450 98 L495 86 L540 84 L578 74";
const END = { x: 578, y: 18 }; // inset so the ripple ring never clips
const DASH = 10; // 5 on + 5 off

function usePrefersReducedMotion() {
    const query = "(prefers-reduced-motion: reduce)";
    const [reduced, setReduced] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
    useEffect(() => {
        const mq = window.matchMedia(query);
        const on = () => setReduced(mq.matches);
        mq.addEventListener("change", on);
        return () => mq.removeEventListener("change", on);
    }, []);
    return reduced;
}

const PerformanceLoop = () => {
    // SMIL ignores the global reduced-motion CSS, so honor it here: a still,
    // fully drawn chart.
    const still = usePrefersReducedMotion();
    return (
        <svg viewBox="0 0 600 160" overflow="visible" className="h-auto w-full blur-[1px]" aria-hidden="true">
            <defs>
                <linearGradient id="teaserFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0" stopColor="var(--color-success)" stopOpacity="0.35" />
                    <stop offset="1" stopColor="var(--color-success)" stopOpacity="0" />
                </linearGradient>
            </defs>
            {[40, 80, 120].map((y) => (
                <line key={y} x1="0" x2="600" y1={y} y2={y} stroke="currentColor" strokeOpacity="0.06" />
            ))}

            {/* Area under the line: blooms only once the dot lands (so it never
                runs ahead of the tip) and recedes as the erase begins. */}
            <path d={`${PORTFOLIO} L578 160 L0 160 Z`} fill="url(#teaserFill)">
                {!still && <animate attributeName="opacity" dur={LOOP} repeatCount="indefinite"
                    values="0;0;1;1;0;0" keyTimes="0;0.45;0.55;0.75;0.85;1" />}
            </path>

            {/* S&P 500: marching dashes, exactly 3 periods per loop. */}
            <path d={BENCHMARK} fill="none" stroke="currentColor" strokeOpacity="0.35" strokeWidth="2" strokeDasharray={`${DASH / 2} ${DASH / 2}`}>
                {!still && <animate attributeName="stroke-dashoffset" dur={LOOP} repeatCount="indefinite" values={`0;${-DASH * 3}`} />}
            </path>

            {/* Portfolio line: draws in, holds, then erases from the start. */}
            <path id="teaserLine" d={PORTFOLIO} pathLength={1} fill="none" stroke="var(--color-success)" strokeWidth="3"
                strokeLinejoin="round" strokeLinecap="round" strokeDasharray="1 1" strokeDashoffset={still ? 0 : 1}>
                {!still && <animate attributeName="stroke-dashoffset" dur={LOOP} repeatCount="indefinite"
                    values="1;0;0;-1" keyTimes={KEY_TIMES} calcMode="spline" keySplines={SPLINES} />}
            </path>

            {/* Landing ripple: one ring per loop, the moment the dot arrives. */}
            {!still && (
                <circle cx={END.x} cy={END.y} r="5" fill="none" stroke="var(--color-success)" strokeWidth="2" opacity="0">
                    <animate attributeName="r" dur={LOOP} repeatCount="indefinite" values="5;5;18;18" keyTimes={KEY_TIMES}
                        calcMode="spline" keySplines={`0 0 1 1;0.22 1 0.36 1;0 0 1 1`} />
                    <animate attributeName="opacity" dur={LOOP} repeatCount="indefinite" values="0;0;0.6;0;0" keyTimes="0;0.449;0.45;0.75;1" />
                </circle>
            )}

            {/* The dot: rides the drawing tip, waits, then shrinks as the tail arrives. */}
            {still ? (
                <circle cx={END.x} cy={END.y} r="5" fill="var(--color-success)" />
            ) : (
                <circle r="5" fill="var(--color-success)">
                    <animateMotion dur={LOOP} repeatCount="indefinite" keyPoints="0;1;1;1" keyTimes={KEY_TIMES}
                        calcMode="spline" keySplines={SPLINES}>
                        <mpath href="#teaserLine" />
                    </animateMotion>
                    <animate attributeName="r" dur={LOOP} repeatCount="indefinite" values="0;5;5;5;0"
                        keyTimes="0;0.06;0.45;0.75;1" calcMode="spline" keySplines={`0.22 1 0.36 1;0 0 1 1;0 0 1 1;${EASE}`} />
                </circle>
            )}
        </svg>
    );
};

// ── More of the page, so scrolling shows how much is behind the lock ─────────

const PORTFOLIOS = [
    { id: "All", name: "All portfolios", share: "100%", n: "55" },
    { id: "Core", name: "Core", share: "72%", n: "16" },
    { id: "Tech & Speculation", name: "Tech & Speculation", share: "18%", n: "39" },
    { id: "Retirement", name: "Retirement", share: "10%", n: "7" },
];

const SwitcherTeaser = () => (
    <div className="mx-auto w-full max-w-4xl">
        <p className="mb-2 text-center text-xs font-semibold uppercase tracking-widest text-base-content/60">Choose a portfolio</p>
        <div className="grid grid-cols-2 gap-1.5 sm:gap-3 md:grid-cols-4">
            {PORTFOLIOS.map((p, i) => (
                <div key={p.id} className={`rounded-xl border px-2.5 py-2 sm:rounded-2xl sm:p-4 ${i === 0 ? "border-primary bg-primary/10" : "border-base-300 bg-base-100"}`}>
                    <div className="flex items-center gap-2">
                        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md sm:h-8 sm:w-8 sm:rounded-lg [&>svg]:h-3.5 [&>svg]:w-3.5 sm:[&>svg]:h-5 sm:[&>svg]:w-5 ${i === 0 ? "bg-primary text-primary-content" : "bg-base-200 text-base-content/70"}`}>
                            <PortfolioIcon id={p.id} />
                        </span>
                        <span className="truncate text-[13px] font-bold text-base-content sm:text-sm">{p.name}</span>
                    </div>
                    <div className="mt-1.5 flex justify-between text-[11px] sm:mt-3 sm:text-xs">
                        <Hidden className="font-semibold text-base-content">{p.share}</Hidden>
                        <Hidden className="text-base-content/60">{p.n} positions</Hidden>
                    </div>
                    <div className="mt-1 h-1 rounded-full bg-base-300"><div className="h-full w-1/2 rounded-full bg-base-content/30" /></div>
                </div>
            ))}
        </div>
    </div>
);

const SpotlightTeaser = () => (
    <Panel title="Holding of the day" aside={<span className="badge badge-sm border-none bg-warning/20 font-semibold text-warning">★ Rotates daily</span>} className="flex flex-col">
        <div className="flex items-center gap-3">
            <span className="h-12 w-12 shrink-0 rounded-xl bg-info/70 blur-[2px]" />
            <div className="space-y-1.5">
                <Hidden className="block text-2xl font-bold text-base-content">TICK</Hidden>
                <Hidden className="block text-sm text-base-content/70">Company name</Hidden>
            </div>
        </div>
        <svg viewBox="0 0 300 100" preserveAspectRatio="none" className="mt-5 h-28 w-full blur-[1.5px]" aria-hidden="true">
            <path d="M0 80 L30 72 L60 76 L90 60 L120 64 L150 48 L180 52 L210 36 L240 40 L270 24 L300 20 L300 100 L0 100 Z" fill="var(--color-success)" fillOpacity="0.15" />
            <path d="M0 80 L30 72 L60 76 L90 60 L120 64 L150 48 L180 52 L210 36 L240 40 L270 24 L300 20" fill="none" stroke="var(--color-success)" strokeWidth="2" />
        </svg>
        <div className="mt-4 grid grid-cols-3 gap-2">
            {["Weight", "Since buy", "Today"].map((k) => (
                <div key={k} className="rounded-xl bg-base-200 px-3 py-2">
                    <p className="text-[11px] text-base-content/60">{k}</p>
                    <Hidden className="text-base font-bold text-success">+0.0%</Hidden>
                </div>
            ))}
        </div>
    </Panel>
);

const DetailTeaser = () => (
    <div className="flex-1 p-5">
        <div className="flex items-center gap-3">
            <span className="h-11 w-11 shrink-0 rounded-lg bg-success/70 blur-[2px]" />
            <div className="flex-1 space-y-1.5">
                <Hidden className="block text-lg font-bold text-base-content">TICK</Hidden>
                <Hidden className="block text-sm text-base-content/60">Company name</Hidden>
            </div>
            <Hidden className="text-right font-semibold text-base-content">$000.00</Hidden>
        </div>
        <svg viewBox="0 0 300 60" preserveAspectRatio="none" className="mt-5 h-20 w-full blur-[1.5px]" aria-hidden="true">
            <path d="M0 45 L20 40 L40 44 L60 35 L80 38 L100 30 L120 34 L140 26 L160 30 L180 22 L200 25 L220 18 L240 22 L260 14 L280 16 L300 10" fill="none" stroke="var(--color-success)" strokeWidth="1.5" />
        </svg>
        <p className="mt-4 text-xs text-base-content/60">52-week range</p>
        <div className="mt-2 h-2 rounded-full bg-base-300"><div className="h-full w-3/4 rounded-full bg-primary/60" /></div>
        <p className="mt-4 text-xs text-base-content/60">Analyst consensus</p>
        <div className="mt-2 flex h-2 overflow-hidden rounded-full"><div className="w-2/3 bg-success/70" /><div className="w-1/4 bg-success/40" /><div className="flex-1 bg-error/50" /></div>
        <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3">
            {["Exchange", "Industry", "Market cap", "P/E", "Dividend yield", "Beta"].map((k) => (
                <div key={k}>
                    <p className="text-xs text-base-content/60">{k}</p>
                    <Hidden className="text-sm font-semibold text-base-content">00.0</Hidden>
                </div>
            ))}
        </div>
    </div>
);

const DRIVERS = [
    { w: "w-[92%]", up: true }, { w: "w-[70%]", up: true }, { w: "w-[55%]", up: true }, { w: "w-[41%]", up: true },
    { w: "w-[22%]", up: false }, { w: "w-[14%]", up: false }, { w: "w-[8%]", up: false },
];

// Written out in full so Tailwind generates them (it can't see built-up names).
const LOGO_TINTS = ["bg-info/70", "bg-warning/70", "bg-secondary/70", "bg-success/70"];

const DriversTeaser = () => (
    <Panel title="What drove returns" aside={<span className="text-[10px] font-semibold text-base-content/60">1M · 3M · <span className="rounded bg-base-300 px-1.5 py-0.5 text-base-content">YTD</span> · 1Y</span>} className="h-full">
        {(["Added the most", "Held back"] as const).map((h, hi) => (
            <section key={h} className={hi ? "mt-5" : ""}>
                <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-base-content/60">{h}</h4>
                <ul className="space-y-2.5">
                    {DRIVERS.filter((d) => d.up === !hi).map((d, i) => (
                        <li key={i} className="flex items-center gap-2">
                            <span className={`h-6 w-6 shrink-0 rounded-md blur-[2px] ${LOGO_TINTS[i % LOGO_TINTS.length]}`} />
                            <Hidden className="w-12 text-sm font-semibold text-base-content">TICK</Hidden>
                            <div className="h-2 flex-1 rounded-full bg-base-200"><div className={`h-full rounded-full ${d.up ? "bg-success" : "bg-error"} ${d.w}`} /></div>
                            <Hidden className={`text-xs font-semibold ${d.up ? "text-success" : "text-error"}`}>+0.00 pts</Hidden>
                        </li>
                    ))}
                </ul>
            </section>
        ))}
    </Panel>
);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
// Invented month shades: positive/negative and strength only, no numbers.
const SHADES = [3, -2, 5, 1, -4, 2, 6, -1, 2, 4, -3, 1, 4, 2, -5, 3, 1, -2, 5, 2, -1, 3, 2, 4, -6, -3, 2, -5, 1, -4, 3, -2, 4, 1, -3, 2, 5, 3, 2, 4, 6, 1, 3, -2, -1, 2, 4, 3];

const CalendarTeaser = () => (
    <Panel title="Monthly returns" aside={<span className="text-xs text-base-content/60">Beat the S&amp;P 500 in <Hidden className="font-semibold text-base-content">0 of 0</Hidden> years</span>}>
        <div className="overflow-hidden">
            <div className="grid min-w-[40rem] grid-cols-[3rem_repeat(12,1fr)_4rem] gap-1 text-center text-[11px]">
                <span />
                {MONTHS.map((m) => <span key={m} className="text-base-content/60">{m}</span>)}
                <span className="font-semibold text-base-content/80">Year</span>
                {[2026, 2025, 2024, 2023].map((y, yi) => (
                    <div key={y} className="contents">
                        <span className="py-2 text-left text-sm font-semibold text-base-content">{y}</span>
                        {MONTHS.map((_, mi) => {
                            const v = yi === 0 && mi > 9 ? null : SHADES[(yi * 12 + mi) % SHADES.length];
                            return (
                                <span key={mi} className="h-8 rounded-md"
                                    style={v == null ? undefined : { background: `color-mix(in oklch, var(${v >= 0 ? "--color-success" : "--color-error"}) ${15 + Math.abs(v) * 9}%, transparent)` }} />
                            );
                        })}
                        <span className="flex items-center justify-center rounded-md bg-success/40"><Hidden className="text-sm font-bold text-base-content">+00%</Hidden></span>
                    </div>
                ))}
            </div>
        </div>
    </Panel>
);

const DrawdownTeaser = () => (
    <Panel title="Drawdown" aside={<span className="text-xs text-base-content/60">vs the S&amp;P 500</span>} className="h-full">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {["Worst drop", "S&P 500 worst", "Recovered in", "From the high"].map((k) => (
                <div key={k}>
                    <p className="text-xs text-base-content/60">{k}</p>
                    <Hidden className="text-xl font-bold text-error">-00.0%</Hidden>
                </div>
            ))}
        </div>
        <svg viewBox="0 0 400 140" preserveAspectRatio="none" className="mt-5 h-40 w-full blur-[1px]" aria-hidden="true">
            <path d="M0 4 L40 6 L60 30 L80 10 L120 4 L150 60 L180 110 L210 90 L240 40 L260 6 L300 4 L320 50 L335 20 L360 6 L400 4 L400 0 L0 0 Z" fill="var(--color-error)" fillOpacity="0.25" />
            <path d="M0 4 L40 6 L60 30 L80 10 L120 4 L150 60 L180 110 L210 90 L240 40 L260 6 L300 4 L320 50 L335 20 L360 6 L400 4" fill="none" stroke="var(--color-error)" strokeWidth="1.5" />
            <path d="M0 4 L40 5 L60 20 L80 8 L120 4 L150 40 L180 70 L210 60 L240 30 L260 6 L300 4 L320 35 L335 15 L360 5 L400 4" fill="none" stroke="currentColor" strokeOpacity="0.4" strokeDasharray="4 4" />
        </svg>
    </Panel>
);

// Bubbles: [x%, y%, size, up]
const BUBBLES: [number, number, number, boolean][] = [
    [18, 58, 26, true], [24, 62, 18, true], [30, 55, 14, true], [42, 48, 22, false], [48, 62, 20, true],
    [52, 40, 12, true], [58, 70, 16, false], [64, 30, 10, true], [70, 52, 18, true], [78, 22, 9, false],
    [84, 66, 12, true], [36, 74, 8, true], [60, 82, 7, false], [88, 14, 8, true], [26, 44, 10, true],
];

const RiskMapTeaser = () => (
    <Panel title="Risk vs return" aside={<span className="text-xs text-base-content/60">Past year, against the S&amp;P 500</span>} className="h-full">
        <div className="relative h-64 rounded-xl border border-base-300/60">
            <span className="absolute left-2 top-2 text-[10px] text-base-content/50">Beat the S&amp;P, less risk</span>
            <span className="absolute right-2 top-2 text-[10px] text-base-content/50">Beat the S&amp;P, more risk</span>
            <span className="absolute bottom-2 left-2 text-[10px] text-base-content/50">Trailed, less risk</span>
            <span className="absolute bottom-2 right-2 text-[10px] text-base-content/50">Trailed, more risk</span>
            <span className="absolute inset-y-0 left-[22%] border-l border-dashed border-base-content/20" />
            <span className="absolute inset-x-0 top-[56%] border-t border-dashed border-base-content/20" />
            {BUBBLES.map(([x, y, r, up], i) => (
                <span key={i} className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border blur-[1px] ${up ? "border-success/70 bg-success/30" : "border-error/70 bg-error/30"}`}
                    style={{ left: `${x}%`, top: `${y}%`, width: r * 2, height: r * 2 }} />
            ))}
        </div>
    </Panel>
);

export const DashboardTeaser = () => (
    // Mirrors the live page's order, top to bottom, so scrolling shows how much
    // is behind the lock.
    <div className="space-y-6">
        <SwitcherTeaser />
        {/* Headline numbers: labels readable, values not. */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {KPIS.map((k) => (
                <div key={k.label} className="rounded-2xl border border-base-300 bg-base-100 p-4">
                    <p className="text-xs font-medium text-base-content/60">{k.label}</p>
                    <Hidden className={`mt-1 text-2xl font-bold ${k.tone}`}>{k.value}</Hidden>
                </div>
            ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-12">
            <Panel
                title="Performance"
                className="min-w-0 lg:col-span-8"
                aside={
                    <div className="flex gap-1 text-[10px] font-semibold">
                        {["1M", "6M", "1Y", "5Y"].map((r) => (
                            <span key={r} className={`rounded-md px-2 py-0.5 ${r === "5Y" ? "bg-primary text-primary-content" : "text-base-content/60"}`}>{r}</span>
                        ))}
                    </div>
                }
            >
                <div className="mb-2 flex gap-4 text-xs text-base-content/70">
                    <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-success" />Portfolio</span>
                    <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 border-t-2 border-dashed border-base-content/40" />S&amp;P 500</span>
                </div>
                <PerformanceLoop />
            </Panel>
            <div className="min-w-0 lg:col-span-4"><SpotlightTeaser /></div>
        </div>

        {/* Holdings list and the selected holding's detail share one card. */}
        <div className="grid gap-4 xl:grid-cols-12">
            <div className="flex flex-col overflow-hidden rounded-2xl border border-base-300 bg-base-100 lg:flex-row xl:col-span-9">
                <div className="p-4 lg:w-96 lg:shrink-0 lg:border-r lg:border-base-300">
                    <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-base-content">Live positions</h3>
                        <LiveDot />
                    </div>
                    <p className="mb-3 text-xs text-base-content/60">Sort · Weight · Return · A–Z</p>
                    <div className="space-y-3">
                        {ROWS.map((r, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <span className={`h-8 w-8 shrink-0 rounded-lg ${r.logo} opacity-80 blur-[2px]`} />
                                <div className="min-w-0 flex-1 space-y-1.5">
                                    <Hidden className="text-sm font-semibold text-base-content">TICK</Hidden>
                                    <div className="h-1.5 rounded-full bg-base-200">
                                        <div className={`h-full rounded-full bg-primary/60 ${r.w}`} />
                                    </div>
                                </div>
                                <Hidden className={`text-sm font-semibold ${r.up ? "text-success" : "text-error"}`}>{r.ret}</Hidden>
                            </div>
                        ))}
                    </div>
                </div>
                <DetailTeaser />
            </div>
            <Panel title="Allocation" className="xl:col-span-3">
                <div className="flex items-center gap-5 xl:flex-col xl:items-start">
                    <div
                        className="relative h-32 w-32 shrink-0 rounded-full blur-[1px]"
                        style={{ background: "conic-gradient(var(--color-primary) 0 34%, var(--color-success) 0 56%, var(--color-warning) 0 71%, var(--color-secondary) 0 84%, var(--color-info) 0 100%)" }}
                    >
                        <div className="absolute inset-[22%] rounded-full bg-base-100" />
                    </div>
                    <ul className="space-y-2 text-xs">
                        {["bg-primary", "bg-success", "bg-warning", "bg-secondary", "bg-info"].map((c) => (
                            <li key={c} className="flex items-center gap-2">
                                <span className={`h-2.5 w-2.5 rounded-sm ${c}`} />
                                <Hidden className="text-base-content/80">Sector 00%</Hidden>
                            </li>
                        ))}
                    </ul>
                </div>
            </Panel>
        </div>

        <div className="grid gap-4 lg:grid-cols-12">
            <Panel title="Today's heatmap" aside={<LiveDot />} className="min-w-0 lg:col-span-7 xl:col-span-8">
                <div className="grid h-72 grid-flow-dense grid-cols-5 grid-rows-3 gap-1.5">
                    {TILES.map(([span, tint], i) => (
                        <div
                            key={i}
                            className={`${span} ${tint} flex items-center justify-center rounded-md motion-safe:animate-pulse`}
                            style={{ animationDelay: `${(i * 0.7) % 3}s`, animationDuration: "3s" }}
                        >
                            <Hidden className="text-xs font-semibold text-base-content/80">+0.0%</Hidden>
                        </div>
                    ))}
                </div>
            </Panel>
            <div className="min-w-0 lg:col-span-5 xl:col-span-4"><DriversTeaser /></div>
        </div>

        <CalendarTeaser />

        <div className="grid gap-4 xl:grid-cols-2">
            <DrawdownTeaser />
            <RiskMapTeaser />
        </div>
    </div>
);
