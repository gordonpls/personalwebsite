// Projects showcase: card grid linking out to each interactive project.
// Each card renders an inline-SVG preview so we don't ship screenshots, and
// gets a hover animation specific to its visualization (donut spins, line
// re-draws, peg pulses) plus a card-wide lift + "open in new tab" hint.

import { useState, useEffect, useRef, useId } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { SectionHeading } from "./SectionHeading";
import { useFinanceUnlocked } from "../services/financeAuth";

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
        <svg viewBox="0 0 200 120" className="project-donut w-full h-full" aria-hidden="true">
            <g transform="translate(100 64)" className="origin-center transition-transform duration-[2500ms] ease-out group-hover:rotate-[140deg]">
                {SEGMENTS.map((s, i) => (
                    <path key={i} d={arc(s.from, s.to)} fill="none" stroke={s.color} strokeWidth={sw} />
                ))}
            </g>
        </svg>
    );
};

// Inline line chart: trending up, gradient fill below, line redraws on hover.
// Gradient ids are per instance: the same preview renders in several places
// (some hidden by breakpoint), and a url(#id) that resolves to a gradient
// inside a display:none SVG paints nothing.
const LinePreview = () => {
    const grad = useId();
    return (
    <svg viewBox="0 0 200 120" className="w-full h-full" aria-hidden="true">
        <defs>
            <linearGradient id={grad} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#1D9E75" stopOpacity="0.45" />
                <stop offset="1" stopColor="#1D9E75" stopOpacity="0" />
            </linearGradient>
        </defs>
        <line x1="20" y1="40" x2="180" y2="40" stroke="currentColor" strokeOpacity="0.06" />
        <line x1="20" y1="70" x2="180" y2="70" stroke="currentColor" strokeOpacity="0.06" />
        <line x1="20" y1="100" x2="180" y2="100" stroke="currentColor" strokeOpacity="0.06" />
        <path d="M 20 95 L 45 82 L 70 86 L 95 65 L 120 55 L 150 35 L 180 30 L 180 110 L 20 110 Z" fill={`url(#${grad})`} />
        <path
            d="M 20 95 L 45 82 L 70 86 L 95 65 L 120 55 L 150 35 L 180 30"
            stroke="#1D9E75"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="project-line"
        />
        <circle cx="180" cy="30" r="3" fill="#1D9E75" className="opacity-0 group-hover:opacity-100 group-data-[play]:opacity-100 transition-opacity duration-500" />
    </svg>
    );
};

// Inline cookie: stylized closed fortune cookie that "shakes" on hover.
// Different centering approach from previous iterations: the viewBox itself
// is calibrated so the cookie's geometric center (-2, -5) lands at the
// viewBox center, and the cookie paths use their natural coordinates with
// NO translate/scale transform. The SVG container is then a flex box that
// centers a square-ish SVG horizontally in the preview band, sized by CSS.
// Result: cookie is always centered in its SVG, the SVG is always centered
// in the preview band, with no transform math to drift out of alignment.
const CookiePreview = () => {
    const grad = useId();
    return (
    <div className="flex items-center justify-center w-full h-full">
        <svg
            viewBox="-72 -85 140 160"
            className="project-cookie h-full w-auto max-h-full"
            aria-hidden="true"
            preserveAspectRatio="xMidYMid meet"
        >
            <defs>
                <linearGradient id={grad} x1="0.2" y1="0" x2="0.7" y2="1">
                    <stop offset="0" stopColor="#F8CB7C" />
                    <stop offset="0.5" stopColor="#E5A24B" />
                    <stop offset="1" stopColor="#B97623" />
                </linearGradient>
            </defs>
            <g className="transition-transform duration-300 group-hover:rotate-[-3deg]" style={{ transformOrigin: "center", transformBox: "fill-box" }}>
                {/* Right lobe (drawn first; left tucks it behind near the V valley) */}
                <path
                    d="M 16 -50 L 36 -64 L 50 -44 Q 66 -12 56 22 Q 42 52 14 56 Q -2 56 2 44 Q 12 -8 16 -50 Z"
                    fill={`url(#${grad})`} stroke="#7E4F18" strokeWidth="3" strokeLinejoin="round"
                />
                {/* Left lobe — slightly taller, drawn on top */}
                <path
                    d="M -20 -54 L -42 -68 L -54 -46 Q -68 -12 -58 22 Q -44 52 -14 58 Q 2 56 -2 44 Q -14 -10 -20 -54 Z"
                    fill={`url(#${grad})`} stroke="#7E4F18" strokeWidth="3" strokeLinejoin="round"
                />
                {/* Soft highlights on the bulging outer faces */}
                <path d="M -22 -40 Q -40 -22 -50 0" stroke="#FFF1C8" strokeWidth="6" fill="none" strokeLinecap="round" opacity="0.55" />
                <path d="M 18 -38 Q 36 -20 46 0" stroke="#FFF1C8" strokeWidth="6" fill="none" strokeLinecap="round" opacity="0.55" />
            </g>
        </svg>
    </div>
    );
};

// Inline peg: dashed $1 reference + a near-flat peg line that redraws on hover
// (same treatment as the Portfolio line chart) + a pulsing dot.
const PegPreview = () => (
    <svg viewBox="0 0 200 120" className="w-full h-full" aria-hidden="true">
        <line x1="20" y1="60" x2="180" y2="60" stroke="currentColor" strokeOpacity="0.25" strokeDasharray="3 4" />
        <text x="183" y="63" fontSize="9" fill="currentColor" opacity="0.45" fontFamily="ui-monospace, monospace">$1</text>
        {/* Peg line redraws on hover (project-line: stroke-dashoffset sweep). */}
        <path
            d="M 20 62 L 35 58 L 50 61 L 65 57 L 80 60 L 95 63 L 110 58 L 125 61 L 140 59 L 155 61 L 170 60"
            stroke="#378ADD"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="project-line"
        />
        {/* Pulsing latest point, revealed on hover like the portfolio dot. */}
        <circle cx="170" cy="60" r="3" fill="#378ADD" className="opacity-0 group-hover:opacity-100 group-data-[play]:opacity-100 transition-opacity duration-500" />
        <circle cx="170" cy="60" r="3" fill="#378ADD" className="project-peg-pulse opacity-0 group-hover:opacity-100 group-data-[play]:opacity-100" />
    </svg>
);

// Slug used for analytics event tracking
const PROJECT_SLUGS: Record<string, string> = {
    "/allocation": "allocation-quiz",
    "/investments": "investing-dashboard",
    "/stablecoin": "stablecoin-dashboard",
    "/fortune": "fortune-cookie",
};

const PROJECTS: Project[] = [
    {
        title: "Allocation Quiz",
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
        title: "Investing Dashboard",
        href: "/investments",
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
        title: "Daily Fortune Cookie",
        href: "/fortune",
        tag: "Generative",
        accent: "text-error",
        glow: "from-error/20 via-error/0 to-primary/10",
        description:
            "A daily fortune cookie with a cracking animation, lucky numbers, a Chinese phrase of the day, and a shareable card you can download. A mulberry32 PRNG seeded by (date, IP-hash) locks each visitor's payload for the calendar day.",
        tags: ["Framer Motion", "Canvas", "Web Speech"],
        preview: <CookiePreview />,
    },
];

const ProjectCard = ({ p }: { p: Project }) => (
    <a
        href={p.href}
        target="_blank"
        rel="noopener noreferrer"
        data-track="project_card_clicked"
        data-project={PROJECT_SLUGS[p.href] ?? p.href.replace("/", "")}
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
const portfolio = PROJECTS.find((p) => p.title === "Investing Dashboard") as Project;
const otherProjects = PROJECTS.filter((p) => p.title !== "Investing Dashboard");

const PadlockIcon = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={className} aria-hidden="true">
        <rect x="4" y="11" width="16" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" strokeLinecap="round" />
    </svg>
);

// The dashboard is password-gated; until this browser has unlocked it, the hero
// stays low-key about it: a softly blurred chart that sharpens on hover, with
// a quiet "Private" tag over it in place of the live pulse. The dashboard page itself
// asks for the password.
const FeaturedHero = () => {
    const unlocked = useFinanceUnlocked();
    return (
        <a
            href={portfolio.href}
            target="_blank"
            rel="noopener noreferrer"
            data-track="project_card_clicked"
            data-project={PROJECT_SLUGS[portfolio.href] ?? "investing-dashboard"}
            data-locked={unlocked ? undefined : "true"}
            className="group relative block overflow-hidden rounded-2xl bg-base-100 border border-primary/40 ring-1 ring-primary/20 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:ring-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
            <div className={`pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${portfolio.glow}`} />
            <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr]">
                {/* Preview band */}
                <div className="relative h-56 lg:h-auto bg-gradient-to-br from-base-200 to-base-300 overflow-hidden border-b lg:border-b-0 lg:border-r border-base-300">
                    <div className={`absolute inset-0 p-6 transition-[filter] duration-500 ${unlocked ? "" : "blur-[3px] group-hover:blur-[1px]"}`}>
                        <LinePreview />
                    </div>
                    {!unlocked && (
                        // Sits over the blurred chart so the lock reads as "this
                        // graphic is private", not as a status on the copy.
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="flex items-center gap-1.5 rounded-full border border-base-300 bg-base-100/90 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-base-content/70 shadow-sm backdrop-blur-sm">
                                <PadlockIcon className="w-3 h-3" />
                                Private
                            </span>
                        </div>
                    )}
                    <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                        <div className="project-shimmer absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-base-content/5 to-transparent" />
                    </div>
                </div>
                {/* Body */}
                <div className="p-6 md:p-8 relative flex flex-col justify-center">
                    <div className="flex items-center justify-between gap-3 mb-3">
                        <span className="badge badge-sm badge-primary text-[10px] uppercase tracking-widest font-semibold">★ Featured</span>
                        {unlocked && (
                            <span className={`flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-semibold ${portfolio.accent}`}>
                                {/* Green pulsing dot: outer ping ring + solid inner pip */}
                                <span className="relative flex h-2 w-2" aria-hidden="true">
                                    <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-75 animate-ping" />
                                    <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                                </span>
                                {portfolio.tag}
                            </span>
                        )}
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold text-base-content group-hover:text-primary transition-colors">
                        {unlocked ? "Every stock I hold, out in the open" : "Every stock I hold, and how it's doing"}
                    </h3>
                    <p className="text-sm md:text-base text-base-content/70 leading-relaxed mt-2">{portfolio.description}</p>
                    <div className="flex flex-wrap gap-1.5 mt-4">
                        {portfolio.tags.map((t) => (
                            <span key={t} className="badge badge-sm badge-ghost text-[10px]">{t}</span>
                        ))}
                    </div>
                    <span className="inline-flex items-center gap-1.5 mt-5 text-sm font-semibold text-primary">
                        {unlocked ? "Open the live dashboard" : "View the dashboard"}
                        <span className="transition-transform group-hover:translate-x-1">↗</span>
                    </span>
                </div>
            </div>
        </a>
    );
};

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
                className="relative touch-pan-y"
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

// ── Mobile: expandable list ──────────────────────────────────────────────────
// Phones get a numbered list instead of the hero + carousel: every project is
// visible at once, and tapping a row opens it in place (its body grows, which
// pushes the rows below down) with the full preview, description and an Open
// link. One row is open at a time; the featured dashboard starts open.
const MOBILE_ORDER = [portfolio, ...otherProjects];

// One curve for everything that moves on open/close (an expo-style ease-out:
// fast start, long soft landing), so the parts read as a single motion.
const EASE_OUT = [0.22, 1, 0.36, 1] as const;
const EXPAND_S = 0.55;

// Body content arrives in a short cascade (preview, copy, tags, button), each
// piece rising out of a slight blur. Leaving is a quick fade so the height
// collapse isn't fighting content that's still visible.
const bodyContent = {
    open: { transition: { staggerChildren: 0.06, delayChildren: 0.08 } },
    closed: { transition: { staggerChildren: 0.03, staggerDirection: -1 } },
};
const bodyItem = {
    open: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.45, ease: EASE_OUT } },
    closed: { opacity: 0, y: 10, filter: "blur(6px)", transition: { duration: 0.15 } },
};

const MobileProjectList = () => {
    const unlocked = useFinanceUnlocked();
    const reduce = useReducedMotion();
    const [open, setOpen] = useState<string | null>(portfolio.title);
    const rowRefs = useRef<Record<string, HTMLLIElement | null>>({});
    // How many times each row's icon has played. The icon plays once when its
    // row scrolls into view and again on every tap; bumping the count remounts
    // the preview, which restarts its keyframe animation.
    const [plays, setPlays] = useState<Record<string, number>>({});
    const play = (title: string, onlyFirst = false) =>
        setPlays((cur) => (onlyFirst && cur[title] ? cur : { ...cur, [title]: (cur[title] ?? 0) + 1 }));

    // Closing a tall row above the one just opened shifts everything up; once
    // the motion settles, bring the opened row's top back into view if needed.
    const keepInView = (title: string) => {
        const el = rowRefs.current[title];
        if (!el) return;
        const top = el.getBoundingClientRect().top;
        const NAV = 88; // fixed navbar + breathing room
        if (top < NAV) window.scrollBy({ top: top - NAV, behavior: reduce ? "auto" : "smooth" });
    };

    return (
        <ul className="space-y-3">
            {MOBILE_ORDER.map((p, i) => {
                const isOpen = open === p.title;
                const locked = p === portfolio && !unlocked;
                const bodyId = `project-body-${i}`;
                return (
                    <motion.li
                        key={p.title}
                        ref={(el) => { rowRefs.current[p.title] = el; }}
                        initial={reduce ? false : { opacity: 0, y: 16 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-40px" }}
                        onViewportEnter={() => play(p.title, true)}
                        transition={{ duration: 0.5, ease: EASE_OUT, delay: i * 0.06 }}
                        className={`relative overflow-hidden rounded-2xl border bg-base-100 transition-[border-color,box-shadow] duration-500 ${isOpen ? "border-primary/40 shadow-lg" : "border-base-300 shadow-sm"}`}
                    >
                        {/* Accent bar draws down the left edge, and a soft glow fades in. */}
                        <motion.span
                            aria-hidden="true"
                            className={`absolute inset-y-0 left-0 w-1 origin-top bg-current ${p.accent}`}
                            initial={false}
                            animate={{ scaleY: isOpen ? 1 : 0 }}
                            transition={{ duration: reduce ? 0 : EXPAND_S, ease: EASE_OUT }}
                        />
                        <motion.div
                            aria-hidden="true"
                            className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${p.glow}`}
                            initial={false}
                            animate={{ opacity: isOpen ? 0.6 : 0 }}
                            transition={{ duration: reduce ? 0 : EXPAND_S, ease: EASE_OUT }}
                        />

                        {/* The header never changes size, so nothing in it jumps. */}
                        <button
                            type="button"
                            onClick={() => { setOpen(isOpen ? null : p.title); play(p.title); }}
                            aria-expanded={isOpen}
                            aria-controls={bodyId}
                            className="relative flex w-full items-center gap-3 p-3.5 text-left"
                        >
                            <span className={`w-6 shrink-0 font-mono text-sm font-bold tabular-nums transition-colors duration-500 ${isOpen ? p.accent : "text-base-content/60"}`}>
                                {String(i + 1).padStart(2, "0")}
                            </span>
                            <motion.span
                                initial={false}
                                animate={{ scale: isOpen ? 0.92 : 1, opacity: isOpen ? 0.55 : 1 }}
                                transition={{ duration: reduce ? 0 : EXPAND_S, ease: EASE_OUT }}
                                data-play={plays[p.title] ? "" : undefined}
                                className="group relative block h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-base-300 bg-gradient-to-br from-base-200 to-base-300"
                                aria-hidden="true"
                            >
                                <span key={plays[p.title] ?? 0} className={`absolute inset-0 block p-1 ${locked ? "blur-[2px]" : ""}`}>{p.preview}</span>
                            </motion.span>
                            <span className="min-w-0 flex-1">
                                <span className="text-base font-bold leading-tight text-base-content line-clamp-2">{p.title}</span>
                                <span className={`mt-0.5 flex items-center gap-1 whitespace-nowrap text-[10px] font-semibold uppercase tracking-widest ${p.accent}`}>
                                    {locked && <PadlockIcon className="h-3 w-3" />}
                                    {locked ? "Private" : p.tag}
                                </span>
                            </span>
                            <motion.span
                                initial={false}
                                animate={{ rotate: isOpen ? 135 : 0 }}
                                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 20 }}
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors duration-500 ${isOpen ? "border-primary/40 bg-primary/10 text-primary" : "border-base-300 text-base-content/60"}`}
                                aria-hidden="true"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="h-4 w-4">
                                    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                                </svg>
                            </motion.span>
                        </button>

                        <AnimatePresence initial={false}>
                            {isOpen && (
                                <motion.div
                                    id={bodyId}
                                    key="body"
                                    initial={{ height: 0 }}
                                    animate={{ height: "auto", transition: { duration: reduce ? 0 : EXPAND_S, ease: EASE_OUT } }}
                                    exit={{ height: 0, transition: { duration: reduce ? 0 : 0.4, ease: EASE_OUT } }}
                                    onAnimationComplete={(def) => { if (isOpen && def !== "exit") keepInView(p.title); }}
                                    className="relative overflow-hidden"
                                >
                                    <motion.div
                                        variants={reduce ? undefined : bodyContent}
                                        initial="closed"
                                        animate="open"
                                        exit="closed"
                                        className="px-3.5 pb-4"
                                    >
                                        {/* data-play replays the preview's hover animation, since touch has no hover. */}
                                        <motion.div
                                            variants={reduce ? undefined : bodyItem}
                                            data-play=""
                                            className="group relative h-40 overflow-hidden rounded-xl border border-base-300 bg-gradient-to-br from-base-200 to-base-300"
                                        >
                                            <div className={`absolute inset-0 p-4 ${locked ? "blur-[3px]" : ""}`}>{p.preview}</div>
                                            {locked && (
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <span className="flex items-center gap-1.5 rounded-full border border-base-300 bg-base-100/90 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-base-content/70 shadow-sm backdrop-blur-sm">
                                                        <PadlockIcon className="h-3 w-3" />
                                                        Private
                                                    </span>
                                                </div>
                                            )}
                                        </motion.div>
                                        <motion.p variants={reduce ? undefined : bodyItem} className="mt-3 text-sm leading-relaxed text-base-content/80">
                                            {p.description}
                                        </motion.p>
                                        <motion.div variants={reduce ? undefined : bodyItem} className="mt-3 flex flex-wrap gap-1.5">
                                            {p.tags.map((t) => (
                                                <span key={t} className="badge badge-sm badge-ghost text-[10px]">{t}</span>
                                            ))}
                                        </motion.div>
                                        <motion.a
                                            variants={reduce ? undefined : bodyItem}
                                            href={p.href}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            data-track="project_card_clicked"
                                            data-project={PROJECT_SLUGS[p.href] ?? p.href.replace("/", "")}
                                            data-locked={locked ? "true" : undefined}
                                            className="btn btn-primary btn-sm mt-4 w-full gap-1.5"
                                        >
                                            {p === portfolio ? (unlocked ? "Open the live dashboard" : "View the dashboard") : `Open ${p.title}`}
                                            <span aria-hidden="true">↗</span>
                                        </motion.a>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.li>
                );
            })}
        </ul>
    );
};

export const Projects = () => (
    <section className="bg-base-200 border-2 border-secondary rounded-md p-6 md:p-10 space-y-5">
        <SectionHeading
            eyebrow="Projects"
            title="Things I've been building"
            description="A few interactive apps; each one opens in a new tab."
        />

        <div className="md:hidden">
            <MobileProjectList />
        </div>

        <div className="hidden md:block space-y-5">
            <FeaturedHero />
            <ProjectsCarousel projects={otherProjects} />
        </div>
    </section>
);
