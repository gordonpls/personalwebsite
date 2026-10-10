import { useEffect, useMemo, useState } from "react";
import { ScrollArea } from "./ScrollArea";
import { HoldingLogo, type LogoMeta } from "./HoldingLogo";
import { cachedJson } from "../services/apiCache";
import { formatWeightPct } from "../utils/format";
import { categoryOf } from "../utils/holdingCategory";

export interface Holding {
    portfolio: string;
    ticker: string | null;
    name: string;
    type: string | null;
    weightPct: number;
    returnPct: number | null;  // total return since purchase (cost basis); null if unavailable
}

interface Meta extends LogoMeta { type?: string; industry?: string }
type MetaMap = Record<string, Meta>;

interface HoldingsProps {
    portfolio?: string;  // when set, show only this portfolio (weights renormalized within it)
    title?: string;
    selectedTicker?: string | null;     // highlighted row
    onSelect?: (h: Holding) => void;    // row click; also auto-selects the first row
    bare?: boolean;                     // no card chrome: for use inside a shared container
}

type SortKey = "weight" | "return" | "az";
const SORTS: { key: SortKey; label: string }[] = [
    { key: "weight", label: "Weight" }, { key: "return", label: "Return" }, { key: "az", label: "A–Z" },
];
const ALL = "All";

const Chip = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button
        type="button"
        onClick={onClick}
        aria-pressed={on}
        className={`shrink-0 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium transition ${on ? "border-primary bg-primary text-primary-content" : "border-base-300 text-base-content/70 hover:border-base-content/30 hover:text-base-content"}`}
    >
        {children}
    </button>
);

// Strip the boilerplate issuer/family wrapper from fund names so the list-row
// secondary line shows the actual fund identifier (e.g. "Total Stock Market"
// instead of "Vanguard Index Funds - Vanguard Total Stock Market ETF Shares").
// The full unstripped name still appears in HoldingsMeta on the right.
function cleanFundName(raw: string | null | undefined): string {
    if (!raw) return raw ?? "";
    let s = raw;
    // Wrapper entities like "Vanguard Index Funds -" or "iShares Trust -"
    s = s.replace(
        /^(Vanguard Index Funds|Vanguard World Fund|Vanguard Bond Index Funds|Vanguard Tax-Managed Funds|iShares Trust|iShares,?\s*Inc\.?|iShares,?\s*Inc|SPDR Series Trust|SPDR Index Shares Funds|VanEck ETF Trust|Schwab Strategic Trust)\s*[-:]\s*/i,
        "",
    );
    // Plain brand prefix when it's the first word (e.g. "Vanguard Total ...")
    s = s.replace(
        /^(Vanguard|iShares|Schwab|Invesco|VanEck|SPDR|State Street|BlackRock|Pacer|WisdomTree|Fidelity|JPMorgan|Global X|ProShares)\s+/i,
        "",
    );
    // Common boilerplate suffixes
    s = s.replace(/\s+ETF Shares$/i, "");
    s = s.replace(/\s+ETF$/i, "");
    s = s.replace(/\s+Index Fund$/i, "");
    return s.trim() || raw;
}

export const Holdings = ({ portfolio, title, selectedTicker, onSelect, bare = false }: HoldingsProps = {}) => {
    const [holdings, setHoldings] = useState<Holding[] | null>(null);
    const [meta, setMeta] = useState<MetaMap>({});
    const [error, setError] = useState(false);
    const [sort, setSort] = useState<SortKey>("weight");
    const [cat, setCat] = useState<string>(ALL);

    // A category from one portfolio may not exist in the next.
    useEffect(() => { setCat(ALL); }, [portfolio]);

    useEffect(() => {
        let cancelled = false;
        cachedJson("/api/holdings")
            .then((d) => { if (!cancelled) setHoldings(d.holdings ?? []); })
            .catch(() => { if (!cancelled) setError(true); });

        // Logos + names live here. Failing this fetch just means letter chips.
        cachedJson("/api/finance/meta")
            .then((d) => { if (!cancelled) setMeta(d.meta ?? {}); })
            .catch(() => { /* letter chips fallback */ });

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

    const withCat = useMemo(
        () => rows.map((h) => ({ ...h, category: categoryOf(h, meta[h.ticker ?? ""]) })),
        [rows, meta],
    );
    // Every category in scope, largest share first, for the dropdown.
    const cats = useMemo(() => {
        const w = new Map<string, { weight: number; count: number }>();
        for (const h of withCat) {
            const c = w.get(h.category) ?? { weight: 0, count: 0 };
            c.weight += h.weightPct; c.count += 1;
            w.set(h.category, c);
        }
        return [...w.entries()].sort((a, b) => b[1].weight - a[1].weight);
    }, [withCat]);

    const shown = useMemo(() => {
        const list = withCat.filter((h) => cat === ALL || h.category === cat);
        const by: Record<SortKey, (a: Holding, b: Holding) => number> = {
            weight: (a, b) => b.weightPct - a.weightPct,
            return: (a, b) => (b.returnPct ?? -Infinity) - (a.returnPct ?? -Infinity),
            az: (a, b) => (a.ticker ?? a.name).localeCompare(b.ticker ?? b.name),
        };
        return [...list].sort(by[sort]);
    }, [withCat, cat, sort]);

    // Default to (and keep a valid) selection: the first visible row, so the
    // detail always matches something in the filtered list.
    useEffect(() => {
        if (!onSelect || shown.length === 0) return;
        if (!selectedTicker || !shown.some((r) => r.ticker === selectedTicker)) onSelect(shown[0]);
    }, [shown, selectedTicker, onSelect]);

    return (
        <div className={`flex flex-col h-full overflow-hidden ${bare ? "" : "bg-base-100 border border-base-300 rounded-2xl"}`}>
            {/* Header: what this is (+ count), how it's ordered, what it's filtered
                to, then the hint, which sits right above the rows it refers to. */}
            <div className="shrink-0 space-y-2.5 p-5 pb-2">
                {title !== "" && <h2 className="text-lg font-semibold text-base-content">{title ?? "My Portfolio Holdings"}</h2>}
                <div className="flex items-center justify-between gap-2">
                    <p className="flex items-center gap-2 text-sm font-medium text-base-content/80">
                        <span className="relative flex h-2 w-2" aria-hidden="true">
                            <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-75 animate-ping" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                        </span>
                        Live positions
                    </p>
                    {rows.length > 0 && (
                        <span className="text-xs tabular-nums text-base-content/60">
                            {cat === ALL ? `${rows.length} holdings` : `${shown.length} of ${rows.length}`}
                        </span>
                    )}
                </div>
                {rows.length > 0 && (
                    <>
                        <div className="flex items-center gap-1">
                            <span className="w-14 shrink-0 text-xs text-base-content/60">Sort</span>
                            {SORTS.map((s) => <Chip key={s.key} on={sort === s.key} onClick={() => setSort(s.key)}>{s.label}</Chip>)}
                        </div>
                        <label className="flex items-center gap-1">
                            <span className="w-14 shrink-0 text-xs text-base-content/60">Category</span>
                            <select
                                value={cat}
                                onChange={(e) => setCat(e.target.value)}
                                className="select select-xs min-w-0 flex-1 rounded-full border-base-300 bg-base-100 text-xs"
                            >
                                <option value={ALL}>All categories ({rows.length})</option>
                                {cats.map(([name, c]) => <option key={name} value={name}>{name} ({c.count})</option>)}
                            </select>
                        </label>
                    </>
                )}
                {onSelect && <p className="pt-0.5 text-[11px] text-base-content/60">Click any holding to view its details</p>}
            </div>

            {error ? (
                <p className="text-sm text-base-content/50 py-8 text-center px-5">Holdings are currently unavailable.</p>
            ) : !holdings ? (
                <div className="space-y-2 px-5 pb-5" aria-hidden="true">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-14 rounded-box bg-base-200 animate-pulse" />
                    ))}
                </div>
            ) : rows.length === 0 ? (
                <p className="text-sm text-base-content/50 py-8 text-center px-5">No holdings to display.</p>
            ) : (
                <ScrollArea className="flex-1 min-h-0" viewportClassName="max-h-[26rem] lg:max-h-none" contentClassName="px-2 pb-2">
                    <ul className="list">
                        {/* Column-header row using the same grid template as list-row.
                            "Holding" spans the logo + name columns so it sits flush
                            left with the row content below. The fixed-width Weight
                            and Total Return tracks align every row's right edge. */}
                        <li
                            className="list-row !py-1 !px-3 !bg-transparent text-[10px] uppercase tracking-widest text-base-content/40 font-semibold items-center"
                            style={{ gridTemplateColumns: "auto minmax(0, 1fr) 3.5rem 5.5rem" }}
                        >
                            <div className="col-span-2">Holding</div>
                            <div className="text-right">Weight</div>
                            <div className="text-right whitespace-nowrap">Total Return</div>
                        </li>
                        {shown.map((h, i) => {
                            const isSelected = selectedTicker === h.ticker;
                            const displayName = cleanFundName(h.name);
                            return (
                                <li
                                    key={`${h.ticker ?? h.name}-${i}`}
                                    onClick={() => onSelect?.(h)}
                                    aria-selected={isSelected}
                                    className={`list-row !py-1.5 !px-3 cursor-pointer transition-colors items-center ${isSelected ? "bg-primary/10" : "hover:bg-base-200/60"}`}
                                    style={{ gridTemplateColumns: "auto minmax(0, 1fr) 3.5rem 5.5rem" }}
                                >
                                    <HoldingLogo ticker={h.ticker} meta={meta[h.ticker ?? ""]} />
                                    <div className="min-w-0">
                                        <div className="font-semibold text-base-content leading-tight text-sm">{h.ticker ?? "—"}</div>
                                        <div className="text-[10.5px] uppercase font-semibold opacity-60 truncate leading-tight" title={h.name}>{displayName}</div>
                                    </div>
                                    <div className="text-right tabular-nums font-medium text-base-content shrink-0 text-sm">
                                        {formatWeightPct(h.weightPct)}
                                    </div>
                                    <div className="text-right shrink-0 text-sm">
                                        {h.returnPct == null ? (
                                            <span className="text-base-content/30" title="Cost basis unavailable">—</span>
                                        ) : (
                                            <span className={`font-medium tabular-nums ${h.returnPct > 0 ? "text-success" : h.returnPct < 0 ? "text-error" : "text-base-content/60"}`}>
                                                {h.returnPct > 0 ? "+" : ""}{h.returnPct.toFixed(1)}%
                                            </span>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </ScrollArea>
            )}
        </div>
    );
};
