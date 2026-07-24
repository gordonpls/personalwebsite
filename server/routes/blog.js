const express = require("express");
const crypto = require("crypto");
const { getDb, getAllPosts, createPost, updatePost, deletePost } = require("../lib/blog-db");
const { snapshot } = require("../lib/blog-backup");

const router = express.Router();
// Long-lived so a one-time login persists (token is stored client-side and
// HMAC-signed with ADMIN_PASSWORD; this is a private single-author journal).
const SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000;

// Write a fresh backup after any change. Fire-and-forget: snapshot() never
// throws, so a backup hiccup can't fail the request it protects.
function backup() {
  try {
    snapshot(getAllPosts(getDb()));
  } catch (e) {
    console.error("blog: backup after write failed:", e && e.message);
  }
}

// --- Auth helpers (ADMIN_PASSWORD-signed tokens, parallel to admin-auth) ---

function createToken(password) {
  const expires = Date.now() + SESSION_TTL_MS;
  const payload = `blog:${expires}`;
  const sig = crypto.createHmac("sha256", password).update(payload).digest("hex");
  return Buffer.from(`${payload}:${sig}`).toString("base64url");
}

function verifyToken(token) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password || !token) return false;
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const sigStart = decoded.lastIndexOf(":");
    const payload = decoded.slice(0, sigStart);
    const sig = decoded.slice(sigStart + 1);
    const parts = payload.split(":");
    if (parts[0] !== "blog") return false;
    const expires = parseInt(parts[1], 10);
    if (isNaN(expires) || Date.now() > expires) return false;
    const expectedSig = crypto
      .createHmac("sha256", password)
      .update(payload)
      .digest("hex");
    const a = Buffer.from(sig.padEnd(64, "0").slice(0, 64), "hex");
    const b = Buffer.from(expectedSig.padEnd(64, "0").slice(0, 64), "hex");
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function requireBlogAuth(req, res, next) {
  if (!process.env.ADMIN_PASSWORD) {
    return res.status(503).json({ error: "Blog not configured" });
  }
  const auth = req.headers["authorization"] || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token || !verifyToken(token)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// POST /api/blog/auth  — exchange password for session token
router.post("/auth", (req, res) => {
  const { password } = req.body || {};
  if (!process.env.ADMIN_PASSWORD) {
    return res.status(503).json({ error: "Blog not configured" });
  }
  const valid = (() => {
    try {
      const a = Buffer.from(String(password));
      const b = Buffer.from(process.env.ADMIN_PASSWORD);
      if (a.length !== b.length) {
        crypto.timingSafeEqual(Buffer.alloc(b.length), b);
        return false;
      }
      return crypto.timingSafeEqual(a, b);
    } catch {
      return false;
    }
  })();
  if (!valid) {
    return res.status(401).json({ error: "Invalid password" });
  }
  res.json({ token: createToken(process.env.ADMIN_PASSWORD) });
});

// GET /api/blog/posts
router.get("/posts", requireBlogAuth, (req, res) => {
  try {
    const posts = getAllPosts(getDb());
    res.json({ posts });
  } catch (err) {
    console.error("blog: fetch posts error:", err);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

// GET /api/blog/export  — download the full journal as a JSON file
router.get("/export", requireBlogAuth, (req, res) => {
  try {
    const posts = getAllPosts(getDb());
    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Disposition", `attachment; filename="journal-backup-${stamp}.json"`);
    res.json({ exportedAt: new Date().toISOString(), count: posts.length, posts });
  } catch (err) {
    console.error("blog: export error:", err);
    res.status(500).json({ error: "Failed to export" });
  }
});

// POST /api/blog/posts
router.post("/posts", requireBlogAuth, (req, res) => {
  const { title, body, mood } = req.body || {};
  if (!title?.trim() || !body?.trim()) {
    return res.status(400).json({ error: "Title and body are required" });
  }
  try {
    const post = createPost(getDb(), {
      title: title.trim(),
      body: body.trim(),
      mood: mood?.trim() || null,
    });
    backup();
    res.status(201).json({ post });
  } catch (err) {
    console.error("blog: create post error:", err);
    res.status(500).json({ error: "Failed to create post" });
  }
});

// PUT /api/blog/posts/:id
router.put("/posts/:id", requireBlogAuth, (req, res) => {
  const { title, body, mood } = req.body || {};
  if (!title?.trim() || !body?.trim()) {
    return res.status(400).json({ error: "Title and body are required" });
  }
  try {
    const post = updatePost(getDb(), parseInt(req.params.id, 10), {
      title: title.trim(),
      body: body.trim(),
      mood: mood?.trim() || null,
    });
    if (!post) return res.status(404).json({ error: "Post not found" });
    backup();
    res.json({ post });
  } catch (err) {
    console.error("blog: update post error:", err);
    res.status(500).json({ error: "Failed to update post" });
  }
});

// DELETE /api/blog/posts/:id  — requires password in body as second factor
router.delete("/posts/:id", requireBlogAuth, (req, res) => {
  const { password } = req.body || {};
  const valid = (() => {
    try {
      const a = Buffer.from(String(password));
      const b = Buffer.from(process.env.ADMIN_PASSWORD || "");
      if (a.length !== b.length) {
        crypto.timingSafeEqual(Buffer.alloc(b.length), b);
        return false;
      }
      return crypto.timingSafeEqual(a, b);
    } catch {
      return false;
    }
  })();
  if (!valid) {
    return res.status(401).json({ error: "Invalid password" });
  }
  try {
    deletePost(getDb(), parseInt(req.params.id, 10));
    backup();
    res.status(204).end();
  } catch (err) {
    console.error("blog: delete post error:", err);
    res.status(500).json({ error: "Failed to delete post" });
  }
});

// Take one backup at startup so a current export always exists (and to surface
// any stale-lock recovery at boot rather than on the first request).
if (process.env.ADMIN_PASSWORD) {
  try {
    backup();
  } catch (e) {
    console.error("blog: initial backup failed:", e && e.message);
  }
}

module.exports = router;
