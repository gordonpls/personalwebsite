const crypto = require("crypto");

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Token format: base64url( "admin:{expiresAt}:{hmac-sha256}" )
// Signed with ADMIN_PASSWORD so rotating the password invalidates all sessions.

function createToken(password) {
  const expires = Date.now() + SESSION_TTL_MS;
  const payload = `admin:${expires}`;
  const sig = crypto.createHmac("sha256", password).update(payload).digest("hex");
  return Buffer.from(`${payload}:${sig}`).toString("base64url");
}

function verifyToken(token, password) {
  if (!token || !password) return false;
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    // Format: "admin:{expires}:{64-char-hex-sig}"
    const sigStart = decoded.lastIndexOf(":");
    const payload = decoded.slice(0, sigStart);
    const sig = decoded.slice(sigStart + 1);
    const parts = payload.split(":");
    if (parts[0] !== "admin") return false;
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

module.exports = { createToken, verifyToken, safeCompare, requireAdmin };
