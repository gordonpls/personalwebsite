// Data freshness + connection health, one pill per linked institution:
// whether Plaid can still reach it, when we last synced, and the date the
// brokerage's own prices are from. Health comes from /api/plaid/status (live
// /item/get, kept current by webhooks); price dates ride along on /api/holdings.

import { useEffect, useState } from "react";
import { cachedJson } from "../services/apiCache";

interface ItemStatus {
    institution: string;
    status: "healthy" | "error";
    errorCode: string | null;
    lastSyncedAt: string | null;
    consentExpiresAt: string | null;
}
interface Source { institution: string; pricesAsOf: string | null }

const DAY = 864e5;

function ago(iso: string | null) {
    if (!iso) return "never synced";
    const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return "synced just now";
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

export const PlaidStatusChip = () => {
    const [items, setItems] = useState<ItemStatus[] | null>(null);
    const [sources, setSources] = useState<Source[]>([]);

    useEffect(() => {
        let live = true;
        cachedJson<{ items: ItemStatus[] }>("/api/plaid/status")
            .then((r) => live && setItems(r.items))
            .catch(() => live && setItems([]));
        cachedJson<{ sources?: Source[] }>("/api/holdings")
            .then((r) => live && setSources(r.sources ?? []))
            .catch(() => {});
        return () => { live = false; };
    }, []);

    if (!items?.length) return null;

    return (
        <ul className="flex flex-wrap items-center justify-center gap-2" aria-label="Brokerage connections">
            {items.map((it) => {
                const ok = it.status === "healthy";
                const pricesAsOf = sources.find((s) => s.institution === it.institution)?.pricesAsOf;
                const consentDays = it.consentExpiresAt ? Math.ceil((new Date(it.consentExpiresAt).getTime() - Date.now()) / DAY) : null;
                const consentSoon = consentDays != null && consentDays <= 30;
                return (
                    <li
                        key={it.institution}
                        className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${ok ? "border-base-300 bg-base-100 text-base-content/70" : "border-warning/50 bg-warning/10 text-base-content"}`}
                        title={ok ? undefined : `Plaid reports ${it.errorCode}. The data shown is from the last good sync.`}
                    >
                        <span aria-hidden="true" className={ok ? "text-success" : "text-warning"}>{ok ? "●" : "▲"}</span>
                        <span className="font-semibold text-base-content">{it.institution}</span>
                        <span>{ok ? "connected" : "needs relink"}</span>
                        <span aria-hidden="true">·</span>
                        <span>{ago(it.lastSyncedAt)}</span>
                        {pricesAsOf && (
                            <>
                                <span aria-hidden="true">·</span>
                                <span>prices as of {fmtDay(pricesAsOf)}</span>
                            </>
                        )}
                        {consentSoon && (
                            <>
                                <span aria-hidden="true">·</span>
                                <span className="font-medium">consent ends in {Math.max(consentDays, 0)}d</span>
                            </>
                        )}
                    </li>
                );
            })}
        </ul>
    );
};
