const express = require("express");
const path = require("path");
const fs = require("fs");
const { dailySeed, buildLuckyForSeed, pickFromArray, mulberry32, hashSeed } = require("../lib/fortune-seed");

const router = express.Router();

// Corpus baked into the repo as a fallback when the upstream API is down or
// not configured. The lucky payload is always generated locally so it stays
// deterministic for the daily seed even when the upstream is reachable.
const FORTUNES = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "fortunes.json"), "utf8"));
const CHINESE = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "chinese-phrases.json"), "utf8"));

const RAPID_HOST = "fortune-cookie4.p.rapidapi.com";
const RAPID_URL = `https://${RAPID_HOST}/slack`;
const FETCH_TIMEOUT_MS = 2500;

// Strip the upstream preamble + quotes that wrap the actual aphorism.
// Variants seen / handled:
//   "Your fortune reads: '...'"
//   "Your fortune reads '...'"   (no colon)
//   "Your fortune cookie reads: '...'"
//   "Your fortune says/is/sez: '...'"
//   "Fortune: '...'"
//   "Today's fortune: '...'"
// Also strips wrapping single, double, or typographic quotes.
function cleanFortune(s) {
    if (!s) return s;
    let out = s.trim();
    // Specific preambles, most-likely first. Each is safe in isolation.
    out = out.replace(/^your\s+fortune(?:\s+cookie)?\s+\w+\s*:?\s*/i, ""); // "Your fortune reads/says/is/..."
    out = out.replace(/^today['’]?s?\s+fortune\s*:?\s*/i, "");              // "Today's fortune:"
    out = out.replace(/^fortune\s*:\s*/i, "");                              // "Fortune:"
    // Wrapping single, double, or typographic quotes around the whole thing.
    out = out.replace(/^["'‘’“”](.+)["'‘’“”]\s*\.?$/s, "$1");
    return out.trim();
}

// Best-effort extraction: RapidAPI's fortune-cookie4 /slack endpoint returns
// a Slack-style payload. Pull the message string out of whatever shape we
// got, then run it through cleanFortune so the rendered slip is just the
// aphorism itself with no upstream wrapper text.
function extractMessage(payload) {
    if (!payload) return null;
    let raw = null;
    if (typeof payload === "string") raw = payload;
    else if (typeof payload.fortune === "string") raw = payload.fortune;
    else if (typeof payload.text === "string") raw = payload.text;
    else if (payload.data && typeof payload.data.message === "string") raw = payload.data.message;
    else if (Array.isArray(payload.attachments) && payload.attachments[0]?.text) raw = String(payload.attachments[0].text);
    if (!raw) return null;
    const cleaned = cleanFortune(raw);
    return cleaned || null;
}

async function fetchFromRapidApi() {
    const key = process.env.RAPIDAPI_KEY;
    if (!key) return null;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    try {
        const r = await fetch(RAPID_URL, {
            method: "GET",
            signal: ctrl.signal,
            headers: {
                "x-rapidapi-key": key,
                "x-rapidapi-host": RAPID_HOST,
                "Content-Type": "application/json",
            },
        });
        if (!r.ok) return null;
        const body = await r.json().catch(async () => ({ raw: await r.text() }));
        const msg = extractMessage(body) || extractMessage(body?.raw);
        return msg || null;
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
    }
}

// In-memory cache so repeated visitors on the same day don't re-hit upstream.
// Key = "YYYY-MM-DD|<ipHash>"; value = { message, source }.
const dayCache = new Map();

// Stable, non-reversible IP identifier for cache + seed. We never store, log,
// or expose the raw IP — just a hash combined with the date.
function ipFingerprint(ip) {
    let h = 1779033703 ^ ip.length;
    for (let i = 0; i < ip.length; i++) {
        h = Math.imul(h ^ ip.charCodeAt(i), 3432918353);
        h = (h << 13) | (h >>> 19);
    }
    return (h >>> 0).toString(36);
}

// GET /api/fortune
//   default → deterministic fortune for (this IP, today). Once a visitor sees
//   a fortune they keep that one for the rest of the calendar day; new day
//   means new cookie.
router.get("/fortune", async (req, res) => {
    const date = dailySeed();
    // req.ip resolves through the trust-proxy setting in app.js (X-Forwarded-For).
    const ip = req.ip || (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "anon";
    const ipHash = ipFingerprint(ip);
    const seed = `${date}|${ipHash}`;

    // Lucky payload + Chinese phrase are seed-derived, so they're stable for the
    // (ip, day) pair and different visitors see different combinations.
    const lucky = buildLuckyForSeed(seed);
    const chinese = pickFromArray(CHINESE, seed + "-zh");

    // Fortune source resolution: cached → RapidAPI → local corpus.
    let message = null;
    let source = null;
    if (dayCache.has(seed)) {
        const cached = dayCache.get(seed);
        // Re-clean on the way out so any cached value that was stored before
        // the cleanFortune helper existed gets fixed without waiting for a
        // server restart to clear the cache.
        message = cleanFortune(cached.message);
        source = cached.source;
    }
    if (!message) {
        const upstream = await fetchFromRapidApi();
        if (upstream) {
            message = upstream;
            source = "rapidapi";
        }
    }
    if (!message) {
        // Deterministic corpus pick so a fallback is also locked for the day.
        const rand = mulberry32(hashSeed(seed + "-msg"));
        message = FORTUNES[Math.floor(rand() * FORTUNES.length)];
        source = "corpus";
    }
    dayCache.set(seed, { message, source });

    res.json({
        date,
        message,
        source,
        lucky,
        chinese,
    });
});

module.exports = router;
