// Drawdown: how far below its previous high the portfolio sat at every point,
// against the S&P 500. Built by chaining the calendar years from the monthly
// calendar, so the two agree. Uses a true time axis because the price history
// gets denser in recent periods; one slot per data point would stretch them.

import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useCalendarYears } from "../hooks/useCalendarYears";
import { PortfolioScopePill } from "./PortfolioScopePill";
import { calendarYears, drawdownFromYears, parseLocalDate, type DrawdownPoint } from "../utils/portfolioMath";

interface Point { t: number; date: string; portfolio: number; sp500?: number }

function worst(series: DrawdownPoint[]) {
    let min: DrawdownPoint | null = null;
    for (const p of series) if (!min || p.value < min.value) min = p;
    if (!min) return null;
    // Recovery: first point after the trough back at (or within 0.05% of) the old peak.
    const after = series.slice(series.indexOf(min));
    const recovered = after.find((p) => p.value >= -0.05);
    return { ...min, recoveredOn: recovered?.date ?? null };
}

const fmtDate = (d: string) => parseLocalDate(d).toLocaleDateString("en-US", { month: "short", year: "numeric" });
const weeksBetween = (a: string, b: string) => Math.round((parseLocalDate(b).getTime() - parseLocalDate(a).getTime()) / (7 * 864e5));

const Tip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ dataKey: string; value: number }>; label?: number }) => {
    if (!active || !payload?.length || label == null) return null;
    const get = (k: string) => payload.find((p) => p.dataKey === k)?.value;
    const port = get("portfolio"), sp = get("sp500");
    return (
        <div className="rounded-lg border border-base-300 bg-base-200 px-3 py-2 text-xs shadow-lg">
            <p className="mb-1 font-medium text-base-content">{new Date(label).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
            {port != null && <p className="text-error">Portfolio {port.toFixed(1)}%</p>}
            {sp != null && <p className="text-base-content/70">S&amp;P 500 {sp.toFixed(1)}%</p>}
        </div>
    );
};

export const DrawdownChart = ({ portfolio, scopeLabel, onScopeChange, scopeOptions }: {
    portfolio?: string;
    scopeLabel?: string;
    onScopeChange?: (next: string) => void;
    scopeOptions?: readonly string[];
}) => {
    const { years, prices, error } = useCalendarYears(portfolio);

    const { data, port, sp, current, floor, yearTicks } = useMemo(() => {
        if (!years || !prices) return { data: [] as Point[], port: null, sp: null, current: null, floor: -10, yearTicks: [] as number[] };
        const portSeries = drawdownFromYears(years);
        const spSeries = drawdownFromYears(calendarYears([{ ticker: "SPY", weightPct: 100 }], prices));
        const spByDate = new Map(spSeries.map((p) => [p.date, p.value]));
        // Round axis bounds to whole 10s, with one tick per year at its first date.
        const lowest = Math.min(...portSeries.map((p) => p.value), ...spSeries.map((p) => p.value));
        // Time axis (not one slot per data point): the bake gets denser in recent
        // periods, which would otherwise stretch them. One tick per Jan 1.
        const ticks: number[] = [];
        const first = parseLocalDate(portSeries[0].date), last = parseLocalDate(portSeries[portSeries.length - 1].date);
        for (let y = first.getFullYear() + 1; y <= last.getFullYear(); y++) ticks.push(new Date(y, 0, 1).getTime());
        return {
            floor: Math.floor(lowest / 10) * 10,
            yearTicks: ticks,
            data: portSeries.map((p) => ({ t: parseLocalDate(p.date).getTime(), date: p.date, portfolio: +p.value.toFixed(2), sp500: spByDate.has(p.date) ? +spByDate.get(p.date)!.toFixed(2) : undefined })),
            port: worst(portSeries),
            sp: worst(spSeries),
            current: portSeries[portSeries.length - 1]?.value ?? null,
        };
    }, [years, prices]);

    const stats = [
        { k: "Worst drop", v: port ? `${port.value.toFixed(1)}%` : "—", note: port ? fmtDate(port.date) : "", tone: "text-error" },
        { k: "S&P 500 worst", v: sp ? `${sp.value.toFixed(1)}%` : "—", note: sp ? fmtDate(sp.date) : "", tone: "text-base-content" },
        { k: "Recovered in", v: port?.recoveredOn ? `${weeksBetween(port.date, port.recoveredOn)} wks` : "Not yet", note: port?.recoveredOn ? `back at the high by ${fmtDate(port.recoveredOn)}` : "still below the old high", tone: "text-base-content" },
        { k: "From the high today", v: current != null ? (current > -0.05 ? "At a high" : `${current.toFixed(1)}%`) : "—", note: "", tone: current != null && current > -0.05 ? "text-success" : "text-base-content" },
    ];

    return (
        <div className="rounded-2xl border border-base-300 bg-base-100 p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-bold text-base-content">Drawdown</h3>
                    {scopeLabel && onScopeChange && scopeOptions && (
                        <PortfolioScopePill current={scopeLabel} onChange={onScopeChange} options={scopeOptions} align="start" />
                    )}
                </div>
                <p className="text-sm text-base-content/70">How far below its previous high, at every point</p>
            </div>

            {error ? <p className="mt-6 text-sm text-base-content/60">Unavailable.</p> : !data.length ? (
                <div className="mt-5 h-72 animate-pulse rounded-xl bg-base-200" />
            ) : (
                <>
                    <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4 sm:divide-x sm:divide-base-300 [&>*]:sm:pl-4 [&>*:first-child]:sm:pl-0">
                        {stats.map((s) => (
                            <div key={s.k} className="min-w-0">
                                <dt className="text-xs text-base-content/60">{s.k}</dt>
                                <dd className={`text-2xl font-bold tabular-nums tracking-tight ${s.tone}`}>{s.v}</dd>
                                {s.note && <dd className="truncate text-[11px] text-base-content/60">{s.note}</dd>}
                            </div>
                        ))}
                    </dl>
                    <div className="mt-6 h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                                <defs>
                                    <linearGradient id="ddFill" x1="0" x2="0" y1="0" y2="1">
                                        <stop offset="0" stopColor="var(--color-error)" stopOpacity="0.05" />
                                        <stop offset="1" stopColor="var(--color-error)" stopOpacity="0.45" />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.08} />
                                <XAxis dataKey="t" type="number" scale="time" domain={["dataMin", "dataMax"]} ticks={yearTicks} tickFormatter={(t) => String(new Date(t).getFullYear())} tick={{ fontSize: 11, fill: "currentColor", opacity: 0.6 }} axisLine={false} tickLine={false} />
                                <YAxis tickFormatter={(v) => `${v}%`} domain={[floor, 0]} ticks={Array.from({ length: -floor / 10 + 1 }, (_, i) => -i * 10)} tick={{ fontSize: 11, fill: "currentColor", opacity: 0.6 }} axisLine={false} tickLine={false} width={52} />
                                <Tooltip content={<Tip />} />
                                <Area type="monotone" dataKey="portfolio" stroke="var(--color-error)" strokeWidth={1.5} fill="url(#ddFill)" isAnimationActive={false} />
                                <Line type="monotone" dataKey="sp500" stroke="currentColor" strokeOpacity={0.45} strokeDasharray="4 4" dot={false} strokeWidth={1.5} isAnimationActive={false} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-3 flex gap-5 text-xs text-base-content/70">
                        <span className="flex items-center gap-2"><span className="h-2.5 w-4 rounded-sm bg-error/50" />Portfolio</span>
                        <span className="flex items-center gap-2"><span className="w-4 border-t-2 border-dashed border-base-content/50" />S&amp;P 500</span>
                    </div>
                    <p className="mt-3 text-[11px] leading-snug text-base-content/60">
                        Uses the same yearly blend as the monthly calendar, chained into one history. The first point is when price history begins, so drops before then aren't shown.
                    </p>
                </>
            )}
        </div>
    );
};
