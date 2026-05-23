import { useEffect, useState } from "react";
import { ResponsiveContainer, Treemap, Tooltip } from "recharts";

interface Holding {
    portfolio: string;
    ticker: string | null;
    name: string;
    type: string | null;
    weightPct: number;
}
interface Node {
    name: string;
    size: number;
    changePct: number | null;
    fullName: string;
}

// A ±CLAMP% daily move is fully saturated; smaller moves shade toward neutral.
const CLAMP = 2; // a ±2% day reaches full color
// TradingView/Finviz-style diverging ramp: flat dark gray -> deep -> vivid.
const FLAT = [54, 57, 64];
const MID_POS = [33, 110, 58]; const POS = [56, 204, 80];   // deep green -> bright green
const MID_NEG = [110, 40, 40]; const NEG = [236, 56, 56];   // maroon -> bright red
const GAP = "#0b0e14";          // near-black tile gaps / backdrop
const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
const mix = (a: number[], b: number[], t: number) => a.map((v, i) => lerp(v, b[i], t));
const toHex = (c: number[]) => "#" + c.map((x) => Math.max(0, Math.min(255, x)).toString(16).padStart(2, "0")).join("");
function tileColor(cp: number | null): string {
    if (cp == null) return "#6b7280";
    const t = Math.min(1, Math.abs(cp) / CLAMP);
    const [mid, end] = cp >= 0 ? [MID_POS, POS] : [MID_NEG, NEG];
    const rgb = t < 0.5 ? mix(FLAT, mid, t / 0.5) : mix(mid, end, (t - 0.5) / 0.5);
    return toHex(rgb);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const Tile = (props: any) => {
    const { x, y, width, height, depth } = props;
    if (depth === 0 || width <= 0 || height <= 0) return null;
    const cp: number | null = props.changePct ?? props.payload?.changePct ?? null;
    const label: string = props.name ?? props.payload?.name ?? "";
    const showText = width > 40 && height > 26;
    const showChg = width > 50 && height > 40 && cp != null;
    return (
        <g>
            <rect
                x={x} y={y} width={width} height={height} rx={3}
                style={{ fill: tileColor(cp), stroke: GAP, strokeWidth: 2 }}
            />
            {showText && (
                <text x={x + width / 2} y={y + height / 2 - (showChg ? 7 : 0)} textAnchor="middle" dominantBaseline="middle"
                    fontSize={Math.min(13, Math.max(9, width / 4.5))} fontWeight={700} fill="#fff"
                    stroke="rgba(0,0,0,0.55)" strokeWidth={2.6} paintOrder="stroke" strokeLinejoin="round">
                    {label}
                </text>
            )}
            {showChg && (
                <text x={x + width / 2} y={y + height / 2 + 9} textAnchor="middle" dominantBaseline="middle"
                    fontSize={10} fill="#fff" fillOpacity={0.9}
                    stroke="rgba(0,0,0,0.5)" strokeWidth={2} paintOrder="stroke" strokeLinejoin="round">
                    {cp > 0 ? "+" : ""}{cp.toFixed(2)}%
                </text>
            )}
        </g>
    );
};

const HeatTooltip = (props: any) => {
    const { active, payload } = props;
    if (!active || !payload?.length) return null;
    const d = payload[0].payload as Node;
    return (
        <div className="bg-base-200 border border-base-300 rounded-lg px-3 py-2 text-xs shadow-lg">
            <div className="font-semibold text-base-content">{d.name}</div>
            {d.fullName && <div className="text-base-content/50 max-w-[14rem] truncate">{d.fullName}</div>}
            <div className="mt-1 text-base-content/70">
                Weight {d.size.toFixed(1)}%{d.changePct != null ? ` · Today ${d.changePct > 0 ? "+" : ""}${d.changePct.toFixed(2)}%` : ""}
            </div>
        </div>
    );
};
/* eslint-enable @typescript-eslint/no-explicit-any */

export const HoldingsHeatmap = ({ portfolio, title }: { portfolio?: string; title?: string } = {}) => {
    const [holdings, setHoldings] = useState<Holding[] | null>(null);
    const [quotes, setQuotes] = useState<Record<string, number>>({});
    const [quotesAsOf, setQuotesAsOf] = useState<string | null>(null);
    const [quotesOk, setQuotesOk] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        let cancelled = false;
        fetch("/api/holdings")
            .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
            .then((d) => { if (!cancelled) setHoldings(d.holdings ?? []); })
            .catch(() => { if (!cancelled) setError(true); });

        fetch("/api/quotes")
            .then((r) => r.ok ? r.json() : Promise.reject())
            .then((d) => { if (!cancelled) { setQuotes(d.quotes ?? {}); setQuotesAsOf(d.asOf ?? null); } })
            .catch(() => { if (!cancelled) setQuotesOk(false); });

        return () => { cancelled = true; };
    }, []);

    let list = (holdings ?? []).filter((h) => h.weightPct > 0);
    if (portfolio) list = list.filter((h) => h.portfolio === portfolio);
    const wsum = list.reduce((s, h) => s + h.weightPct, 0);
    const data: Node[] = list.map((h) => ({
        name: h.ticker ?? h.name,
        size: wsum > 0 ? (h.weightPct / wsum) * 100 : 0,  // renormalize within the portfolio
        changePct: h.ticker && h.ticker in quotes ? quotes[h.ticker] : null,
        fullName: h.name,
    }));

    const asOfLabel = quotesAsOf
        ? new Date(quotesAsOf).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
        : null;

    return (
        <div className="bg-base-100 border border-base-300 rounded-2xl p-6 space-y-5">
            <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                    <h2 className="text-lg font-semibold text-base-content">{title ?? "My Portfolio Heatmap"}</h2>
                    <p className="text-sm text-base-content/60 mt-0.5">
                        Sized by weight · shaded by today’s price change
                        {!quotesOk && <span className="text-base-content/40"> · live prices unavailable</span>}
                    </p>
                </div>
                {!error && data.length > 0 && (
                    <div className="flex items-center gap-2 text-[10px] text-base-content/50">
                        <span>−{CLAMP}%</span>
                        <span className="h-2 w-28 rounded-full" style={{ background: `linear-gradient(to right, ${toHex(NEG)}, ${toHex(MID_NEG)}, ${toHex(FLAT)}, ${toHex(MID_POS)}, ${toHex(POS)})` }} />
                        <span>+{CLAMP}%</span>
                    </div>
                )}
            </div>

            {error ? (
                <p className="text-sm text-base-content/50 py-10 text-center">Connect your brokerage to see the heatmap.</p>
            ) : !holdings ? (
                <div className="h-[340px] rounded bg-base-200 animate-pulse" aria-hidden="true" />
            ) : data.length === 0 ? (
                <p className="text-sm text-base-content/50 py-10 text-center">No holdings to display.</p>
            ) : (
                <div className="relative rounded-lg overflow-hidden" style={{ background: GAP }}>
                    {asOfLabel && (
                        <span className="absolute top-1.5 right-2 text-[10px] text-white/40 z-10 pointer-events-none">
                            As of {asOfLabel}
                        </span>
                    )}
                    <ResponsiveContainer width="100%" height={340}>
                        <Treemap data={data} dataKey="size" content={<Tile />} isAnimationActive={false} stroke={GAP}>
                            <Tooltip content={<HeatTooltip />} />
                        </Treemap>
                    </ResponsiveContainer>
                </div>
            )}

            <p className="text-[11px] text-base-content/40 leading-snug">
                Each tile is a position, sized by its share of the portfolio and shaded by its live daily price change.
                Cash and securities without a live quote show neutral.
            </p>
        </div>
    );
};
