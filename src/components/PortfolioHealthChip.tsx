// One-line data freshness + connection health for a portfolio card: whether
// its brokerage connections are working, when they last synced, and the date
// their prices are from. Shape comes from usePortfolioHealth.

import type { PortfolioHealth } from "../hooks/usePortfolioHealth";

const DAY = 864e5;

function ago(iso: string | null) {
    if (!iso) return "not synced";
    const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return "synced now";
    if (mins < 60) return `synced ${mins}m ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 48) return `synced ${hrs}h ago`;
    return `synced ${Math.round(hrs / 24)}d ago`;
}

// Plaid price dates are plain YYYY-MM-DD; parse as local so they don't shift a day.
const fmtDay = (d: string) => {
    const [y, m, day] = d.split("-").map(Number);
    return new Date(y, m - 1, day).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export const PortfolioHealthChip = ({ health }: { health?: PortfolioHealth }) => {
    if (!health) return null;
    const ok = health.status === "healthy";
    const consentDays = health.consentExpiresAt ? Math.ceil((new Date(health.consentExpiresAt).getTime() - Date.now()) / DAY) : null;
    const detail = [
        ok ? ago(health.lastSyncedAt) : "needs relink",
        health.pricesAsOf ? `prices ${fmtDay(health.pricesAsOf)}` : null,
        consentDays != null && consentDays <= 30 ? `consent ends in ${Math.max(consentDays, 0)}d` : null,
    ].filter(Boolean).join(" · ");
    return (
        <span
            className={`mt-2 flex min-w-0 items-center gap-1 text-[11px] leading-tight ${ok ? "text-base-content/60" : "font-medium text-base-content"}`}
            title={ok ? `Connected · ${detail}` : "A brokerage connection needs re-authorizing; showing the last good sync."}
        >
            <span aria-hidden="true" className={ok ? "text-success" : "text-warning"}>{ok ? "●" : "▲"}</span>
            <span className="sr-only">{ok ? "Connected:" : "Connection problem:"}</span>
            <span className="truncate">{detail}</span>
        </span>
    );
};
