// How the mix across portfolios has shifted: one server-side snapshot per day
// (/api/holdings/snapshots, weights only), stacked to 100%. The stat row above
// the chart doubles as its text equivalent: each portfolio's share now, and
// the change since the first snapshot.

import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cachedJson } from "../services/apiCache";

interface SnapshotDay { date: string; holdings: { portfolio: string; weightPct: number }[] }

// Fixed order + colors, so each portfolio keeps its color whatever the data holds.
// Validated (dataviz palette check) in light and dark.
const SERIES = [
    { key: "Core", color: "#B87A10" },
    { key: "Tech & Speculation", color: "#378ADD" },
    { key: "Retirement", color: "#1D9E75" },
] as const;

const parseDay = (d: string) => {
    const [y, m, day] = d.split("-").map(Number);
    return new Date(y, m - 1, day);
};
const fmtShort = (t: number) => new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" });

type Row = { t: number } & Record<string, number>;

const Tip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ dataKey: string; value: number; color: string }>; label?: number }) => {
    if (!active || !payload?.length || label == null) return null;
    return (
        <div className="rounded-lg border border-base-300 bg-base-200 px-3 py-2 text-xs shadow-lg">
            <p className="mb-1 font-medium text-base-content">{new Date(label).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
            {[...payload].reverse().map((p) => (
                <p key={p.dataKey} className="flex items-center gap-2 text-base-content/80">
                    <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                    {p.dataKey} <span className="ml-auto tabular-nums">{p.value.toFixed(1)}%</span>
                </p>
            ))}
        </div>
    );
};

export const AllocationHistory = () => {
    const [days, setDays] = useState<SnapshotDay[] | null>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        let live = true;
        cachedJson<{ days: SnapshotDay[] }>("/api/holdings/snapshots")
            .then((r) => live && setDays(r.days))
            .catch(() => live && setError(true));
        return () => { live = false; };
    }, []);

    const rows: Row[] = useMemo(() => (days ?? []).map((d) => {
        const row = { t: parseDay(d.date).getTime() } as Row;
        for (const s of SERIES) row[s.key] = 0;
        for (const h of d.holdings) if (h.portfolio in row) row[h.portfolio] += h.weightPct;
        for (const s of SERIES) row[s.key] = +row[s.key].toFixed(2);
        return row;
    }), [days]);

    const first = rows[0], last = rows[rows.length - 1];

    return (
        <div className="rounded-2xl border border-base-300 bg-base-100 p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-bold text-base-content">Allocation over time</h3>
                <p className="text-sm text-base-content/70">Each portfolio's share of the total, one snapshot a day</p>
            </div>

            {error ? <p className="mt-6 text-sm text-base-content/60">Unavailable.</p> : !days ? (
                <div className="mt-5 h-64 animate-pulse rounded-xl bg-base-200" />
            ) : rows.length < 2 ? (
                <p className="mt-6 text-sm text-base-content/70">
                    {rows.length
                        ? `Collecting daily snapshots. The first was taken ${fmtShort(first.t)}; the chart fills in from tomorrow.`
                        : "Collecting daily snapshots. The first is taken the next time holdings load."}
                </p>
            ) : (
                <>
                    <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:divide-x sm:divide-base-300 [&>*]:sm:pl-4 [&>*:first-child]:sm:pl-0">
                        {SERIES.map((s) => {
                            const delta = last[s.key] - first[s.key];
                            return (
                                <div key={s.key} className="min-w-0">
                                    <dt className="flex items-center gap-2 text-xs text-base-content/60">
                                        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />{s.key}
                                    </dt>
                                    <dd className="text-2xl font-bold tabular-nums tracking-tight text-base-content">{last[s.key].toFixed(1)}%</dd>
                                    <dd className="text-[11px] text-base-content/60">
                                        {Math.abs(delta) < 0.05 ? "unchanged" : `${delta > 0 ? "+" : "−"}${Math.abs(delta).toFixed(1)} pts`} since {fmtShort(first.t)}
                                    </dd>
                                </div>
                            );
                        })}
                    </dl>
                    <div className="mt-6 h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={rows} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                                <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.08} />
                                <XAxis dataKey="t" type="number" scale="time" domain={["dataMin", "dataMax"]} tickFormatter={fmtShort} tick={{ fontSize: 11, fill: "currentColor", opacity: 0.6 }} axisLine={false} tickLine={false} minTickGap={40} />
                                <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: "currentColor", opacity: 0.6 }} axisLine={false} tickLine={false} width={44} />
                                <Tooltip content={<Tip />} cursor={{ stroke: "currentColor", strokeOpacity: 0.3 }} />
                                {SERIES.map((s) => (
                                    <Area key={s.key} type="monotone" dataKey={s.key} stackId="mix" stroke="var(--color-base-100)" strokeWidth={2} fill={s.color} fillOpacity={0.85} isAnimationActive={false} />
                                ))}
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    <p className="mt-3 text-[11px] leading-snug text-base-content/60">
                        Weights only; no dollar amounts are stored. A day's snapshot is its last sync, so market moves and trades both shift the mix.
                    </p>
                </>
            )}
        </div>
    );
};
