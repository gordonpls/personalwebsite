import { useState } from "react";
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

export const Portfolios = () => {
    const [active, setActive] = useState<string>(ALL);
    const [selected, setSelected] = useState<Holding | null>(null);
    const tab = TABS.find((t) => t.id === active) ?? TABS[0];

    // Switching portfolios clears the selection; Holdings re-selects its first row.
    const changeTab = (id: string) => { setActive(id); setSelected(null); };

    // The "All" sentinel = no filter. Convert to undefined for the child components
    // (Holdings/Heatmap/Analytics) that expect undefined for "every holding."
    const portfolioFilter = active === ALL ? undefined : active;

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

            {/* Holdings (left) + selected holding detail (right) */}
            <div className="flex flex-col lg:flex-row gap-4 lg:h-[34rem]">
                <div className="w-full lg:w-96 lg:shrink-0 lg:h-full">
                    <Holdings portfolio={portfolioFilter} title="" selectedTicker={selected?.ticker ?? null} onSelect={setSelected} />
                </div>
                <div className="w-full lg:flex-1 lg:min-w-0 lg:h-full">
                    <HoldingsMeta holding={selected} />
                </div>
            </div>

            {/* Allocation donut + risk stats (left) beside the heatmap (right) —
                all three tab-scoped, with inline scope pickers so you don't have to
                scroll back up to the global tabs to see or change the scope. The
                row is sized so the donut + Risk cards split evenly. */}
            <div className="flex flex-col lg:flex-row gap-4 lg:h-[36rem]">
                <div className="w-full lg:w-80 lg:shrink-0 flex flex-col gap-4 lg:h-full">
                    <PortfolioAnalytics
                        portfolio={portfolioFilter}
                        scopeLabel={active}
                        onScopeChange={changeTab}
                        scopeOptions={SCOPE_OPTIONS}
                    />
                </div>
                <div className="w-full lg:flex-1 lg:min-w-0 lg:h-full">
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
            <HoldingsPerformance
                title="Performance"
                portfolio={portfolioFilter}
                scopeLabel={active}
                onScopeChange={changeTab}
                scopeOptions={SCOPE_OPTIONS}
            />
        </div>
    );
};
