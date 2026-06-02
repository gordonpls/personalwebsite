// Projects showcase: card grid linking out to each interactive project.
// Each card renders an inline-SVG preview so we don't ship screenshots, and
// gets a hover animation specific to its visualization (donut spins, line
// re-draws, peg pulses) plus a card-wide lift + "open in new tab" hint.

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
            "My live brokerage holdings: heatmap, dividend-adjusted performance vs the S&P 500, sector allocation, and per-holding analytics. Backed by a weekly bake job.",
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
];

const ProjectCard = ({ p }: { p: Project }) => (
    <a
        href={p.href}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative block overflow-hidden rounded-2xl bg-base-100 border border-base-300 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
        <div className="p-5 relative">
            <div className="flex items-baseline justify-between gap-3 mb-1.5">
                <h3 className="text-lg font-bold text-base-content group-hover:text-primary transition-colors">{p.title}</h3>
                <span className={`text-[10px] uppercase tracking-widest font-semibold ${p.accent}`}>{p.tag}</span>
            </div>
            <p className="text-sm text-base-content/70 leading-snug">{p.description}</p>
            <div className="flex flex-wrap gap-1.5 mt-3">
                {p.tags.map((t) => (
                    <span key={t} className="badge badge-sm badge-ghost text-[10px]">{t}</span>
                ))}
            </div>
        </div>
    </a>
);

export const Projects = () => (
    <section className="space-y-5">
        <div className="flex items-end flex-wrap gap-x-6 gap-y-2">
            <div className="shrink-0">
                <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold">Projects</p>
                <h2 className="text-2xl md:text-3xl font-bold text-base-content mt-1">Things I&apos;ve been building</h2>
            </div>
            <p className="text-sm text-base-content/60 flex-1 min-w-[16rem]">
                Three interactive apps; each one opens in a new tab. Hover a card for a quick preview, click to open the full thing.
            </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
            {PROJECTS.map((p) => <ProjectCard key={p.title} p={p} />)}
        </div>
    </section>
);
