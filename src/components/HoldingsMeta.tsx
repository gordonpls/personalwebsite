import { useEffect, useState } from "react";

interface Holding {
    portfolio: string;
    ticker: string | null;
    name: string;
    type: string | null;
    weightPct: number;
    returnPct: number | null;
}
interface Meta {
    name?: string; type?: string; exchange?: string; currency?: string;
    week52High?: number; week52Low?: number; price?: number;
    industry?: string; logo?: string; marketCap?: number; website?: string; country?: string; ipo?: string;
}
type MetaMap = Record<string, Meta>;

// marketCap arrives in USD millions.
function fmtCap(m?: number): string | null {
    if (!m) return null;
    if (m >= 1_000_000) return `$${(m / 1_000_000).toFixed(2)}T`;
    if (m >= 1_000) return `$${(m / 1_000).toFixed(2)}B`;
    return `$${Math.round(m)}M`;
}

const Fact = ({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) => (
    <div className="min-w-0">
        <p className="text-xs text-base-content/40">{label}</p>
        <p className={`font-medium truncate ${valueClass ?? "text-base-content"}`}>{value}</p>
    </div>
);

export const HoldingsMeta = ({ holding }: { holding: Holding | null }) => {
    const [metaMap, setMetaMap] = useState<MetaMap | null>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        let cancelled = false;
        // Static, cache-revalidated file — no per-visit API calls.
        fetch("/holdingsMeta.json", { cache: "no-cache" })
            .then((r) => r.ok ? r.json() : Promise.reject())
            .then((d) => { if (!cancelled) setMetaMap(d.meta ?? {}); })
            .catch(() => { if (!cancelled) { setMetaMap({}); setError(true); } });
        return () => { cancelled = true; };
    }, []);

    const ticker = holding?.ticker ?? null;
    const meta: Meta = (ticker && metaMap?.[ticker]) || {};
    const name = meta.name || holding?.name || ticker || "—";
    const assetType = meta.type || (holding?.type ? holding.type.toUpperCase() : null);
    const cap = fmtCap(meta.marketCap);
    const hasRange = meta.week52Low != null && meta.week52High != null && meta.week52High > meta.week52Low;
    const pos = hasRange && meta.price != null
        ? Math.max(0, Math.min(100, ((meta.price - meta.week52Low!) / (meta.week52High! - meta.week52Low!)) * 100))
        : null;

    return (
        <div className="bg-base-100 border border-base-300 rounded-2xl p-6 h-full flex flex-col">
            {!holding ? (
                <div className="flex-1 flex items-center justify-center text-sm text-base-content/40 text-center">
                    {metaMap ? "Click any holding to view its details." : "Loading…"}
                </div>
            ) : (
                <>
                    {/* Header */}
                    <div className="flex items-center gap-3 shrink-0">
                        {meta.logo ? (
                            <img
                                src={meta.logo}
                                alt=""
                                className="w-11 h-11 rounded-lg object-contain bg-base-200 p-1"
                                onError={(e) => { e.currentTarget.style.visibility = "hidden"; }}
                            />
                        ) : (
                            <div className="w-11 h-11 rounded-lg bg-base-200 flex items-center justify-center text-base font-bold text-base-content/60">
                                {(ticker || "?").slice(0, 2)}
                            </div>
                        )}
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="text-lg font-bold text-base-content">{ticker ?? "—"}</span>
                                {assetType && <span className="badge badge-sm badge-ghost">{assetType}</span>}
                            </div>
                            <p className="text-sm text-base-content/60 truncate">{name}</p>
                        </div>
                    </div>

                    {/* Facts */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3 mt-5 text-sm">
                        {meta.exchange && <Fact label="Exchange" value={meta.exchange} />}
                        {meta.industry && <Fact label="Industry" value={meta.industry} />}
                        {cap && <Fact label="Market cap" value={cap} />}
                        {meta.ipo && <Fact label="IPO" value={meta.ipo} />}
                        <Fact label="Portfolio weight" value={`${holding.weightPct.toFixed(1)}%`} />
                        {holding.returnPct != null && (
                            <Fact
                                label="Total return"
                                value={`${holding.returnPct > 0 ? "+" : ""}${holding.returnPct}%`}
                                valueClass={holding.returnPct >= 0 ? "text-success" : "text-error"}
                            />
                        )}
                    </div>

                    {/* 52-week range */}
                    {hasRange && (
                        <div className="mt-5">
                            <div className="flex justify-between text-xs text-base-content/50 mb-1.5">
                                <span>52-week range</span>
                                {meta.price != null && <span className="text-base-content/70 font-medium">${meta.price.toFixed(2)}</span>}
                            </div>
                            <div className="relative h-1.5 rounded-full bg-base-300">
                                {pos != null && (
                                    <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary border-2 border-base-100 shadow" style={{ left: `calc(${pos}% - 6px)` }} />
                                )}
                            </div>
                            <div className="flex justify-between text-[11px] text-base-content/40 mt-1">
                                <span>${meta.week52Low!.toFixed(2)}</span>
                                <span>${meta.week52High!.toFixed(2)}</span>
                            </div>
                        </div>
                    )}

                    {/* Website */}
                    {meta.website && (
                        <a href={meta.website} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline mt-5 w-fit">
                            Visit website ↗
                        </a>
                    )}

                    {/* Hint */}
                    <p className="text-[11px] text-base-content/40 mt-auto pt-5">
                        Click any holding on the left to switch.{error ? " · live metadata unavailable, showing basics" : ""}
                    </p>
                </>
            )}
        </div>
    );
};
