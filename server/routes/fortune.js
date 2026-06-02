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

// Best-effort extraction: RapidAPI's fortune-cookie4 /slack endpoint returns
// a Slack-style payload. Try the common shapes before giving up.
function extractMessage(payload) {
    if (!payload) return null;
    if (typeof payload === "string") return payload.trim() || null;
    if (typeof payload.fortune === "string") return payload.fortune.trim();
    if (typeof payload.text === "string") return payload.text.trim();
    if (payload.data && typeof payload.data.message === "string") return payload.data.message.trim();
    if (Array.isArray(payload.attachments) && payload.attachments[0]?.text) return String(payload.attachments[0].text).trim();
    return null;
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
// Key = seed string ("YYYY-MM-DD"); value = { message, source }.
const dayCache = new Map();

// GET /api/fortune
//   default            → deterministic daily fortune (cached for the day).
//   ?random=1          → fresh roll, not cached, ignores the day seed.
router.get("/fortune", async (req, res) => {
    const isRandom = req.query.random === "1" || req.query.random === "true";
    const seed = isRandom
        ? `random-${Date.now()}-${Math.random()}` // non-cacheable, unique seed
        : dailySeed();

    // Lucky payload is always derived from the same seed, so the daily mode is
    // stable and the random mode varies per call.
    const lucky = buildLuckyForSeed(seed);
    const chinese = pickFromArray(CHINESE, seed + "-zh");

    // Fortune source resolution: cached daily → RapidAPI → local corpus.
    let message = null;
    let source = null;
    if (!isRandom && dayCache.has(seed)) {
        const cached = dayCache.get(seed);
        message = cached.message;
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
        // Pick locally with the same seed so a daily fallback is also stable.
        const rand = mulberry32(hashSeed(seed + "-msg"));
        message = FORTUNES[Math.floor(rand() * FORTUNES.length)];
        source = "corpus";
    }
    if (!isRandom) dayCache.set(seed, { message, source });

    res.json({
        seed: isRandom ? null : seed,
        message,
        source,
        lucky,
        chinese,
    });
});

module.exports = router;
