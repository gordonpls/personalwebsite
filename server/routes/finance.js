const express = require("express");
const path = require("path");
const { createToken, safeCompare, requireFinance } = require("../lib/admin-auth");
const { isBot, isExcludedIp, getVisitorHash, parseUserAgent, getGeoFromHeaders } = require("../lib/request-meta");
const { resolveGeo } = require("../lib/geoip");
const { getDb, insertLoginFailure, countLoginFailuresToday, todayStr } = require("../lib/analytics-db");

const router = express.Router();

// A visitor who keeps guessing stops being logged after this many per day, so
// a script hammering the form can't bloat the database.
const MAX_LOGGED_PER_VISITOR_PER_DAY = 100;

// Record a wrong password for /admin: when, roughly where, on what device, and
// the guess's length (never the guess). Runs after the response is sent and
// swallows its own errors, so logging can never slow or break the login.
function logFailedAttempt(req, guessLength) {
  try {
    const ip = req.ip || "";
    if (isExcludedIp(ip)) return; // the owner testing from a known IP
    const ua = req.headers["user-agent"] || "";
    const day = todayStr();
    const visitorHash = getVisitorHash(ip, ua);
    const db = getDb();
    if (countLoginFailuresToday(db, visitorHash, day) >= MAX_LOGGED_PER_VISITOR_PER_DAY) return;

    const { deviceType, browser, os } = parseUserAgent(ua);
    const row = { day, visitor_hash: visitorHash, guess_length: guessLength, is_bot: isBot(ua), device_type: deviceType, browser, os };
    const persist = (geo) => {
      try {
        insertLoginFailure(getDb(), { ...row, country: geo.country ?? null, region: geo.region ?? null });
      } catch (err) {
        console.error("[finance] failed-login log insert failed:", err.message);
      }
    };
    // Same geo order as analytics: host headers first, else a cached IP lookup.
    const headerGeo = getGeoFromHeaders(req);
    if (headerGeo.country) persist(headerGeo);
    else resolveGeo(ip).then((g) => persist(g.country ? g : headerGeo)).catch(() => persist(headerGeo));
  } catch (err) {
    console.error("[finance] failed-login log failed:", err.message);
  }
}

// POST /api/finance/login
// Body: { password: string }
// Returns: { token: string } on success, 401 on failure
router.post("/login", (req, res) => {
  const financePassword = process.env.FINANCE_PASSWORD;
  if (!financePassword) {
    return res.status(503).json({ error: "Finance access not configured" });
  }
  const { password } = req.body || {};
  // Case/whitespace-insensitive: it's a teaser gate, not a vault, and phones
  // love to auto-capitalize the first letter.
  const guess = String(password || "").trim().toLowerCase();
  if (!guess || !safeCompare(guess, financePassword.trim().toLowerCase())) {
    res.status(401).json({ error: "Invalid password" });
    logFailedAttempt(req, guess.length);
    return;
  }
  res.json({ token: createToken(financePassword, "finance") });
});

// POST /api/finance/verify
// Validates an existing token — used by the frontend on page load to check session.
router.post("/verify", requireFinance, (_req, res) => {
  res.json({ valid: true });
});

// GET /api/finance/history, /api/finance/meta
// The weekly-baked price history + per-holding metadata (they reveal which
// tickers are held, so they live in server/data, not the public web root).
// sendFile reads per request, so a refreshed bake needs no restart, and its
// ETag/Last-Modified let the browser revalidate with a cheap 304.
for (const [route, file] of [["/history", "holdingsHistory.json"], ["/meta", "holdingsMeta.json"]]) {
  router.get(route, requireFinance, (_req, res) => {
    res.set("Cache-Control", "private, no-cache");
    res.sendFile(path.join(__dirname, "../data", file), (err) => {
      if (err && !res.headersSent) res.status(404).json({ error: "Not baked yet" });
    });
  });
}

module.exports = router;
