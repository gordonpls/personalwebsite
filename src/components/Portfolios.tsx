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
            <h2 className="text-lg font-semibold text-base-content">Portfolio</h2>

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

            {/* Heatmap + holdings switch with the tab; weights renormalize within the portfolio */}
            <HoldingsHeatmap portfolio={active} title="Heatmap" />
            <Holdings portfolio={active} title="Holdings" />

            {/* Performance is always the whole portfolio, not tab-scoped */}
            <HoldingsPerformance title="Overall Performance" />
        </div>
    );
};
