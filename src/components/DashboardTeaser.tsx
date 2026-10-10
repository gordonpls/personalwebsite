// What a locked visitor sees behind the password card: the dashboard's shape,
// colors, and labels, with every value blurred out. Labels stay crisp ("Total
// return", "vs S&P 500") so it's clear what's there; only the numbers hide.
//
// Every value here is invented and has no relation to the real portfolio.
// Plain markup + CSS only (no fetches, no charts lib) so the locked page stays
// cheap; blur is applied per element, never to one huge layer.

import { useEffect, useState } from "react";

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

export const DashboardTeaser = () => (
    <div className="space-y-4">
        {/* Headline numbers: labels readable, values not. */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {KPIS.map((k) => (
                <div key={k.label} className="rounded-2xl border border-base-300 bg-base-100 p-4">
                    <p className="text-xs font-medium text-base-content/60">{k.label}</p>
                    <Hidden className={`mt-1 text-2xl font-bold ${k.tone}`}>{k.value}</Hidden>
                </div>
            ))}
        </div>

        <div className="flex flex-col gap-4 lg:flex-row">
            <Panel title="Holdings" aside={<LiveDot />} className="lg:w-96 lg:shrink-0">
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
            </Panel>

            <Panel
                title="Performance"
                className="flex-1"
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
        </div>

        <div className="flex flex-col gap-4 lg:flex-row">
            <Panel title="Allocation" className="lg:w-96 lg:shrink-0">
                <div className="flex items-center gap-5">
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

            <Panel title="Today's heatmap" aside={<LiveDot />} className="flex-1">
                <div className="grid h-40 grid-flow-dense grid-cols-5 grid-rows-3 gap-1.5">
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
        </div>
    </div>
);
