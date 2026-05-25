import { useState } from "react";
import { Holdings, type Holding } from "./Holdings";
import { HoldingsHeatmap } from "./HoldingsHeatmap";
import { HoldingsPerformance } from "./HoldingsPerformance";
import { HoldingsMeta } from "./HoldingsMeta";

// `id` matches the `portfolio` value returned by /api/holdings.
const TABS: { id: string; desc: string }[] = [
    { id: "Core", desc: "Diversified foundation built on broad index funds — the majority of the portfolio." },
    { id: "Tech & Speculation", desc: "Concentrated tech and speculative positions." },
    { id: "Retirement", desc: "Traditional & Roth IRA." },
];

export const Portfolios = () => {
    const [active, setActive] = useState("Tech & Speculation");
    const [selected, setSelected] = useState<Holding | null>(null);
    const tab = TABS.find((t) => t.id === active) ?? TABS[0];

    // Switching portfolios clears the selection; Holdings re-selects its first row.
    const changeTab = (id: string) => { setActive(id); setSelected(null); };

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

            {/* Portfolio selector */}
            <div role="tablist" aria-label="Portfolios" className="flex flex-wrap gap-2">
                {TABS.map((t) => (
                    <button
                        key={t.id}
                        role="tab"
                        aria-selected={active === t.id}
                        onClick={() => changeTab(t.id)}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold border transition ${active === t.id
                            ? "bg-primary text-primary-content border-primary shadow-sm"
                            : "bg-base-100 text-base-content/70 border-base-300 hover:bg-base-200 hover:text-base-content"
                            }`}
                    >
                        {t.id}
                    </button>
                ))}
            </div>

            <p className="text-sm text-base-content/60">{tab.desc}</p>

            {/* Live holdings (left) beside the selected holding's detail (right).
                Cards size to their content (top-aligned) so ETFs don't leave a
                big empty panel; tall stocks scroll. Stacks on mobile. */}
            <div className="flex flex-col lg:flex-row gap-4 lg:items-start">
                <div className="w-full lg:w-80 lg:shrink-0">
                    <Holdings portfolio={active} title="" selectedTicker={selected?.ticker ?? null} onSelect={setSelected} />
                </div>
                <div className="w-full lg:flex-1 lg:min-w-0">
                    <HoldingsMeta holding={selected} />
                </div>
            </div>

            {/* Overall performance (whole portfolio, not tab-scoped) */}
            <HoldingsPerformance title="Overall Performance" />

            {/* Heatmap last, full width — every holding across all portfolios */}
            <div className="w-full lg:h-[26rem]">
                <HoldingsHeatmap title="Heatmap" />
            </div>
        </div>
    );
};
