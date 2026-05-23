import { useState, useCallback, useMemo, useEffect } from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

import { useTickerData, type TickerPoint } from "../hooks/useTickerData";

export type RangeKey = "3m" | "1y" | "3y" | "5y" | "10y";

interface DataPoint {
    date: string;
    portfolio: number;
    equities: number;
    bonds: number;
}

const INVESTMENT = 100_000;

interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{ dataKey: string; value: number }>;
    label?: string;
}

const RANGE_CONFIG: Record<RangeKey, { points: number; labelFormat: Intl.DateTimeFormatOptions }> = {
    "3m": { points: 90, labelFormat: { month: "short", day: "numeric" } },
    "1y": { points: 52, labelFormat: { month: "short", year: "2-digit" } },
    "3y": { points: 36, labelFormat: { month: "short", year: "2-digit" } },
    "5y": { points: 60, labelFormat: { month: "short", year: "2-digit" } },
    "10y": { points: 40, labelFormat: { year: "numeric" } },
};

const TICKER_DRIFTS = {
    VT: { drift: 0.09, vol: 1.6, seed: 11 },
    VXUS: { drift: 0.07, vol: 1.9, seed: 22 },
    BND: { drift: 0.03, vol: 0.5, seed: 33 },
    BNDX: { drift: 0.025, vol: 0.45, seed: 44 },
};

function lcg(seed: number) {
    let r = seed;
    return () => { r = (r * 1664525 + 1013904223) & 0xffffffff; return (r >>> 0) / 0xffffffff; };
}

function generateTicker(points: number, drift: number, vol: number, seed: number): number[] {
    const rand = lcg(seed);
    let v = 0;
    return Array.from({ length: points + 1 }, () => {
        v += drift / 52 + (rand() - 0.48) * vol;
        return parseFloat(v.toFixed(2));
    });
}

function buildSeries(range: RangeKey): TickerPoint[] {
    const { points, labelFormat } = RANGE_CONFIG[range];
    const stepMs =
        range === "3m" ? 86400000 :
            range === "1y" ? 7 * 86400000 :
                range === "3y" ? 30 * 86400000 :
                    range === "5y" ? 30 * 86400000 :
                        90 * 86400000;
    const now = new Date();
    const tickers = Object.entries(TICKER_DRIFTS).reduce((acc, [key, cfg]) => {
        acc[key] = generateTicker(points, cfg.drift, cfg.vol, cfg.seed);
        return acc;
    }, {} as Record<string, number[]>);

    return Array.from({ length: points + 1 }, (_, i) => {
        const d = new Date(now.getTime() - (points - i) * stepMs);
        return {
            date: d.toLocaleDateString("en-US", labelFormat).replace(/(\d{2})$/, "'$1"),
            VT: tickers.VT[i],
            VXUS: tickers.VXUS[i],
            BND: tickers.BND[i],
            BNDX: tickers.BNDX[i],
        };
    });
}

const BASE_DATA: Record<RangeKey, TickerPoint[]> = {
    "3m": buildSeries("3m"),
    "1y": buildSeries("1y"),
    "3y": buildSeries("3y"),
    "5y": buildSeries("5y"),
    "10y": buildSeries("10y"),
};

function getAllocation(equityPct: number) {
    const eq = equityPct / 100;
    const bd = 1 - eq;
    return { VT: eq * 0.6, VXUS: eq * 0.4, BND: bd * 0.6, BNDX: bd * 0.4 };
}

function computeSeries(points: TickerPoint[], equityPct: number): DataPoint[] {
    const alloc = getAllocation(equityPct);

    return points.map(({ date, VT, VXUS, BND, BNDX }) => {
        const equitiesLine = parseFloat((VT * 0.6 + VXUS * 0.4).toFixed(2));
        const bondsLine = parseFloat((BND * 0.6 + BNDX * 0.4).toFixed(2));
        const portfolio = parseFloat(
            (VT * alloc.VT + VXUS * alloc.VXUS + BND * alloc.BND + BNDX * alloc.BNDX).toFixed(2)
        );
        return { date, equities: equitiesLine, bonds: bondsLine, portfolio };
    });
}

const RANGES: RangeKey[] = ["3m", "1y", "3y", "5y", "10y"];

const LINES = [
    { key: "equities", label: "Stocks", color: "#378ADD", dash: "" },
    { key: "bonds", label: "Bonds", color: "#7F77DD", dash: "" },
    { key: "portfolio", label: "Portfolio", color: "#E8A020", dash: "7 4" },
] as const;

const fmtDollar = (pct: number) =>
    `$${Math.round(INVESTMENT * (1 + pct / 100)).toLocaleString()}`;

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-base-200 border border-base-300 rounded-xl px-4 py-3 text-sm shadow-lg">
            <p className="text-base-content/70 text-xs font-medium mb-2">{label}</p>
            {LINES.map(({ key, label: name, color }) => {
                const entry = payload.find((p) => p.dataKey === key);
                if (!entry) return null;
                const val = entry.value;
                return (
                    <div key={key} className="flex items-center justify-between gap-6 py-0.5">
                        <span className="flex items-center gap-1.5 text-base-content/80">
                            <span className="w-2 h-2 rounded-full inline-block" style={{ background: color }} />
                            {name}
                        </span>
                        <div className="text-right">
                            <span className="font-medium text-base-content">
                                {val > 0 ? "+" : ""}{val.toFixed(2)}%
                            </span>
                            <div className="text-[10px] text-base-content/60">{fmtDollar(val)}</div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

interface PortfolioProps {
    appliedEquityPct?: number | null;
}

export const Portfolio = ({ appliedEquityPct }: PortfolioProps = {}) => {
    const [range, setRange] = useState<RangeKey>("1y");
    const [equityPct, setEquityPct] = useState(appliedEquityPct ?? 80);

    useEffect(() => {
        if (appliedEquityPct != null) setEquityPct(appliedEquityPct);
    }, [appliedEquityPct]);

    const { data: tickerData, isLive, isLoading, asOfDate } = useTickerData(range);
    const alloc = getAllocation(equityPct);

    // Fall back to generated data while loading or if API unavailable
    const seriesPoints: TickerPoint[] = tickerData.length ? tickerData : BASE_DATA[range];

    const data = useMemo(() => computeSeries(seriesPoints, equityPct), [seriesPoints, equityPct]);

    useEffect(() => {
        console.log("[Portfolio] range=%s equityPct=%d%% points=%d", range, equityPct, seriesPoints.length);
        console.log("[Portfolio] raw series (first/last):", seriesPoints[0], "→", seriesPoints[seriesPoints.length - 1]);
        console.log("[Portfolio] computed chart data (first/last):", data[0], "→", data[data.length - 1]);
    }, [data]);

    const bondPct = 100 - equityPct;
    const last = data[data.length - 1];

    const allocCards = [
        { ticker: "$VT", label: "US Equities", pct: alloc.VT * 100, color: "#378ADD", bg: "rgba(55,138,221,0.08)", border: "rgba(55,138,221,0.25)" },
        { ticker: "$VXUS", label: "International Equities", pct: alloc.VXUS * 100, color: "#1D9E75", bg: "rgba(29,158,117,0.08)", border: "rgba(29,158,117,0.25)" },
        { ticker: "$BND", label: "US Bonds", pct: alloc.BND * 100, color: "#7F77DD", bg: "rgba(127,119,221,0.08)", border: "rgba(127,119,221,0.25)" },
        { ticker: "$BNDX", label: "International Bonds", pct: alloc.BNDX * 100, color: "#D85A30", bg: "rgba(216,90,48,0.08)", border: "rgba(216,90,48,0.25)" },
    ];

    const formatTick = useCallback((v: number) => `${v > 0 ? "+" : ""}${v.toFixed(0)}%`, []);

    return (
        <div className="bg-base-100 border border-base-300 rounded-2xl p-6 space-y-5">

            {/* Header */}
            <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold text-base-content">Hypothetical Diversified Portfolio</h2>
                        {isLoading ? (
                            <span className="w-2 h-2 rounded-full bg-base-content/20 animate-pulse" />
                        ) : isLive ? (
                            <span className="flex items-center gap-1 text-xs text-success font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
                                Live
                            </span>
                        ) : (
                            <span className="text-xs text-base-content/30 font-medium">Simulated</span>
                        )}
                    </div>
                    <p className="text-sm text-base-content mt-0.5">$100,000 invested · Last {range.toUpperCase()}</p>
                </div>
                <div className="flex gap-1">
                    {RANGES.map((r) => (
                        <button
                            key={r}
                            onClick={() => setRange(r)}
                            className={`btn btn-sm rounded-lg font-medium ${range === r ? "btn-neutral" : "btn-ghost text-base-content/50"
                                }`}
                        >
                            {r.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            {/* Allocation cards + portfolio total */}
            <div>
                <p className="text-xs text-base-content uppercase tracking-widest font-medium mb-2">
                    Portfolio allocation
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {allocCards.map(({ ticker, label, pct, color, bg, border }) => (
                        <div
                            key={ticker}
                            className="rounded-xl px-4 py-3 flex flex-col gap-1"
                            style={{ background: bg, border: `1px solid ${border}` }}
                        >
                            <div className="flex items-center justify-between gap-1 flex-wrap">
                                <span className="text-xs font-semibold" style={{ color }}>{ticker}</span>
                                <span className="text-xs text-base-content">{label}</span>
                            </div>
                            <p className="text-3xl font-bold tracking-tight" style={{ color }}>
                                {pct.toFixed(0)}<span className="text-lg font-medium opacity-70">%</span>
                            </p>
                            <div className="w-full h-1 rounded-full bg-base-300 mt-1">
                                <div
                                    className="h-1 rounded-full transition-all duration-300"
                                    style={{ width: `${pct}%`, background: color }}
                                />
                            </div>
                        </div>
                    ))}

                    {/* Portfolio total return card */}
                    <div
                        className="rounded-xl px-4 py-3 flex flex-col gap-1 row-span-1"
                        style={{
                            background: "rgba(232,160,32,0.08)",
                            border: "1px solid rgba(232,160,32,0.35)",
                        }}
                    >
                        <div className="flex items-center justify-between gap-1 flex-wrap">
                            <span className="text-xs font-semibold text-warning">Total return</span>
                            <span className="text-xs text-base-content">Portfolio</span>
                        </div>
                        <p className="text-3xl font-bold tracking-tight text-warning">
                            {last.portfolio > 0 ? "+" : ""}
                            {last.portfolio.toFixed(2)}
                            <span className="text-lg font-medium opacity-70">%</span>
                            <span className="text-base font-medium text-base-content/60 ml-1.5">
                                ({fmtDollar(last.portfolio)})
                            </span>
                        </p>
                        <div className="w-full h-1 rounded-full bg-base-300 mt-1">
                            <div
                                className="h-1 rounded-full transition-all duration-300"
                                style={{
                                    width: `${Math.min(Math.abs(last.portfolio) * 3, 100)}%`,
                                    background: "#E8A020",
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Slider */}
            <div className="space-y-2 pt-1">
                <div className="flex justify-between text-sm font-semibold">
                    <span className="text-[#7F77DD]">Bonds {bondPct}%</span>
                    <span className="text-xs text-bold text-base-content/50 self-center">Bonds / Equities</span>
                    <span className="text-[#378ADD]">Equities {equityPct}%</span>
                </div>
                <input
                    type="range"
                    min={0}
                    max={100}
                    step={10}
                    value={equityPct}
                    onChange={(e) => setEquityPct(Number(e.target.value))}
                    className="range w-full [--range-bg:#7F77DD] [--range-thumb:#378ADD] [--range-fill:0]"
                />
                <div className="flex justify-between px-0.5">
                    {Array.from({ length: 11 }, (_, i) => {
                        const eq = i * 10;
                        const bd = 100 - eq;
                        return (
                            <span key={i} className="text-xs text-base-content/40 text-center" style={{ fontSize: "10px" }}>
                                {bd}/{eq}
                            </span>
                        );
                    })}
                </div>
            </div>

            {/* Chart */}
            <div className="relative">
            {asOfDate && (
                <span className="absolute top-1 right-1 text-[10px] text-base-content/30 z-10 pointer-events-none">
                    As of {asOfDate}
                </span>
            )}
            <ResponsiveContainer width="100%" height={280}>
                <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="currentColor"
                        className="text-base-content/10"
                        vertical={false}
                    />
                    <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11, fill: "currentColor", opacity: 0.4 }}
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                        minTickGap={50}
                    />
                    <YAxis
                        tickFormatter={formatTick}
                        tick={{ fontSize: 11, fill: "currentColor", opacity: 0.4 }}
                        tickLine={false}
                        axisLine={false}
                        width={48}
                    />
                    <Tooltip
                        content={<CustomTooltip />}
                        cursor={{ stroke: "currentColor", strokeOpacity: 0.1, strokeWidth: 1 }}
                    />
                    {LINES.map(({ key, color, dash }) => (
                        <Line
                            key={key}
                            type="monotone"
                            dataKey={key}
                            stroke={color}
                            strokeWidth={key === "portfolio" ? 3 : 1.5}
                            strokeOpacity={key === "portfolio" ? 1 : 0.45}
                            strokeDasharray={dash}
                            dot={false}
                            activeDot={{ r: key === "portfolio" ? 5 : 4, strokeWidth: key === "portfolio" ? 2 : 0, stroke: key === "portfolio" ? "#fff" : "none" }}
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex gap-4 flex-wrap">
                {LINES.map(({ key, label, color, dash }) => (
                    <span key={key} className="flex items-center gap-2 text-xs text-base-content/50">
                        <svg width="20" height="10">
                            <line
                                x1="0" y1="5" x2="20" y2="5"
                                stroke={color}
                                strokeWidth="2.5"
                                strokeDasharray={dash}
                                strokeLinecap="round"
                            />
                        </svg>
                        {label}
                    </span>
                ))}
            </div>



        </div>
    );
};
