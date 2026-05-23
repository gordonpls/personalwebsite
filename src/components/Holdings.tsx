import { useEffect, useState } from "react";

interface Holding {
    institution: string;
    ticker: string | null;
    name: string;
    type: string | null;
    weightPct: number;
}

// Brand-ish accents; fall back to the theme primary for unknown brokers.
const BROKER_COLOR: Record<string, string> = {
    Vanguard: "#96151d",
    Robinhood: "#00c805",
};
const brokerColor = (b: string) => BROKER_COLOR[b] ?? "var(--color-primary)";

export const Holdings = () => {
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

    const maxWeight = holdings?.reduce((m, h) => Math.max(m, h.weightPct), 0) ?? 0;
    const brokers = [...new Set((holdings ?? []).map((h) => h.institution))];

    return (
        <div className="bg-base-100 border border-base-300 rounded-2xl p-6 space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                    <h2 className="text-lg font-semibold text-base-content">Holdings</h2>
                    <p className="text-sm text-base-content/60 mt-0.5">
                        Live positions by weight{brokers.length ? ` · ${brokers.join(" + ")}` : ""}
                    </p>
                </div>
                {brokers.length > 0 && (
                    <div className="flex gap-3 flex-wrap">
                        {brokers.map((b) => (
                            <span key={b} className="flex items-center gap-1.5 text-xs text-base-content/60">
                                <span className="w-2 h-2 rounded-full inline-block" style={{ background: brokerColor(b) }} />
                                {b}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {error ? (
                <p className="text-sm text-base-content/50 py-8 text-center">Holdings are currently unavailable.</p>
            ) : !holdings ? (
                <div className="space-y-2" aria-hidden="true">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-9 rounded bg-base-200 animate-pulse" />
                    ))}
                </div>
            ) : holdings.length === 0 ? (
                <p className="text-sm text-base-content/50 py-8 text-center">No holdings to display.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="table table-sm">
                        <thead>
                            <tr className="text-base-content/50">
                                <th>Holding</th>
                                <th>Broker</th>
                                <th className="text-right">Weight</th>
                            </tr>
                        </thead>
                        <tbody>
                            {holdings.map((h, i) => (
                                <tr key={`${h.institution}-${h.ticker ?? h.name}-${i}`} className="hover:bg-base-200/40">
                                    <td>
                                        <div className="font-semibold text-base-content">{h.ticker ?? "—"}</div>
                                        <div className="text-xs text-base-content/50 truncate max-w-[14rem]">{h.name}</div>
                                    </td>
                                    <td>
                                        <span className="flex items-center gap-1.5 text-xs text-base-content/70 whitespace-nowrap">
                                            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: brokerColor(h.institution) }} />
                                            {h.institution}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="flex items-center justify-end gap-2">
                                            <div className="w-24 h-1.5 rounded-full bg-base-300 overflow-hidden hidden sm:block">
                                                <div
                                                    className="h-full rounded-full"
                                                    style={{ width: `${maxWeight ? (h.weightPct / maxWeight) * 100 : 0}%`, background: brokerColor(h.institution) }}
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
