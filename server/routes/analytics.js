const express = require("express");
const { requireAdmin } = require("../lib/admin-auth");
const { isBot, isExcludedIp, getVisitorHash, parseUserAgent, getGeoFromHeaders } = require("../lib/request-meta");
const { resolveGeo } = require("../lib/geoip");
const {
  getDb,
  insertEvent,
  getOverview,
  getTopPages,
  getTopProjects,
  getDeviceBreakdown,
  getBrowserBreakdown,
  getOsBreakdown,
  getLocationBreakdown,
  getReferrerBreakdown,
  getVisitors,
  getStartDay,
  todayStr,
} = require("../lib/analytics-db");

const router = express.Router();

// ── Config ─────────────────────────────────────────────────────────────────

const ANALYTICS_ENABLED = process.env.ANALYTICS_ENABLED !== "false";

const ADMIN_ROUTES = /^\/admin(\/|$)/;
const CONTROL_ROUTES = new Set(["/ignore", "/track", "/analytics-ignore", "/analytics-track"]);

const ALLOWED_EVENT_TYPES = new Set([
  "page_view",
  "project_card_clicked",
  "project_demo_clicked",
  "project_source_clicked",
  "resume_downloaded",
  "email_clicked",
  "linkedin_clicked",
  "github_clicked",
  "contact_clicked",
]);


// ── Helpers ────────────────────────────────────────────────────────────────

function sanitizeReferrerHost(referrer) {
  if (!referrer) return null;
  try {
    const url = new URL(referrer.startsWith("http") ? referrer : `https://${referrer}`);
    return url.hostname || null;
  } catch {
    return null;
  }
}

// ── Public summary cache (5-minute TTL) ───────────────────────────────────

const _publicCache = new Map();
const PUBLIC_CACHE_TTL = 5 * 60 * 1000;

function getPublicCached(key) {
  const entry = _publicCache.get(key);
  if (!entry || Date.now() - entry.at > PUBLIC_CACHE_TTL) {
    _publicCache.delete(key);
    return null;
  }
  return entry.data;
}

function setPublicCached(key, data) {
  _publicCache.set(key, { data, at: Date.now() });
}

// ── POST /api/analytics/event ──────────────────────────────────────────────

router.post("/event", (req, res) => {
  // Always return 204 — analytics failures must never affect the frontend
  if (!ANALYTICS_ENABLED) return res.status(204).end();

  try {
    const ua = req.headers["user-agent"] || "";
    const ip = req.ip || "";

    // Drop bots
    if (isBot(ua)) return res.status(204).end();

    // IP exclusion check
    if (isExcludedIp(ip)) {
      return res.status(204).end();
    }

    const { eventType, path, projectSlug, referrer } = req.body || {};

    // Validate event type
    if (!eventType || !ALLOWED_EVENT_TYPES.has(eventType)) {
      return res.status(204).end();
    }

    // Drop admin and control routes
    if (path && (ADMIN_ROUTES.test(path) || CONTROL_ROUTES.has(path))) {
      return res.status(204).end();
    }

    const { deviceType, browser, os } = parseUserAgent(ua);
    const headerGeo = getGeoFromHeaders(req);
    const visitorHash = getVisitorHash(ip, ua);
    const referrerHost = sanitizeReferrerHost(referrer);
    const day = todayStr();

    const baseEvent = {
      day,
      event_type: eventType,
      visitor_hash: visitorHash,
      path: path || null,
      project_slug: projectSlug || null,
      referrer_host: referrerHost,
      device_type: deviceType,
      browser,
      os,
    };

    // Respond immediately; persistence (incl. any IP geo lookup) happens after,
    // so the client is never blocked and geo can never break the response.
    res.status(204).end();

    const persist = (geo) => {
      try {
        insertEvent(getDb(), { ...baseEvent, country: geo.country ?? null, region: geo.region ?? null });
      } catch (err) {
        console.error("[analytics] event insert failed:", err.message);
      }
    };

    if (headerGeo.country) {
      // Host provided geo headers (e.g. Cloudflare CF-IPCountry) — use them.
      persist(headerGeo);
    } else {
      // No geo headers (shared cPanel) — fall back to a cached IP lookup.
      resolveGeo(ip)
        .then((geo) => persist(geo.country ? geo : headerGeo))
        .catch(() => persist(headerGeo));
    }
    return;
  } catch (err) {
    // Log but never propagate — the frontend must not be affected
    console.error("[analytics] event handler failed:", err.message);
    if (!res.headersSent) res.status(204).end();
  }
});

// ── GET /api/analytics/private-summary (admin only) ───────────────────────

router.get("/private-summary", requireAdmin, (req, res) => {
  try {
    const range = ["7d", "30d", "month", "all"].includes(req.query.range)
      ? req.query.range
      : "30d";
    const startDay = getStartDay(range);
    const db = getDb();

    const summary = {
      overview: getOverview(db, startDay),
      topPages: getTopPages(db, startDay, 15),
      topProjects: getTopProjects(db, startDay),
      deviceBreakdown: getDeviceBreakdown(db, startDay),
      browserBreakdown: getBrowserBreakdown(db, startDay),
      osBreakdown: getOsBreakdown(db, startDay),
      locationBreakdown: getLocationBreakdown(db, startDay),
      referrerBreakdown: getReferrerBreakdown(db, startDay),
      dateRange: { start: startDay, end: todayStr() },
      range,
    };

    res.json(summary);
  } catch (err) {
    console.error("[analytics] private-summary error:", err.message);
    res.status(500).json({ error: "Failed to load analytics" });
  }
});

// ── GET /api/analytics/visitors (admin only) ──────────────────────────────

router.get("/visitors", requireAdmin, (req, res) => {
  try {
    const range = ["7d", "30d", "month", "all"].includes(req.query.range)
      ? req.query.range
      : "30d";
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);
    res.json(getVisitors(getDb(), getStartDay(range), limit, offset));
  } catch (err) {
    console.error("[analytics] visitors error:", err.message);
    res.status(500).json({ error: "Failed to load visitors" });
  }
});

// ── GET /api/analytics/public-summary (public, cached) ────────────────────

router.get("/public-summary", (req, res) => {
  try {
    const range = ["7d", "30d", "all"].includes(req.query.range)
      ? req.query.range
      : "30d";
    const cacheKey = `public:${range}`;
    const cached = getPublicCached(cacheKey);
    if (cached) return res.json(cached);

    const startDay = getStartDay(range);
    const db = getDb();

    const overview = getOverview(db, startDay);
    const topPages = getTopPages(db, startDay, 8);
    const topProjects = getTopProjects(db, startDay);
    const deviceBreakdown = getDeviceBreakdown(db, startDay);
    const browserBreakdown = getBrowserBreakdown(db, startDay, 6);
    const osBreakdown = getOsBreakdown(db, startDay, 6);

    // Group project data by slug (omit referrers, hashes, internal paths)
    const projectMap = {};
    for (const row of topProjects) {
      if (!row.project_slug) continue;
      if (!projectMap[row.project_slug]) {
        projectMap[row.project_slug] = { slug: row.project_slug, events: {} };
      }
      projectMap[row.project_slug].events[row.event_type] = row.count;
    }
    const topProjectsGrouped = Object.values(projectMap)
      .sort((a, b) =>
        (b.events.page_view || 0) - (a.events.page_view || 0) ||
        (b.events.project_card_clicked || 0) - (a.events.project_card_clicked || 0)
      )
      .slice(0, 6);

    // Sanitize top pages: strip exact counts for very small numbers to
    // prevent near-real-time visitor observation
    const publicTopPages = topPages
      .filter(
        (p) => p.path && !p.path.startsWith("/admin") && !CONTROL_ROUTES.has(p.path)
      )
      .map((p) => ({ path: p.path, views: p.views }));

    const summary = {
      totalPageViews: overview.totalPageViews,
      approximateUniqueVisitors: overview.uniqueVisitors,
      topPages: publicTopPages,
      topProjects: topProjectsGrouped,
      deviceBreakdown,
      browserBreakdown,
      osBreakdown,
      dateRange: { start: startDay, end: todayStr() },
      range,
    };

    setPublicCached(cacheKey, summary);
    res.json(summary);
  } catch (err) {
    console.error("[analytics] public-summary error:", err.message);
    res.status(500).json({ error: "Failed to load analytics" });
  }
});

module.exports = router;
