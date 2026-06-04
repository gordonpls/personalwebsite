// Projects showcase: card grid linking out to each interactive project.
// Each card renders an inline-SVG preview so we don't ship screenshots, and
// gets a hover animation specific to its visualization (donut spins, line
// re-draws, peg pulses) plus a card-wide lift + "open in new tab" hint.

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface Project {
    title: string;
    href: string;
    tag: string;
    accent: string;          // Tailwind text color class for accents
    glow: string;            // group-hover gradient stops (Tailwind classes)
    description: string;
    tags: string[];
    preview: React.ReactNode;
}

// Inline donut: 5 arcs around an origin-centered viewBox so we can rotate the
// whole group on hover via a CSS transform.
const DonutPreview = () => {
    const SEGMENTS = [
        { from: 0.0, to: 0.27, color: "#E8A020" },
        { from: 0.27, to: 0.5, color: "#378ADD" },
        { from: 0.5, to: 0.69, color: "#1D9E75" },
        { from: 0.69, to: 0.85, color: "#7F77DD" },
        { from: 0.85, to: 1.0, color: "#D85A30" },
    ];
    const r = 36, sw = 18;
    const arc = (from: number, to: number) => {
        const a0 = from * 2 * Math.PI - Math.PI / 2;
        const a1 = to * 2 * Math.PI - Math.PI / 2;
        const large = to - from > 0.5 ? 1 : 0;
        return `M ${(r * Math.cos(a0)).toFixed(2)} ${(r * Math.sin(a0)).toFixed(2)} A ${r} ${r} 0 ${large} 1 ${(r * Math.cos(a1)).toFixed(2)} ${(r * Math.sin(a1)).toFixed(2)}`;
    };
    return (
        <svg viewBox="0 0 200 120" className="w-full h-full" aria-hidden="true">
            <g transform="translate(100 64)" className="origin-center transition-transform duration-[2500ms] ease-out group-hover:rotate-[140deg]">
                {SEGMENTS.map((s, i) => (
                    <path key={i} d={arc(s.from, s.to)} fill="none" stroke={s.color} strokeWidth={sw} />
                ))}
            </g>
        </svg>
    );
};

// Inline line chart: trending up, gradient fill below, line redraws on hover.
const LinePreview = () => (
    <svg viewBox="0 0 200 120" className="w-full h-full" aria-hidden="true">
        <defs>
            <linearGradient id="gainGrad" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#1D9E75" stopOpacity="0.45" />
                <stop offset="1" stopColor="#1D9E75" stopOpacity="0" />
            </linearGradient>
        </defs>
        <line x1="20" y1="40" x2="180" y2="40" stroke="currentColor" strokeOpacity="0.06" />
        <line x1="20" y1="70" x2="180" y2="70" stroke="currentColor" strokeOpacity="0.06" />
        <line x1="20" y1="100" x2="180" y2="100" stroke="currentColor" strokeOpacity="0.06" />
        <path d="M 20 95 L 45 82 L 70 86 L 95 65 L 120 55 L 150 35 L 180 30 L 180 110 L 20 110 Z" fill="url(#gainGrad)" />
        <path
            d="M 20 95 L 45 82 L 70 86 L 95 65 L 120 55 L 150 35 L 180 30"
            stroke="#1D9E75"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="project-line"
        />
        <circle cx="180" cy="30" r="3" fill="#1D9E75" className="opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    </svg>
);

// Inline cookie: stylized closed fortune cookie that "shakes" on hover.
// Different centering approach from previous iterations: the viewBox itself
// is calibrated so the cookie's geometric center (-2, -5) lands at the
// viewBox center, and the cookie paths use their natural coordinates with
// NO translate/scale transform. The SVG container is then a flex box that
// centers a square-ish SVG horizontally in the preview band, sized by CSS.
// Result: cookie is always centered in its SVG, the SVG is always centered
// in the preview band, with no transform math to drift out of alignment.
const CookiePreview = () => (
    <div className="flex items-center justify-center w-full h-full">
        <svg
            viewBox="-72 -85 140 160"
            className="h-full w-auto max-h-full"
            aria-hidden="true"
            preserveAspectRatio="xMidYMid meet"
        >
            <defs>
                <linearGradient id="ckPrevBody" x1="0.2" y1="0" x2="0.7" y2="1">
                    <stop offset="0" stopColor="#F8CB7C" />
                    <stop offset="0.5" stopColor="#E5A24B" />
                    <stop offset="1" stopColor="#B97623" />
                </linearGradient>
            </defs>
            <g className="transition-transform duration-300 group-hover:rotate-[-3deg]" style={{ transformOrigin: "center", transformBox: "fill-box" }}>
                {/* Right lobe (drawn first; left tucks it behind near the V valley) */}
                <path
                    d="M 16 -50 L 36 -64 L 50 -44 Q 66 -12 56 22 Q 42 52 14 56 Q -2 56 2 44 Q 12 -8 16 -50 Z"
                    fill="url(#ckPrevBody)" stroke="#7E4F18" strokeWidth="3" strokeLinejoin="round"
                />
                {/* Left lobe — slightly taller, drawn on top */}
                <path
                    d="M -20 -54 L -42 -68 L -54 -46 Q -68 -12 -58 22 Q -44 52 -14 58 Q 2 56 -2 44 Q -14 -10 -20 -54 Z"
                    fill="url(#ckPrevBody)" stroke="#7E4F18" strokeWidth="3" strokeLinejoin="round"
                />
                {/* Soft highlights on the bulging outer faces */}
                <path d="M -22 -40 Q -40 -22 -50 0" stroke="#FFF1C8" strokeWidth="6" fill="none" strokeLinecap="round" opacity="0.55" />
                <path d="M 18 -38 Q 36 -20 46 0" stroke="#FFF1C8" strokeWidth="6" fill="none" strokeLinecap="round" opacity="0.55" />
            </g>
        </svg>
    </div>
);

// Inline peg: dashed $1 reference + a near-flat wobble line + pulsing dot on hover.
const PegPreview = () => (
    <svg viewBox="0 0 200 120" className="w-full h-full" aria-hidden="true">
        <line x1="20" y1="60" x2="180" y2="60" stroke="currentColor" strokeOpacity="0.25" strokeDasharray="3 4" />
        <text x="183" y="63" fontSize="9" fill="currentColor" opacity="0.45" fontFamily="ui-monospace, monospace">$1</text>
        <path
            d="M 20 62 L 35 58 L 50 61 L 65 57 L 80 60 L 95 63 L 110 58 L 125 61 L 140 59 L 155 61 L 170 60"
            stroke="#378ADD"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="group-hover:opacity-100 opacity-90 transition-opacity"
        />
        {/* pulsing latest point */}
        <g className="opacity-70 group-hover:opacity-100">
            <circle cx="170" cy="60" r="3" fill="#378ADD" />
            <circle cx="170" cy="60" r="3" fill="#378ADD" className="project-peg-pulse" />
        </g>
    </svg>
);

const PROJECTS: Project[] = [
    {
        title: "Allocation",
        href: "/allocation",
        tag: "Interactive",
        accent: "text-warning",
        glow: "from-warning/15 via-warning/0 to-primary/10",
        description:
            "A risk-tolerance quiz that drives an interactive hypothetical portfolio simulator. Tweak the equity split, replay historical drawdowns, and see the trade-off between risk and return.",
        tags: ["Quiz", "Simulator", "Backtest"],
        preview: <DonutPreview />,
    },
    {
        title: "Portfolio",
        href: "/portfolio",
        tag: "Live",
        accent: "text-success",
        glow: "from-success/15 via-success/0 to-primary/10",
        description:
            "My live brokerage holdings: heatmap, dividend-adjusted performance vs the S&P 500, sector allocation, and per-holding analytics. Powered by a scheduled Plaid ingestion pipeline with a pre-computed serving layer.",
        tags: ["Plaid", "Recharts", "Express"],
        preview: <LinePreview />,
    },
    {
        title: "Stablecoin Dashboard",
        href: "/stablecoin",
        tag: "Daily snapshots",
        accent: "text-info",
        glow: "from-info/15 via-info/0 to-secondary/10",
        description:
            "A Streamlit dashboard tracking ~320 stablecoins by supply, peg deviation, liquidity depth, and reserve freshness, rolled into an explainable weighted risk score. Updated nightly.",
        tags: ["Streamlit", "SQLite", "Python"],
        preview: <PegPreview />,
    },
    {
        title: "Daily Fortune",
        href: "/fortune",
        tag: "Generative",
        accent: "text-error",
        glow: "from-error/20 via-error/0 to-primary/10",
        description:
            "A daily fortune cookie with a crack animation, lucky numbers, a Chinese phrase of the day, and a shareable card you can download. A mulberry32 PRNG seeded by (date, IP-hash) locks each visitor's payload for the calendar day.",
        tags: ["Framer Motion", "Canvas", "Web Speech"],
        preview: <CookiePreview />,
    },
];

const ProjectCard = ({ p }: { p: Project }) => (
    <a
        href={p.href}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative flex flex-col h-full overflow-hidden rounded-2xl bg-base-100 border border-base-300 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
        {/* Soft hover gradient backdrop */}
        <div className={`pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${p.glow}`} />

        {/* Top-right "open in new tab" indicator */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1 text-[10px] font-medium text-base-content/40 group-hover:text-primary transition-colors">
            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">Open</span>
            <span className="text-sm">↗</span>
        </div>

        {/* Preview band */}
        <div className="relative h-44 bg-gradient-to-br from-base-200 to-base-300 overflow-hidden border-b border-base-300">
            <div className="absolute inset-0 p-4">
                {p.preview}
            </div>
            {/* subtle scanline shimmer on hover */}
            <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className="project-shimmer absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-base-content/5 to-transparent" />
            </div>
        </div>

        {/* Body */}
        <div className="p-5 relative flex-1 flex flex-col">
            <div className="flex items-baseline justify-between gap-3 mb-1.5">
                {/* truncate → title is always one line, so a narrow peek column
                    can't make it wrap and grow the card. */}
                <h3 className="text-lg font-bold text-base-content group-hover:text-primary transition-colors truncate min-w-0">{p.title}</h3>
                <span className={`shrink-0 text-[10px] uppercase tracking-widest font-semibold ${p.accent}`}>{p.tag}</span>
            </div>
            {/* Each text region is a fixed height (title 1 line, description a
                3-line block, tags a single non-wrapping row) so the card is the
                same height regardless of how wide its column is or how long the
                copy is — otherwise the grid row, and the page, shift on nav. */}
            <p className="text-sm text-base-content/70 leading-snug line-clamp-3 min-h-[3.6rem]">{p.description}</p>
            <div className="flex flex-nowrap gap-1.5 mt-auto pt-3 overflow-hidden">
                {p.tags.map((t) => (
                    <span key={t} className="badge badge-sm badge-ghost text-[10px] shrink-0">{t}</span>
                ))}
            </div>
        </div>
    </a>
);

// Featured hero: the live Portfolio app gets a wide card at the top of the
// section (line chart on one side, copy + CTA on the other); the remaining
// projects sit in a carousel below.
const portfolio = PROJECTS.find((p) => p.title === "Portfolio") as Project;
const otherProjects = PROJECTS.filter((p) => p.title !== "Portfolio");

const FeaturedHero = () => (
    <a
        href={portfolio.href}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative block overflow-hidden rounded-2xl bg-base-100 border border-primary/40 ring-1 ring-primary/20 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:ring-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
        <div className={`pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${portfolio.glow}`} />
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr]">
            {/* Preview band */}
            <div className="relative h-56 lg:h-auto bg-gradient-to-br from-base-200 to-base-300 overflow-hidden border-b lg:border-b-0 lg:border-r border-base-300">
                <div className="absolute inset-0 p-6"><LinePreview /></div>
                <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="project-shimmer absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-base-content/5 to-transparent" />
                </div>
            </div>
            {/* Body */}
            <div className="p-6 md:p-8 relative flex flex-col justify-center">
                <div className="flex items-center justify-between gap-3 mb-3">
                    <span className="badge badge-sm badge-primary text-[10px] uppercase tracking-widest font-semibold">★ Featured</span>
                    <span className={`flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-semibold ${portfolio.accent}`}>
                        {/* Green pulsing dot: outer ping ring + solid inner pip */}
                        <span className="relative flex h-2 w-2" aria-hidden="true">
                            <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-75 animate-ping" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                        </span>
                        {portfolio.tag}
                    </span>
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-base-content group-hover:text-primary transition-colors">Every stock I hold, out in the open</h3>
                <p className="text-sm md:text-base text-base-content/70 leading-relaxed mt-2">{portfolio.description}</p>
                <div className="flex flex-wrap gap-1.5 mt-4">
                    {portfolio.tags.map((t) => (
                        <span key={t} className="badge badge-sm badge-ghost text-[10px]">{t}</span>
                    ))}
                </div>
                <span className="inline-flex items-center gap-1.5 mt-5 text-sm font-semibold text-primary">
                    Open the live dashboard
                    <span className="transition-transform group-hover:translate-x-1">↗</span>
                </span>
            </div>
        </div>
    </a>
);

const ChevronIcon = ({ dir }: { dir: "left" | "right" }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="w-5 h-5" aria-hidden="true">
        {dir === "left"
            ? <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            : <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
);

// A positioning wrapper centers the button via flex (no transform), so the
// button's own hover/active transforms can't clobber the vertical centering —
// otherwise DaisyUI's :active transform drops the button on click ("bounce").
const ArrowButton = ({ dir, onClick, side }: { dir: "left" | "right"; onClick: () => void; side: "left" | "right" }) => (
    <div className={`absolute inset-y-0 z-20 flex items-center ${side === "left" ? "left-1 md:left-2" : "right-1 md:right-2"}`}>
        <button
            type="button"
            onClick={onClick}
            aria-label={dir === "left" ? "Previous project" : "Next project"}
            className="btn btn-circle btn-sm md:btn-md bg-base-100/95 border border-base-300 shadow-md hover:bg-base-100 hover:scale-110 transition-transform"
        >
            <ChevronIcon dir={dir} />
        </button>
    </div>
);

const SWIPE_THRESHOLD = 40; // px of horizontal travel that counts as a swipe
// After this many ms of no interaction, the spotlight rewinds back into auto mode.
const SPOTLIGHT_IDLE_MS = 2500;

// Default mode: a continuous auto-scrolling marquee of all cards that pauses on
// hover. Arrows + swipe live in ProjectsCarousel so they sit above this and are
// never remounted when the mode switches.
const AutoCarousel = ({ projects }: { projects: Project[] }) => {
    const [paused, setPaused] = useState(false);
    // Duplicate once so a 50% translate loops seamlessly.
    const items = [...projects, ...projects];
    return (
        <div className="overflow-hidden rounded-2xl project-carousel-fade">
            <div
                data-paused={paused}
                className="flex gap-4 md:gap-6 project-carousel-track py-1"
                onMouseEnter={() => setPaused(true)}
                onMouseLeave={() => setPaused(false)}
            >
                {items.map((p, i) => (
                    <div
                        key={`${p.title}-${i}`}
                        className="flex-shrink-0 w-[22rem] md:w-[32rem] transition-transform duration-300 hover:scale-[1.02] hover:z-10 relative"
                    >
                        <ProjectCard p={p} />
                    </div>
                ))}
            </div>
        </div>
    );
};

// Spotlight: the focused card centered between dimmed peeks. Clicking a peek
// shifts focus to it (onFocus) instead of opening it — only the centered card's
// link opens. Arrows / swipe are handled by the parent.
const SpotlightCarousel = ({
    projects,
    centerIndex,
    onFocus,
}: {
    projects: Project[];
    centerIndex: number;
    onFocus: (dir: "prev" | "next") => void;
}) => {
    const n = projects.length;
    const prev = projects[(centerIndex - 1 + n) % n];
    const center = projects[centerIndex];
    const next = projects[(centerIndex + 1) % n];

    // Intercept a peek click in the capture phase so the card's <a> never
    // navigates; shift focus to that card instead.
    const focusOnClick = (dir: "prev" | "next") => (e: React.MouseEvent) => {
        e.preventDefault();
        onFocus(dir);
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            {/* Desktop: 3-column layout with center spotlight + clickable peeks */}
            <div className="hidden md:grid grid-cols-[1fr_2fr_1fr] gap-4 lg:gap-6 items-stretch">
                <motion.div
                    onClickCapture={focusOnClick("prev")}
                    role="button"
                    aria-label={`Focus ${prev.title}`}
                    initial={{ opacity: 0, scale: 0.7, x: 30 }}
                    animate={{ opacity: 0.5, scale: 0.9, x: 0 }}
                    whileHover={{ opacity: 0.85, scale: 0.92 }}
                    transition={{ duration: 0.45, ease: "easeOut" }}
                    className="origin-right cursor-pointer"
                >
                    <ProjectCard p={prev} />
                </motion.div>
                <motion.div
                    key={center.title}
                    initial={{ opacity: 0.5, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.45, ease: "easeOut" }}
                    className="z-10"
                >
                    <ProjectCard p={center} />
                </motion.div>
                <motion.div
                    onClickCapture={focusOnClick("next")}
                    role="button"
                    aria-label={`Focus ${next.title}`}
                    initial={{ opacity: 0, scale: 0.7, x: -30 }}
                    animate={{ opacity: 0.5, scale: 0.9, x: 0 }}
                    whileHover={{ opacity: 0.85, scale: 0.92 }}
                    transition={{ duration: 0.45, ease: "easeOut" }}
                    className="origin-left cursor-pointer"
                >
                    <ProjectCard p={next} />
                </motion.div>
            </div>
            {/* Mobile: just the center card, peeks hidden */}
            <motion.div
                key={`m-${center.title}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="md:hidden select-none"
            >
                <ProjectCard p={center} />
            </motion.div>
        </motion.div>
    );
};

const ProjectsCarousel = ({ projects }: { projects: Project[] }) => {
    const n = projects.length;
    const [mode, setMode] = useState<"auto" | "spotlight">("auto");
    const [centerIndex, setCenterIndex] = useState(0);
    const [hovering, setHovering] = useState(false);
    const touchStartX = useRef<number | null>(null);
    const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const navigate = (dir: "prev" | "next") =>
        setCenterIndex((i) => (dir === "next" ? (i + 1) % n : (i - 1 + n) % n));

    // Arrows, swipe, and peek clicks all route here: enter spotlight + move focus.
    const handleNav = (dir: "prev" | "next") => {
        setMode("spotlight");
        navigate(dir);
    };

    // In spotlight, rewind to the marquee after a spell of no interaction.
    useEffect(() => {
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        if (mode !== "spotlight" || hovering) return;
        idleTimerRef.current = setTimeout(() => setMode("auto"), SPOTLIGHT_IDLE_MS);
        return () => { if (idleTimerRef.current) clearTimeout(idleTimerRef.current); };
    }, [mode, hovering, centerIndex]);

    const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
    const onTouchEnd = (e: React.TouchEvent) => {
        const startX = touchStartX.current;
        touchStartX.current = null;
        if (startX == null) return;
        const dx = e.changedTouches[0].clientX - startX;
        if (Math.abs(dx) > SWIPE_THRESHOLD) handleNav(dx < 0 ? "next" : "prev");
    };

    return (
        <div>
            {/* The arrows are rendered here, outside the swapped carousels, so they
                are the same DOM node in both modes — never remounted, so a click
                immediately after entering spotlight always lands. */}
            <div
                className="relative max-w-7xl mx-auto touch-pan-y"
                onMouseEnter={() => setHovering(true)}
                onMouseLeave={() => setHovering(false)}
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
            >
                {mode === "spotlight" ? (
                    <SpotlightCarousel projects={projects} centerIndex={centerIndex} onFocus={navigate} />
                ) : (
                    <AutoCarousel projects={projects} />
                )}
                <ArrowButton dir="left" side="left" onClick={() => handleNav("prev")} />
                <ArrowButton dir="right" side="right" onClick={() => handleNav("next")} />
            </div>

            {/* Always rendered so its height is reserved in both modes — toggling
                only opacity/interactivity avoids a vertical jump when entering or
                leaving spotlight (via arrows or the idle timeout). */}
            <div className="flex justify-center mt-2">
                <button
                    type="button"
                    onClick={() => setMode("auto")}
                    aria-hidden={mode !== "spotlight"}
                    tabIndex={mode === "spotlight" ? 0 : -1}
                    className={`btn btn-ghost btn-xs gap-1.5 text-base-content/70 transition-opacity duration-200 ${mode === "spotlight" ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                        <polygon points="5 3 19 12 5 21 5 3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Resume auto-play
                </button>
            </div>
        </div>
    );
};

export const Projects = () => (
    <section className="space-y-5">
        <div className="flex items-end flex-wrap gap-x-6 gap-y-2">
            <div className="shrink-0">
                <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold">Projects</p>
                <h2 className="text-2xl md:text-3xl font-bold text-base-content mt-1">Things I&apos;ve been building</h2>
            </div>
            <p className="text-sm text-base-content/60 flex-1 min-w-[16rem]">
                A few interactive apps; each one opens in a new tab. Hover to pause the carousel, use the arrows, or swipe on mobile.
            </p>
        </div>

        <div className="max-w-7xl mx-auto">
            <FeaturedHero />
        </div>

        <ProjectsCarousel projects={otherProjects} />
    </section>
);
