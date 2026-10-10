// Calendar-year returns for the holdings in scope, plus the price history they
// came from. Shared by the monthly returns calendar and the drawdown chart.
// (Lives outside the component files so React Fast Refresh can hot-reload
// them: a component file must export only components.)

import { useEffect, useMemo, useState } from "react";
import { cachedJson } from "../services/apiCache";
import { calendarYears, type PriceMap, type YearReturns } from "../utils/portfolioMath";
import type { Holding } from "../components/Holdings";

export function useCalendarYears(portfolio?: string) {
    const [holdings, setHoldings] = useState<Holding[] | null>(null);
    const [prices, setPrices] = useState<PriceMap | null>(null);
    const [error, setError] = useState(false);
    useEffect(() => {
        let cancelled = false;
        cachedJson<{ holdings: Holding[] }>("/api/holdings").then((d) => { if (!cancelled) setHoldings(d.holdings ?? []); }).catch(() => { if (!cancelled) setError(true); });
        cachedJson<{ prices: PriceMap }>("/api/finance/history").then((d) => { if (!cancelled) setPrices(d.prices ?? {}); }).catch(() => { if (!cancelled) setError(true); });
        return () => { cancelled = true; };
    }, []);
    const years = useMemo<YearReturns[] | null>(() => {
        if (!holdings || !prices) return null;
        const scoped = portfolio ? holdings.filter((h) => h.portfolio === portfolio) : holdings;
        return calendarYears(scoped, prices);
    }, [holdings, prices, portfolio]);
    return { years, prices, error };
}
