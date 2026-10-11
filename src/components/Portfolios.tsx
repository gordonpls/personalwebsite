import { useEffect, useRef, useState } from "react";
import { Holdings, type Holding } from "./Holdings";
import { HoldingsHeatmap } from "./HoldingsHeatmap";
import { HoldingsPerformance } from "./HoldingsPerformance";
import { HoldingsMeta } from "./HoldingsMeta";
import { PortfolioAnalytics } from "./PortfolioAnalytics";
import { HoldingSpotlight } from "./HoldingSpotlight";
import { LiveTickerTape } from "./TickerTape";
import { ReturnDrivers } from "./ReturnDrivers";
import { MonthlyReturns } from "./MonthlyReturns";
import { DrawdownChart } from "./DrawdownChart";
import { RiskReturnMap } from "./RiskReturnMap";
import { SectionNav } from "./SectionNav";
import { PortfolioSwitcher } from "./PortfolioSwitcher";
import { PlaidStatusChip } from "./PlaidStatusChip";
import { AllocationHistory } from "./AllocationHistory";

// `id` matches the `portfolio` value returned by /api/holdings.
// "All" is special: it means no portfolio filter — the heatmap, allocation,
// and stats render the union of every portfolio.
const ALL = "All";
// `short` is the one-liner on the switcher card, `tiny` its name on phones;
// `desc` sits under the switcher.
const TABS: { id: string; short: string; tiny?: string; desc: string }[] = [
    { id: ALL, short: "Everything, combined", tiny: "All", desc: "Every position across Core, Tech & Speculation, and Retirement." },
    { id: "Core", short: "Broad index funds", desc: "Diversified foundation built on broad index funds. The majority of the portfolio." },
    { id: "Tech & Speculation", short: "Concentrated bets", tiny: "Tech & Spec.", desc: "Concentrated tech and speculative positions." },
    { id: "Retirement", short: "Traditional & Roth IRA", desc: "Traditional & Roth IRA." },
];
const SCOPE_OPTIONS = TABS.map((t) => t.id);

// Quick-nav pills that jump to each section of the dashboard.
const SECTIONS = [
    { id: "sec-performance", label: "Performance" },
    { id: "sec-holdings", label: "Holdings" },
    { id: "sec-allocation", label: "Allocation" },
    { id: "sec-heatmap", label: "Heatmap" },
    { id: "sec-drivers", label: "Drivers" },
    { id: "sec-calendar", label: "Monthly" },
    { id: "sec-mix", label: "Mix" },
    { id: "sec-drawdown", label: "Drawdown" },
    { id: "sec-risk", label: "Risk" },
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

    // Spotlight → open that holding in the detail card. Switch to "All" so the
    // holding is guaranteed to be in the list (Holdings would otherwise reset
    // the selection to the first row).
    const [reveal, setReveal] = useState<{ ticker: string; nonce: number } | null>(null);
    const viewHolding = (h: Holding) => {
        setActive(ALL);
        setSelected(h);
        scrollToSection("sec-holdings");
        if (h.ticker) setReveal({ ticker: h.ticker, nonce: Date.now() });
    };

    // Scroll-spy: highlight whichever section is currently near the middle of the
    // viewport, so the floating section nav always reflects where you are.
    const [activeSection, setActiveSection] = useState<string>(SECTIONS[0].id);
    // While a nav jump is smooth-scrolling, ignore the sections it passes.
    const jumpLockUntil = useRef(0);
    useEffect(() => {
        const io = new IntersectionObserver(
            (entries) => {
                const top = entries
                    .filter((e) => e.isIntersecting)
                    .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
                if (top && Date.now() > jumpLockUntil.current) setActiveSection(top.target.id);
            },
            { rootMargin: "-45% 0px -50% 0px", threshold: [0, 0.5, 1] },
        );
        SECTIONS.forEach((s) => {
            const el = document.getElementById(s.id);
            if (el) io.observe(el);
        });
        return () => io.disconnect();
    }, []);
    // Show the destination right away rather than waiting for the scroll to land,
    // so tapping › twice in a row moves two sections.
    const jumpTo = (id: string) => {
        jumpLockUntil.current = Date.now() + 900;
        setActiveSection(id);
        scrollToSection(id);
    };

    // Layout, top to bottom: live tape → title + scope tabs → headline stats →
    // performance with the spotlight beside it → holdings / detail / allocation
    // in one row → heatmap beside return drivers → monthly calendar → drawdown
    // beside risk vs return →
    // fine print. Rows share one gap and fixed
    // heights on desktop so cards line up instead of leaving ragged gaps.
    return (
        <div className="space-y-6">
            {/* Flush with the window chrome: cancels the page's px-4 / pt-4. */}
            <LiveTickerTape className="-mx-4 -mt-4" />

            {/* Title, then the portfolio switcher: centered, because picking a
                portfolio is the main choice on this page and drives every
                section below. The line under it explains the current pick. */}
            <header className="space-y-4 text-center">
                <h2 className="text-2xl font-bold tracking-tight text-base-content">Personal Portfolio</h2>
                <PortfolioSwitcher options={TABS} active={active} onChange={changeTab} allId={ALL} />
                <p className="text-sm text-base-content/70" aria-live="polite">
                    <span className="font-semibold text-base-content">{active === ALL ? "All portfolios" : active}:</span> {tab.desc}
                </p>
                <PlaidStatusChip />
            </header>

            {/* Headline numbers for the selected scope. */}
            <PortfolioAnalytics
                show="risk"
                portfolio={portfolioFilter}
                scopeLabel={active}
                onScopeChange={changeTab}
                scopeOptions={SCOPE_OPTIONS}
            />

            {/* Headline row: performance (wide) + holding of the day. */}
            <div className="grid gap-4 lg:grid-cols-12">
                <section id="sec-performance" className="scroll-mt-28 min-w-0 lg:col-span-8">
                    <HoldingsPerformance
                        title="Performance"
                        portfolio={portfolioFilter}
                        scopeLabel={active}
                        onScopeChange={changeTab}
                        scopeOptions={SCOPE_OPTIONS}
                    />
                </section>
                <aside className="min-w-0 lg:col-span-4">
                    <HoldingSpotlight onView={viewHolding} />
                </aside>
            </div>

            {/* Holdings: the list (with category + sort) and the selected
                holding's detail share one card, beside allocation. On mobile the
                detail stacks under the list inside the same card. */}
            <section id="sec-holdings" className="scroll-mt-28 grid gap-4 lg:grid-cols-12">
                <div className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-base-300 bg-base-100 lg:col-span-12 lg:h-[34rem] lg:flex-row xl:col-span-9">
                    <div className="relative h-[24rem] shrink-0 lg:h-full lg:w-96 lg:border-r lg:border-base-300">
                        <Holdings bare portfolio={portfolioFilter} title="" selectedTicker={selected?.ticker ?? null} onSelect={setSelected} reveal={reveal} />
                        <div aria-hidden="true" className="lg:hidden pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-base-100 to-transparent" />
                    </div>
                    <div className="min-w-0 flex-1 border-t border-base-300 lg:h-full lg:border-t-0">
                        <HoldingsMeta bare holding={selected} />
                    </div>
                </div>
                <div id="sec-allocation" className="scroll-mt-28 flex min-w-0 flex-col lg:col-span-12 lg:h-[22rem] xl:col-span-3 xl:h-[34rem]">
                    <PortfolioAnalytics
                        show="allocation"
                        portfolio={portfolioFilter}
                        scopeLabel={active}
                        onScopeChange={changeTab}
                        scopeOptions={SCOPE_OPTIONS}
                    />
                </div>
            </section>

            {/* Today's map beside what drove the period's return. */}
            <div className="grid gap-4 lg:grid-cols-12">
                {/* Row height follows the drivers card; the heatmap stretches to match. */}
                <section id="sec-heatmap" className="scroll-mt-28 min-w-0 lg:col-span-7 lg:min-h-[34rem] xl:col-span-8">
                    <HoldingsHeatmap
                        portfolio={portfolioFilter}
                        title="Heatmap"
                        scopeLabel={active}
                        onScopeChange={changeTab}
                        scopeOptions={SCOPE_OPTIONS}
                    />
                </section>
                <section id="sec-drivers" className="scroll-mt-28 min-w-0 lg:col-span-5 xl:col-span-4">
                    <ReturnDrivers
                        portfolio={portfolioFilter}
                        scopeLabel={active}
                        onScopeChange={changeTab}
                        scopeOptions={SCOPE_OPTIONS}
                    />
                </section>
            </div>

            <section id="sec-calendar" className="scroll-mt-28">
                <MonthlyReturns
                    portfolio={portfolioFilter}
                    scopeLabel={active}
                    onScopeChange={changeTab}
                    scopeOptions={SCOPE_OPTIONS}
                />
            </section>

            {/* How the split across portfolios has moved, from daily server snapshots. */}
            <section id="sec-mix" className="scroll-mt-28">
                <AllocationHistory />
            </section>

            {/* How deep it fell beside how bumpy each position was for its return. */}
            <div className="grid gap-4 xl:grid-cols-2">
                <section id="sec-drawdown" className="scroll-mt-28 min-w-0">
                    <DrawdownChart
                        portfolio={portfolioFilter}
                        scopeLabel={active}
                        onScopeChange={changeTab}
                        scopeOptions={SCOPE_OPTIONS}
                    />
                </section>
                <section id="sec-risk" className="scroll-mt-28 min-w-0">
                    <RiskReturnMap
                        portfolio={portfolioFilter}
                        scopeLabel={active}
                        onScopeChange={changeTab}
                        scopeOptions={SCOPE_OPTIONS}
                    />
                </section>
            </div>

            <p className="border-t border-base-300 pt-4 text-xs leading-relaxed text-base-content/60">
                <span className="font-semibold text-base-content/70">Not financial advice.</span>{" "}
                The holdings, weights, and performance shown here are my own and are provided for
                informational and illustrative purposes only. Nothing on this page is investment advice
                or a recommendation to buy or sell any security. Past performance does not guarantee
                future results. Do your own research and consult a licensed financial professional
                before making investment decisions.
            </p>

            {/* Floating section nav: the current section, prev/next, and a tap-to-open list. */}
            <SectionNav sections={SECTIONS} active={activeSection} onJump={jumpTo} />
        </div>
    );
};
