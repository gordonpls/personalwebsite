const express = require("express");
const { createToken, safeCompare, requireAdmin } = require("../lib/admin-auth");

const router = express.Router();

// POST /api/admin/login
// Body: { password: string }
// Returns: { token: string } on success, 401 on failure
router.post("/login", (req, res) => {
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

module.exports = router;
