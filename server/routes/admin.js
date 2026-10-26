const express = require("express");
const { createToken, safeCompare, requireAdmin, loginLimiter } = require("../lib/admin-auth");
const { getDb, getLoginFailures, getStartDay, todayStr } = require("../lib/analytics-db");

const router = express.Router();

// POST /api/admin/login
// Body: { password: string }
// Returns: { token: string } on success, 401 on failure
router.post("/login", loginLimiter, (req, res) => {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return res.status(503).json({ error: "Admin not configured" });
  }
  const { password } = req.body || {};
  if (!password || !safeCompare(password, adminPassword)) {
    return res.status(401).json({ error: "Invalid password" });
  }
  const token = createToken(adminPassword);
  res.json({ token });
});

// POST /api/admin/verify
// Validates an existing token — used by the frontend on page load to check session.
router.post("/verify", requireAdmin, (_req, res) => {
  res.json({ valid: true });
});

// GET /api/admin/finance-attempts?range=7d|30d|month|all&gate=investments|blog
// Wrong passwords at a password gate (logged by lib/login-failures.js).
router.get("/finance-attempts", requireAdmin, (req, res) => {
  try {
    const range = ["7d", "30d", "month", "all"].includes(req.query.range) ? req.query.range : "30d";
    const gate = req.query.gate === "blog" ? "blog" : "investments";
    const startDay = getStartDay(range);
    res.json({ ...getLoginFailures(getDb(), startDay, gate), gate, range, dateRange: { start: startDay, end: todayStr() } });
  } catch (err) {
    console.error("[admin] finance-attempts error:", err.message);
    res.status(500).json({ error: "Failed to load attempts" });
  }
});

module.exports = router;
