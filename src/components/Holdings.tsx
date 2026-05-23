import { useEffect, useMemo, useState } from "react";

interface Holding {
    portfolio: string;
    ticker: string | null;
    name: string;
    type: string | null;
    weightPct: number;
}

interface HoldingsProps {
    portfolio?: string;  // when set, show only this portfolio (weights renormalized within it)
    title?: string;
}

export const Holdings = ({ portfolio, title }: HoldingsProps = {}) => {
    const [holdings, setHoldings] = useState<Holding[] | null>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        let cancelled = false;
        fetch("/api/holdings")
            .then((r) => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            })
            .then((d) => { if (!cancelled) setHoldings(d.holdings ?? []); })
            .catch(() => { if (!cancelled) setError(true); });
        return () => { cancelled = true; };
    }, []);

    // Filter to one portfolio (if requested) and renormalize weights within it.
    const rows = useMemo(() => {
        let list = holdings ?? [];
        if (portfolio) list = list.filter((h) => h.portfolio === portfolio);
        const sum = list.reduce((s, h) => s + h.weightPct, 0);
        return list
            .map((h) => ({ ...h, weightPct: sum > 0 ? (h.weightPct / sum) * 100 : 0 }))
            .sort((a, b) => b.weightPct - a.weightPct);
    }, [holdings, portfolio]);

    return (
        <div className="bg-base-100 border border-base-300 rounded-2xl p-5 flex flex-col h-full">
            {/* Header */}
            <div className="shrink-0 mb-3">
                {title !== "" && <h2 className="text-lg font-semibold text-base-content">{title ?? "My Portfolio Holdings"}</h2>}
                <p className="text-sm text-base-content/60 mt-0.5">Live positions by weight</p>
            </div>

            {error ? (
                <p className="text-sm text-base-content/50 py-8 text-center">Holdings are currently unavailable.</p>
            ) : !holdings ? (
                <div className="space-y-2" aria-hidden="true">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-9 rounded bg-base-200 animate-pulse" />
                    ))}
                </div>
            ) : rows.length === 0 ? (
                <p className="text-sm text-base-content/50 py-8 text-center">No holdings to display.</p>
            ) : (
                <div className="flex-1 min-h-0 overflow-y-auto max-h-[28rem] lg:max-h-none pr-2" style={{ scrollbarGutter: "stable" }}>
                    <table className="table table-xs table-pin-rows">
                        <thead>
                            <tr className="text-base-content/50">
                                <th className="pl-0">Holding</th>
                                <th className="text-right pr-0">Weight</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((h, i) => (
                                <tr key={`${h.ticker ?? h.name}-${i}`} className="hover:bg-base-200/40">
                                    <td className="pl-0 pr-2">
                                        <div className="font-semibold text-base-content leading-tight">{h.ticker ?? "—"}</div>
                                        <div className="text-xs text-base-content/50 truncate max-w-[11rem]">{h.name}</div>
                                    </td>
                                    <td className="text-right pr-0 align-middle">
                                        <span className="font-medium text-base-content tabular-nums">
                                            {h.weightPct.toFixed(1)}%
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
