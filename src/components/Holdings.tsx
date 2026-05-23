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

    const maxWeight = rows.reduce((m, h) => Math.max(m, h.weightPct), 0);

    return (
        <div className="bg-base-100 border border-base-300 rounded-2xl p-6 space-y-5">
            {/* Header */}
            <div>
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
                <div className="overflow-x-auto max-h-[28rem] overflow-y-auto">
                    <table className="table table-sm table-pin-rows">
                        <thead>
                            <tr className="text-base-content/50">
                                <th>Holding</th>
                                <th className="text-right">Weight</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((h, i) => (
                                <tr key={`${h.ticker ?? h.name}-${i}`} className="hover:bg-base-200/40">
                                    <td>
                                        <div className="font-semibold text-base-content">{h.ticker ?? "—"}</div>
                                        <div className="text-xs text-base-content/50 truncate max-w-[14rem]">{h.name}</div>
                                    </td>
                                    <td>
                                        <div className="flex items-center justify-end gap-2">
                                            <div className="w-24 h-1.5 rounded-full bg-base-300 overflow-hidden hidden sm:block">
                                                <div
                                                    className="h-full rounded-full"
                                                    style={{ width: `${maxWeight ? (h.weightPct / maxWeight) * 100 : 0}%`, background: "var(--color-primary)" }}
                                                />
                                            </div>
                                            <span className="font-medium text-base-content tabular-nums w-12 text-right">
                                                {h.weightPct.toFixed(1)}%
                                            </span>
                                        </div>
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
