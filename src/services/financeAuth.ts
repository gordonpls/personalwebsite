// Password gate for the /investments dashboard.
//
// The server is the real lock: /api/holdings and /api/quotes return 401 without
// a finance (or admin) token. This module just stores that token and lets the
// UI react to lock/unlock. While locked, FinanceGate shows a static outline
// instead of mounting the dashboard, so the gated endpoints are never called.

import { useSyncExternalStore } from "react";

const TOKEN_KEY = "finance_token";
export const FINANCE_AUTH_EVENT = "finance-auth-change";
const EVENT = FINANCE_AUTH_EVENT;

// VITE_FINANCE_REMEMBER=off keeps the unlock in memory only, so every page
// load asks again (handy for working on the prompt). Default: remembered in
// localStorage until the token expires (7 days).
const REMEMBER = import.meta.env.VITE_FINANCE_REMEMBER !== "off";

export function getFinanceToken(): string | null {
    if (!REMEMBER) return null;
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

function setToken(t: string | null): void {
    if (REMEMBER) {
        try {
            if (t) localStorage.setItem(TOKEN_KEY, t);
            else localStorage.removeItem(TOKEN_KEY);
        } catch { /* storage blocked — unlock lasts for this page only */ }
    }
    memoryToken = t;
    window.dispatchEvent(new Event(EVENT));
}

// Holds the token when not remembering, or when localStorage throws.
let memoryToken: string | null = null;
const currentToken = () => getFinanceToken() ?? memoryToken;

export const isFinanceUnlocked = () => currentToken() != null;

// Drops a token the server rejected, which sends the visitor back to the prompt.
export function clearFinanceToken(): void { setToken(null); }

export function financeAuthHeaders(): Record<string, string> {
    const t = currentToken();
    return t ? { Authorization: `Bearer ${t}` } : {};
}

export type LoginResult = "ok" | "wrong" | "error";

export async function unlockFinance(password: string): Promise<LoginResult> {
    try {
        const r = await fetch("/api/finance/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password }),
        });
        if (r.status === 401) return "wrong";
        if (!r.ok) return "error";
        const { token } = await r.json();
        setToken(token);
        return "ok";
    } catch {
        return "error";
    }
}

// Drop a stored token the server no longer accepts (expired / password rotated).
// Network failures leave it alone so a flaky backend doesn't log you out.
export async function verifyFinanceToken(): Promise<void> {
    if (!isFinanceUnlocked()) return;
    try {
        const r = await fetch("/api/finance/verify", { method: "POST", headers: financeAuthHeaders() });
        if (r.status === 401) clearFinanceToken();
    } catch { /* keep the token */ }
}

function subscribe(cb: () => void) {
    window.addEventListener(EVENT, cb);
    window.addEventListener("storage", cb); // unlock in one tab → unlock in the others
    return () => {
        window.removeEventListener(EVENT, cb);
        window.removeEventListener("storage", cb);
    };
}

export function useFinanceUnlocked(): boolean {
    return useSyncExternalStore(subscribe, isFinanceUnlocked, () => false);
}
