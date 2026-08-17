// Best-effort IP → { country, region } lookup for analytics, used when the host
// doesn't inject geo headers (shared cPanel/LiteSpeed doesn't). Kept lightweight:
//   - No dependency, no bundled DB — a free HTTPS API (ipwho.is, no key).
//   - In-memory cache (one lookup per IP per week) + in-flight dedup, so bursts
//     from the same visitor make a single request and repeat visitors make none.
//   - A short timeout and total best-effort behavior: any failure resolves to
//     nulls so analytics never breaks or blocks on geo.

// Private / loopback / link-local ranges — never worth a lookup.
const PRIVATE_IP =
  /^(?:127\.|10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.|::1$|::ffff:127\.|fe80:|f[cd])/i;

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // locations are stable — cache a week
const NEG_TTL_MS = 60 * 60 * 1000; // retry a failed/empty lookup after an hour
const MAX_ENTRIES = 5000;
const TIMEOUT_MS = 4000;

const _cache = new Map(); // ip -> { country, region, at, ttl }
const _inflight = new Map(); // ip -> Promise
const EMPTY = { country: null, region: null };

function cacheGet(ip) {
  const e = _cache.get(ip);
  if (!e) return undefined;
  if (Date.now() - e.at > e.ttl) {
    _cache.delete(ip);
    return undefined;
  }
  // Touch for LRU ordering (Map preserves insertion order).
  _cache.delete(ip);
  _cache.set(ip, e);
  return { country: e.country, region: e.region };
}

function cacheSet(ip, geo, ttl) {
  _cache.set(ip, { country: geo.country, region: geo.region, at: Date.now(), ttl });
  if (_cache.size > MAX_ENTRIES) {
    _cache.delete(_cache.keys().next().value); // evict oldest
  }
}

async function fetchGeo(ip) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(
      `https://ipwho.is/${encodeURIComponent(ip)}?fields=success,country_code,region`,
      { signal: ac.signal, headers: { "User-Agent": "gordonzhong-analytics/1.0" } },
    );
    if (!res.ok) return null;
    const d = await res.json();
    if (!d || d.success === false) return null;
    const country = d.country_code ? String(d.country_code).toUpperCase() : null;
    const region = d.region ? String(d.region) : null;
    return country ? { country, region } : null;
  } catch {
    return null; // timeout / network / parse — best-effort
  } finally {
    clearTimeout(timer);
  }
}

// Resolve geo for an IP. Always resolves (never rejects) to {country, region},
// with nulls when unknown/private/failed.
async function resolveGeo(ip) {
  if (!ip || PRIVATE_IP.test(ip)) return EMPTY;
  const cached = cacheGet(ip);
  if (cached) return cached;
  if (_inflight.has(ip)) return _inflight.get(ip);

  const p = (async () => {
    const geo = await fetchGeo(ip);
    cacheSet(ip, geo || EMPTY, geo ? CACHE_TTL_MS : NEG_TTL_MS);
    return geo || EMPTY;
  })().finally(() => _inflight.delete(ip));

  _inflight.set(ip, p);
  return p;
}

module.exports = { resolveGeo };
