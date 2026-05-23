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

type View = "Holdings" | "Heatmap";
const VIEWS: View[] = ["Holdings", "Heatmap"];

export const Portfolios = () => {
    const [active, setActive] = useState("Core");
    const [view, setView] = useState<View>("Holdings");
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

            {/* Holdings / Heatmap view switch (Holdings first) */}
            <div role="tablist" aria-label="View" className="flex gap-5 border-b border-base-300">
                {VIEWS.map((v) => (
                    <button
                        key={v}
                        role="tab"
                        aria-selected={view === v}
                        onClick={() => setView(v)}
                        className={`-mb-px pb-2 text-sm font-medium border-b-2 transition ${view === v
                            ? "border-primary text-base-content"
                            : "border-transparent text-base-content/50 hover:text-base-content/80"
                            }`}
                    >
                        {v}
                    </button>
                ))}
            </div>

            {/* Selected view; weights renormalize within the active portfolio */}
            {view === "Holdings"
                ? <Holdings portfolio={active} title="" />
                : <HoldingsHeatmap portfolio={active} title="" />}

            {/* Performance is always the whole portfolio, not tab-scoped */}
            <HoldingsPerformance title="Overall Performance" />
        </div>
    );
};
