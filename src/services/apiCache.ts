// Shared, deduplicated JSON fetches for the backend API.
//
// The Portfolio page mounts several components that each independently need
// /api/holdings (and /api/quotes) — without sharing, that's 4–6 concurrent
// requests to the small Node backend on every load, which hammers the shared
// host's I/O limit and makes the page hang. This collapses concurrent and
// repeated calls into a single in-flight request, caches the result briefly so
// re-mounts/SPA navigations don't refetch, and times out so a stalled backend
// fails fast (component shows its error state) instead of spinning forever.

type Entry = { at: number; promise: Promise<unknown> };

const cache = new Map<string, Entry>();
const DEFAULT_TTL = 5 * 60 * 1000; // 5 min
const TIMEOUT_MS = 12_000;

function fetchJson(url: string): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    return fetch(url, { signal: controller.signal })
        .then((r) => {
            if (!r.ok) throw new Error(`${url} → HTTP ${r.status}`);
            return r.json();
        })
        .finally(() => clearTimeout(timer));
}

// Returns a shared promise for `url`. Concurrent callers get the same in-flight
// request; subsequent callers within `ttlMs` get the cached result. Failures are
// never cached, so the next mount retries.
export function cachedJson<T = any>(url: string, ttlMs = DEFAULT_TTL): Promise<T> {
    const hit = cache.get(url);
    if (hit && Date.now() - hit.at < ttlMs) return hit.promise as Promise<T>;

    const promise = fetchJson(url).catch((err) => {
        cache.delete(url);
        throw err;
    });
    cache.set(url, { at: Date.now(), promise });
    return promise as Promise<T>;
}
