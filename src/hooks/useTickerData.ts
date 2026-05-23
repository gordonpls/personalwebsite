import { useState, useEffect, useMemo } from "react";
import type { RangeKey } from "../components/HypotheticalPortfolio";
import { getTickerSeries, type SeriesEntry } from "../services/tickerService";
import staticCache from "../data/tickerCache.json";

const RANGE_MONTHS: Record<RangeKey, number> = {
    "3m": 3,
    "1y": 12,
    "3y": 36,
    "5y": 60,
    "10y": 120,
};

export interface TickerPoint {
    date: string;
    VT: number;
    VXUS: number;
    BND: number;
    BNDX: number;
}

function rebase(entries: SeriesEntry[], months: number): TickerPoint[] {
    const sorted = [...entries]
        .filter((e): e is SeriesEntry & { VT: number; VXUS: number; BND: number; BNDX: number } =>
            e.VT !== null && e.VXUS !== null && e.BND !== null && e.BNDX !== null
        )
        .sort((a, b) => a.date.localeCompare(b.date));

    const sliced = sorted.slice(-months);
    if (!sliced.length) return [];

    const base = sliced[0];
    const fmt: Intl.DateTimeFormatOptions =
        months <= 3 ? { month: "short", day: "numeric" } :
            months <= 60 ? { month: "short", year: "2-digit" } :
                { year: "numeric" };

    return sliced.map((entry) => ({
        date: parseLocalDate(entry.date).toLocaleDateString("en-US", fmt).replace(/(\d{2})$/, "'$1"),
        VT: parseFloat(((entry.VT / base.VT - 1) * 100).toFixed(2)),
        VXUS: parseFloat(((entry.VXUS / base.VXUS - 1) * 100).toFixed(2)),
        BND: parseFloat(((entry.BND / base.BND - 1) * 100).toFixed(2)),
        BNDX: parseFloat(((entry.BNDX / base.BNDX - 1) * 100).toFixed(2)),
    }));
}

function parseLocalDate(dateStr: string): Date {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function formatAsOf(isoDate: string): string {
    return parseLocalDate(isoDate).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function useTickerData(range: RangeKey): {
    data: TickerPoint[];
    isLive: boolean;
    isLoading: boolean;
    asOfDate: string | null;
} {
    const [series, setSeries] = useState<SeriesEntry[]>([]);
    const [isLive, setIsLive] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [asOfDate, setAsOfDate] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setIsLoading(true);

        getTickerSeries()
            .then(({ series: fetched, isLive: live, lastDate }) => {
                if (cancelled) return;

                // Prefer live data; fall back to static baked-in cache
                const resolved: SeriesEntry[] =
                    fetched.length ? fetched : (staticCache.series as SeriesEntry[]);
                const staticSeries = staticCache.series as SeriesEntry[];
                const resolvedDate = lastDate ??
                    (staticSeries.length ? staticSeries[staticSeries.length - 1].date : null);

                setSeries(resolved);
                setIsLive(fetched.length ? live : false);
                setAsOfDate(resolvedDate ? formatAsOf(resolvedDate) : null);
            })
            .catch(() => {
                if (cancelled) return;
                const fallback = staticCache.series as SeriesEntry[];
                setSeries(fallback);
                setIsLive(false);
                if (fallback.length) {
                    setAsOfDate(formatAsOf(fallback[fallback.length - 1].date));
                }
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });

        return () => { cancelled = true; };
    }, []);

    const months = RANGE_MONTHS[range];
    const data = useMemo(() => rebase(series, months), [series, months]);

    return { data, isLive, isLoading, asOfDate };
}
