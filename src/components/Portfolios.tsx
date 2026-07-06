import { useEffect, useState } from "react";
import { Holdings, type Holding } from "./Holdings";
import { HoldingsHeatmap } from "./HoldingsHeatmap";
import { HoldingsPerformance } from "./HoldingsPerformance";
import { HoldingsMeta } from "./HoldingsMeta";
import { PortfolioAnalytics } from "./PortfolioAnalytics";

// `id` matches the `portfolio` value returned by /api/holdings.
// "All" is special: it means no portfolio filter — the heatmap, allocation,
// and stats render the union of every portfolio.
const ALL = "All";
const TABS: { id: string; desc: string }[] = [
    { id: ALL, desc: "Every position across Core, Tech & Speculation, and Retirement." },
    { id: "Core", desc: "Diversified foundation built on broad index funds. The majority of the portfolio." },
    { id: "Tech & Speculation", desc: "Concentrated tech and speculative positions." },
    { id: "Retirement", desc: "Traditional & Roth IRA." },
];
const SCOPE_OPTIONS = TABS.map((t) => t.id);

// Quick-nav pills that jump to each section of the dashboard.
const SECTIONS = [
    { id: "sec-holdings", label: "Holdings" },
    { id: "sec-allocation", label: "Allocation" },
    { id: "sec-heatmap", label: "Heatmap" },
    { id: "sec-performance", label: "Performance" },
];
const scrollToSection = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

export const Portfolios = () => {
    const [active, setActive] = useState<string>(ALL);
    const [selected, setSelected] = useState<Holding | null>(null);
    const tab = TABS.find((t) => t.id === active) ?? TABS[0];

    // Switching portfolios clears the selection; Holdings re-selects its first row.
    const changeTab = (id: string) => { setActive(id); setSelected(null); };

    // The "All" sentinel = no filter. Convert to undefined for the child components
    // (Holdings/Heatmap/Analytics) that expect undefined for "every holding."
    const portfolioFilter = active === ALL ? undefined : active;

    // Scroll-spy: highlight whichever section is currently near the middle of the
    // viewport, so the floating section nav always reflects where you are.
    const [activeSection, setActiveSection] = useState<string>(SECTIONS[0].id);
    useEffect(() => {
        const io = new IntersectionObserver(
            (entries) => {
                const top = entries
                    .filter((e) => e.isIntersecting)
                    .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
                if (top) setActiveSection(top.target.id);
            },
            { rootMargin: "-45% 0px -50% 0px", threshold: [0, 0.5, 1] },
        );
        SECTIONS.forEach((s) => {
            const el = document.getElementById(s.id);
            if (el) io.observe(el);
        });
        return () => io.disconnect();
    }, []);

    return (
        <div className="space-y-5">
            <h2 className="text-lg font-semibold text-base-content">Personal Portfolio</h2>

            {/* Disclaimer */}
            <div>
                <p className="text-xs text-base-content/50 leading-relaxed">
                    <span className="font-semibold text-base-content/70">Not financial advice.</span>{" "}
                    The holdings, weights, and performance shown here are my own and are provided for
                    informational and illustrative purposes only. Nothing on this page is investment advice
                    or a recommendation to buy or sell any security. Past performance does not guarantee
                    future results. Do your own research and consult a licensed financial professional
                    before making investment decisions.
                </p>
            </div>

            {/* Portfolio selector (drives every tab-scoped component below) */}
            <div role="tablist" aria-label="Portfolios" className="inline-flex flex-wrap gap-1 p-1 rounded-xl bg-base-200">
                {TABS.map((t) => (
                    <button
                        key={t.id}
                        role="tab"
                        aria-selected={active === t.id}
                        onClick={() => changeTab(t.id)}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${active === t.id
                            ? "bg-primary text-primary-content shadow-sm"
                            : "text-base-content/50 hover:text-base-content/80"
                            }`}
                    >
                        {t.id}
                    </button>
                ))}
            </div>

            <p className="text-sm text-base-content/60">{tab.desc}</p>

            {/* Holdings (compact list) + selected holding detail. On mobile the
                list is deliberately short so the detail card peeks into view right
                below it — a fade + cue signal there's more. Full two-pane on lg. */}
            <section id="sec-holdings" className="scroll-mt-28 flex flex-col gap-3 lg:flex-row lg:gap-4 lg:h-[34rem]">
                <div className="relative w-full h-[16rem] lg:w-96 lg:h-full lg:shrink-0">
                    <Holdings portfolio={portfolioFilter} title="" selectedTicker={selected?.ticker ?? null} onSelect={setSelected} />
                    <div aria-hidden="true" className="lg:hidden pointer-events-none absolute inset-x-0 bottom-0 h-8 rounded-b-2xl bg-gradient-to-t from-base-100 to-transparent" />
                </div>
                <div className="lg:hidden flex flex-col items-center gap-0.5 text-xs font-medium text-primary">
                    <span>Details for the selected holding</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="h-4 w-4 animate-bounce" aria-hidden="true">
                        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
                <div className="w-full lg:flex-1 lg:min-w-0 lg:h-full">
                    <HoldingsMeta holding={selected} />
                </div>
            </section>

            {/* Allocation donut + risk stats (left) beside the heatmap (right) —
                all three tab-scoped, with inline scope pickers so you don't have to
                scroll back up to the global tabs to see or change the scope. The
                row is sized so the donut + Risk cards split evenly. */}
            <div className="flex flex-col lg:flex-row gap-4 lg:h-[36rem]">
                <div id="sec-allocation" className="scroll-mt-28 w-full lg:w-96 lg:shrink-0 flex flex-col gap-4 lg:h-full">
                    <PortfolioAnalytics
                        portfolio={portfolioFilter}
                        scopeLabel={active}
                        onScopeChange={changeTab}
                        scopeOptions={SCOPE_OPTIONS}
                    />
                </div>
                <div id="sec-heatmap" className="scroll-mt-28 w-full lg:flex-1 lg:min-w-0 lg:h-full">
                    <HoldingsHeatmap
                        portfolio={portfolioFilter}
                        title="Heatmap"
                        scopeLabel={active}
                        onScopeChange={changeTab}
                        scopeOptions={SCOPE_OPTIONS}
                    />
                </div>
            </div>

            {/* Overall performance: now also tab-scoped, with its own pill in the
                header. Pinned at the bottom as the page's "summary" view. */}
            <section id="sec-performance" className="scroll-mt-28">
                <HoldingsPerformance
                    title="Performance"
                    portfolio={portfolioFilter}
                    scopeLabel={active}
                    onScopeChange={changeTab}
                    scopeOptions={SCOPE_OPTIONS}
                />
            </section>

            {/* Floating section nav — fixed to the viewport so it's reachable at
                every scroll position. Highlights the section you're currently in. */}
            <nav
                aria-label="Dashboard sections"
                className="fixed bottom-4 left-1/2 z-40 flex max-w-[calc(100vw-1.5rem)] -translate-x-1/2 gap-1 overflow-x-auto rounded-full border border-base-300 bg-base-100/90 p-1.5 shadow-lg backdrop-blur"
            >
                {SECTIONS.map((s) => {
                    const on = activeSection === s.id;
                    return (
                        <button
                            key={s.id}
                            type="button"
                            aria-current={on ? "true" : undefined}
                            onClick={() => scrollToSection(s.id)}
                            className={`btn btn-xs sm:btn-sm rounded-full border-none whitespace-nowrap shrink-0 ${on ? "btn-primary" : "btn-ghost text-base-content/70"}`}
                        >
                            {s.label}
                        </button>
                    );
                })}
            </nav>
        </div>
    );
};
