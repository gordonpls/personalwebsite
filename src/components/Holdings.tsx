import { useEffect, useMemo, useState } from "react";
import { ScrollArea } from "./ScrollArea";

export interface Holding {
    portfolio: string;
    ticker: string | null;
    name: string;
    type: string | null;
    weightPct: number;
    returnPct: number | null;  // total return since purchase (cost basis); null if unavailable
}

interface Meta { type?: string; name?: string; logo?: string }
type MetaMap = Record<string, Meta>;

interface HoldingsProps {
    portfolio?: string;  // when set, show only this portfolio (weights renormalized within it)
    title?: string;
    selectedTicker?: string | null;     // highlighted row
    onSelect?: (h: Holding) => void;    // row click; also auto-selects the first row
}

// ETF issuer detection by name keyword → domain we can pull a favicon from.
// Order matters when issuer names overlap (e.g. "iShares MSCI" should hit
// BlackRock/iShares before any generic "MSCI" rule).
const ETF_ISSUERS: { test: RegExp; domain: string }[] = [
    { test: /\bvanguard\b/i, domain: "vanguard.com" },
    { test: /\b(ishares|blackrock)\b/i, domain: "ishares.com" },
    { test: /\b(spdr|state street)\b/i, domain: "ssga.com" },
    { test: /\bschwab\b/i, domain: "schwab.com" },
    { test: /\binvesco\b/i, domain: "invesco.com" },
    { test: /\bvaneck\b/i, domain: "vaneck.com" },
    { test: /\bfidelity\b/i, domain: "fidelity.com" },
    { test: /\bpacer\b/i, domain: "paceretfs.com" },
    { test: /\bproshares\b/i, domain: "proshares.com" },
    { test: /\bwisdomtree\b/i, domain: "wisdomtree.com" },
    { test: /\bjpmorgan\b/i, domain: "jpmorgan.com" },
    { test: /\bglobal x\b/i, domain: "globalxetfs.com" },
];

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

function getLogoUrl(ticker: string | null, meta?: Meta): string | null {
    // Stocks: Finnhub usually has a logo and we bake it into holdingsMeta.json.
    if (meta?.logo) return meta.logo;
    // ETFs: identify the issuer from the fund name → favicon via Google.
    const name = meta?.name ?? "";
    for (const issuer of ETF_ISSUERS) {
        if (issuer.test.test(name)) {
            return `https://www.google.com/s2/favicons?domain=${issuer.domain}&sz=128`;
        }
    }
    // Last-ditch: Finnhub's stock-logo bucket. May 404 for ETFs; the <Logo />
    // component swaps to a letter chip on error.
    return ticker
        ? `https://static2.finnhub.io/file/publicdatany/finnhubimage/stock_logo/${ticker}.png`
        : null;
}

const Logo = ({ ticker, meta }: { ticker: string | null; meta?: Meta }) => {
    const [failed, setFailed] = useState(false);
    const url = getLogoUrl(ticker, meta);
    if (!url || failed) {
        return (
            <div
                className="size-8 rounded-md bg-base-200 border border-base-300 flex items-center justify-center text-[9px] font-bold text-base-content/60 shrink-0"
                aria-hidden="true"
            >
                {ticker ? ticker.slice(0, 4) : "—"}
            </div>
        );
    }
    return (
        <img
            className="size-8 rounded-md bg-base-100 border border-base-300 object-contain p-0.5 shrink-0"
            src={url}
            alt=""
            loading="lazy"
            onError={() => setFailed(true)}
        />
    );
};

export const Holdings = ({ portfolio, title, selectedTicker, onSelect }: HoldingsProps = {}) => {
    const [holdings, setHoldings] = useState<Holding[] | null>(null);
    const [meta, setMeta] = useState<MetaMap>({});
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

        // Logos + names live here. Failing this fetch just means letter chips.
        fetch("/holdingsMeta.json", { cache: "no-cache" })
            .then((r) => r.ok ? r.json() : Promise.reject())
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

    // Default to (and keep a valid) selection — the first row of the active portfolio.
    useEffect(() => {
        if (!onSelect || rows.length === 0) return;
        if (!selectedTicker || !rows.some((r) => r.ticker === selectedTicker)) onSelect(rows[0]);
    }, [rows, selectedTicker, onSelect]);

    return (
        <div className="bg-base-100 border border-base-300 rounded-2xl flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="shrink-0 p-5 pb-3">
                {title !== "" && <h2 className="text-lg font-semibold text-base-content">{title ?? "My Portfolio Holdings"}</h2>}
                <p className="text-sm text-base-content/60 mt-0.5 flex items-center gap-2">
                    <span className="relative flex h-2 w-2" aria-hidden="true">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-75 animate-ping" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                    </span>
                    Live Positions
                </p>
                {onSelect && <p className="text-xs text-base-content/70 mt-1.5">👇 Click any holding to view its details</p>}
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
                        {/* Column-header row using the same grid template as list-row */}
                        <li className="list-row !py-1 !px-3 !bg-transparent text-[10px] uppercase tracking-widest text-base-content/40 font-semibold items-center">
                            <div aria-hidden="true" className="size-8" />
                            <div>Holding</div>
                            <div className="text-right">Weight</div>
                            <div className="text-right">Return</div>
                        </li>
                        {rows.map((h, i) => {
                            const isSelected = selectedTicker === h.ticker;
                            const displayName = cleanFundName(h.name);
                            return (
                                <li
                                    key={`${h.ticker ?? h.name}-${i}`}
                                    onClick={() => onSelect?.(h)}
                                    aria-selected={isSelected}
                                    className={`list-row !py-1.5 !px-3 cursor-pointer transition-colors items-center ${isSelected ? "bg-primary/10" : "hover:bg-base-200/60"}`}
                                >
                                    <Logo ticker={h.ticker} meta={meta[h.ticker ?? ""]} />
                                    <div className="min-w-0">
                                        <div className="font-semibold text-base-content leading-tight text-sm">{h.ticker ?? "—"}</div>
                                        <div className="text-[10.5px] uppercase font-semibold opacity-60 truncate leading-tight" title={h.name}>{displayName}</div>
                                    </div>
                                    <div className="text-right tabular-nums font-medium text-base-content shrink-0 text-sm">
                                        {h.weightPct.toFixed(1)}%
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
