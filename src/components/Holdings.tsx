import { useEffect, useMemo, useState } from "react";

export interface Holding {
    portfolio: string;
    ticker: string | null;
    name: string;
    type: string | null;
    weightPct: number;
    returnPct: number | null;  // total return since purchase (cost basis); null if unavailable
}

interface HoldingsProps {
    portfolio?: string;  // when set, show only this portfolio (weights renormalized within it)
    title?: string;
    selectedTicker?: string | null;     // highlighted row
    onSelect?: (h: Holding) => void;    // row click; also auto-selects the first row
}

export const Holdings = ({ portfolio, title, selectedTicker, onSelect }: HoldingsProps = {}) => {
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

    // Default to (and keep a valid) selection — the first row of the active portfolio.
    useEffect(() => {
        if (!onSelect || rows.length === 0) return;
        if (!selectedTicker || !rows.some((r) => r.ticker === selectedTicker)) onSelect(rows[0]);
    }, [rows, selectedTicker, onSelect]);

    return (
        <div className="bg-base-100 border border-base-300 rounded-2xl p-5 flex flex-col h-full">
            {/* Header */}
            <div className="shrink-0 mb-3">
                {title !== "" && <h2 className="text-lg font-semibold text-base-content">{title ?? "My Portfolio Holdings"}</h2>}
                <p className="text-sm text-base-content/60 mt-0.5 flex items-center gap-2">
                    <span className="relative flex h-2 w-2" aria-hidden="true">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-75 animate-ping" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                    </span>
                    Live Positions
                </p>
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
                <div className="always-scrollbar flex-1 min-h-0 overflow-y-scroll overflow-x-hidden max-h-[28rem] lg:max-h-none pr-1">
                    <table className="table table-xs table-pin-rows w-full table-fixed">
                        <thead>
                            <tr className="text-base-content/50 align-bottom">
                                <th className="pl-0 align-bottom">Holding</th>
                                <th className="text-right w-14 align-bottom">Weight</th>
                                <th className="text-right pr-0 w-20 whitespace-normal leading-tight align-bottom">Total Return</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((h, i) => (
                                <tr
                                    key={`${h.ticker ?? h.name}-${i}`}
                                    onClick={() => onSelect?.(h)}
                                    aria-selected={selectedTicker === h.ticker}
                                    className={`cursor-pointer transition-colors ${selectedTicker === h.ticker ? "bg-primary/10" : "hover:bg-base-200/40"}`}
                                >
                                    <td className="pl-0 pr-2">
                                        <div className="font-semibold text-base-content leading-tight">{h.ticker ?? "—"}</div>
                                        <div className="text-xs text-base-content/50 truncate">{h.name}</div>
                                    </td>
                                    <td className="text-right w-14 align-middle">
                                        <span className="font-medium text-base-content tabular-nums">
                                            {h.weightPct.toFixed(1)}%
                                        </span>
                                    </td>
                                    <td className="text-right pr-0 w-20 align-middle">
                                        {h.returnPct == null ? (
                                            <span className="text-base-content/30" title="Cost basis unavailable">—</span>
                                        ) : (
                                            <span className={`font-medium tabular-nums ${h.returnPct > 0 ? "text-success" : h.returnPct < 0 ? "text-error" : "text-base-content/60"}`}>
                                                {h.returnPct > 0 ? "+" : ""}{h.returnPct.toFixed(1)}%
                                            </span>
                                        )}
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
