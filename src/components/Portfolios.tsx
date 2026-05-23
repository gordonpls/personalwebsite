import { useState } from "react";
import { Holdings } from "./Holdings";
import { HoldingsHeatmap } from "./HoldingsHeatmap";
import { HoldingsPerformance } from "./HoldingsPerformance";

// `id` matches the `portfolio` value returned by /api/holdings.
const TABS: { id: string; desc: string }[] = [
    { id: "Core", desc: "Diversified foundation built on broad index funds — the majority of the portfolio." },
    { id: "Tech & Speculation", desc: "Concentrated tech and speculative positions." },
    { id: "Retirement", desc: "Traditional & Roth IRA." },
];

export const Portfolios = () => {
    const [active, setActive] = useState("Core");
    const tab = TABS.find((t) => t.id === active) ?? TABS[0];

    return (
        <div className="space-y-5">
            <h2 className="text-lg font-semibold text-base-content">Personal Portfolio</h2>

            {/* Portfolio selector */}
            <div role="tablist" aria-label="Portfolios" className="inline-flex flex-wrap gap-1 p-1 rounded-xl bg-base-200">
                {TABS.map((t) => (
                    <button
                        key={t.id}
                        role="tab"
                        aria-selected={active === t.id}
                        onClick={() => setActive(t.id)}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${active === t.id
                            ? "bg-base-100 text-base-content shadow-sm"
                            : "text-base-content/50 hover:text-base-content/80"
                            }`}
                    >
                        {t.id}
                    </button>
                ))}
            </div>

            <p className="text-sm text-base-content/60">{tab.desc}</p>

            {/* Holdings (compact) beside the heatmap; both fill a shared height so they
                align regardless of how many holdings a portfolio has. Stacks on mobile. */}
            <div className="flex flex-col lg:flex-row gap-4 lg:h-[28rem]">
                <div className="w-full lg:w-72 lg:shrink-0 lg:h-full">
                    <Holdings portfolio={active} title="" />
                </div>
                <div className="w-full lg:flex-1 lg:min-w-0 lg:h-full">
                    <HoldingsHeatmap portfolio={active} title="" />
                </div>
            </div>

            {/* Performance is always the whole portfolio, not tab-scoped */}
            <HoldingsPerformance title="Overall Performance" />

            {/* Disclaimer */}
            <div className="border-t border-base-300 pt-4">
                <p className="text-xs text-base-content/50 leading-relaxed">
                    <span className="font-semibold text-base-content/70">Not financial advice.</span>{" "}
                    The holdings, weights, and performance shown here are my own and are provided for
                    informational and illustrative purposes only. Nothing on this page is investment advice
                    or a recommendation to buy or sell any security. Past performance does not guarantee
                    future results. Do your own research and consult a licensed financial professional
                    before making investment decisions.
                </p>
            </div>
        </div>
    );
};
