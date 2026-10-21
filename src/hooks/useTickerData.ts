import { useState, useEffect, useMemo } from "react";
import { getTickerSeries, type SeriesEntry } from "../services/tickerService";
import staticCache from "../data/tickerCache.json";

export interface TickerPoint {
    date: string;
    VTI: number;
    VXUS: number;
    BND: number;
    BNDX: number;
}

// Month-end rows where all four funds have a price, oldest first.
function completeRows(entries: SeriesEntry[]) {
    return [...entries]
        .filter((e): e is SeriesEntry & { VTI: number; VXUS: number; BND: number; BNDX: number } =>
            e.VTI !== null && e.VXUS !== null && e.BND !== null && e.BNDX !== null
        )
        .sort((a, b) => a.date.localeCompare(b.date));
}

function rebase(sorted: ReturnType<typeof completeRows>, months: number): TickerPoint[] {
    // N months of returns need N + 1 month-end prices (the first is the base).
    const sliced = sorted.slice(-(months + 1));
    if (!sliced.length) return [];

    const base = sliced[0];
    // Prices are month-end closes, so label by month (never a day).
    // (Month + year at every length, so long ranges don't repeat a bare year.)
    const fmt: Intl.DateTimeFormatOptions = { month: "short", year: "2-digit" };

    return sliced.map((entry) => ({
        // "May 26" → "May '26"; plain four-digit years stay as they are.
        date: parseLocalDate(entry.date).toLocaleDateString("en-US", fmt).replace(/ (\d{2})$/, " '$1"),
        VTI: parseFloat(((entry.VTI / base.VTI - 1) * 100).toFixed(2)),
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

// `months` is the holding period; `maxMonths` how far back all four funds go.
export function useTickerData(months: number): {
    data: TickerPoint[];
    maxMonths: number;
    isLive: boolean;
    isLoading: boolean;
    asOfDate: string | null;
} {
    // Start from the baked-in history so the chart has real data on first
    // paint; fresher data replaces it once it arrives.
    const [series, setSeries] = useState<SeriesEntry[]>(staticCache.series as SeriesEntry[]);
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

    const rows = useMemo(() => completeRows(series), [series]);
    const data = useMemo(() => rebase(rows, months), [rows, months]);

    return { data, maxMonths: Math.max(rows.length - 1, 0), isLive, isLoading, asOfDate };
}
