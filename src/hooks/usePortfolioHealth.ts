// Connection health per display portfolio, from /api/plaid/status. The server
// rolls each portfolio's brokerage connections into one status (errored if any
// is, oldest sync/price date) so no institution names reach the browser.

import { useEffect, useState } from "react";
import { cachedJson } from "../services/apiCache";

export interface PortfolioHealth {
    status: "healthy" | "error";
    lastSyncedAt: string | null;
    pricesAsOf: string | null;
    consentExpiresAt: string | null;
}

interface StatusResponse { all: PortfolioHealth; portfolios: Record<string, PortfolioHealth> }

// Returns null until loaded (or if the status call fails, so cards stay clean).
export function usePortfolioHealth(): StatusResponse | null {
    const [data, setData] = useState<StatusResponse | null>(null);
    useEffect(() => {
        let live = true;
        cachedJson<StatusResponse>("/api/plaid/status").then((r) => live && setData(r)).catch(() => {});
        return () => { live = false; };
    }, []);
    return data;
}
