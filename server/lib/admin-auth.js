const crypto = require("crypto");

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Token format: base64url( "{scope}:{expiresAt}:{hmac-sha256}" )
// Signed with the scope's password (ADMIN_PASSWORD / FINANCE_PASSWORD) so
// rotating a password invalidates all of that scope's sessions.

function createToken(password, scope = "admin") {
  const expires = Date.now() + SESSION_TTL_MS;
  const payload = `${scope}:${expires}`;
  const sig = crypto.createHmac("sha256", password).update(payload).digest("hex");
  return Buffer.from(`${payload}:${sig}`).toString("base64url");
}

function verifyToken(token, password, scope = "admin") {
  if (!token || !password) return false;
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    // Format: "{scope}:{expires}:{64-char-hex-sig}"
    const sigStart = decoded.lastIndexOf(":");
    const payload = decoded.slice(0, sigStart);
    const sig = decoded.slice(sigStart + 1);
    const parts = payload.split(":");
    if (parts[0] !== scope) return false;
    const expires = parseInt(parts[1], 10);
    if (isNaN(expires) || Date.now() > expires) return false;
    const expectedSig = crypto
      .createHmac("sha256", password)
      .update(payload)
      .digest("hex");
    // Pad/truncate to equal length for timingSafeEqual
    const a = Buffer.from(sig.padEnd(64, "0").slice(0, 64), "hex");
    const b = Buffer.from(expectedSig.padEnd(64, "0").slice(0, 64), "hex");
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function safeCompare(a, b) {
  try {
    const bufA = Buffer.from(String(a));
    const bufB = Buffer.from(String(b));
    // Always run comparison to avoid timing oracle on length mismatch
    if (bufA.length !== bufB.length) {
      crypto.timingSafeEqual(Buffer.alloc(bufB.length), bufB);
      return false;
    }
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

function requireAdmin(req, res, next) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    return res.status(503).json({ error: "Admin not configured" });
  }
  const auth = req.headers["authorization"] || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token || !verifyToken(token, password)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// Gates the investments data (/api/holdings, /api/quotes). Accepts a finance
// token or an admin token, so being logged into /admin also unlocks it.
function requireFinance(req, res, next) {
  const financePassword = process.env.FINANCE_PASSWORD;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!financePassword) {
    return res.status(503).json({ error: "Finance access not configured" });
  }
  const auth = req.headers["authorization"] || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  const ok = token && (
    verifyToken(token, financePassword, "finance") ||
    (adminPassword && verifyToken(token, adminPassword, "admin"))
  );
  if (!ok) return res.status(401).json({ error: "Unauthorized" });
  next();
}

module.exports = { createToken, verifyToken, safeCompare, requireAdmin, requireFinance };
