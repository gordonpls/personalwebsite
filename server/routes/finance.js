const express = require("express");
const path = require("path");
const { createToken, safeCompare, requireFinance } = require("../lib/admin-auth");
const { logFailedAttempt } = require("../lib/login-failures");

const router = express.Router();

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
  const typed = String(password || "").trim();
  const guess = typed.toLowerCase();
  if (!guess || !safeCompare(guess, financePassword.trim().toLowerCase())) {
    res.status(401).json({ error: "Invalid password" });
    logFailedAttempt(req, typed, "investments"); // as typed, before lowercasing
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
