const express = require("express");
const crypto = require("crypto");
const { UAParser } = require("ua-parser-js");
const { requireAdmin } = require("../lib/admin-auth");
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
  getStartDay,
  todayStr,
} = require("../lib/analytics-db");

const router = express.Router();

// ── Config ─────────────────────────────────────────────────────────────────

const ANALYTICS_ENABLED = process.env.ANALYTICS_ENABLED !== "false";

const EXCLUDED_IPS = (process.env.ANALYTICS_EXCLUDED_IPS || "")
  .split(",")
  .map((ip) => ip.trim())
  .filter(Boolean);

const SALT_PERIOD = process.env.ANALYTICS_SALT_PERIOD || "daily";

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

const BOT_PATTERNS = [
  /bot/i, /spider/i, /crawl/i, /slurp/i, /facebot/i,
  /ia_archiver/i, /wget/i, /curl\/\d/i, /python-requests/i,
  /go-http-client/i, /java\//i, /postmanruntime/i, /scrapy/i,
  /headlesschrome/i, /phantomjs/i, /selenium/i, /puppeteer/i,
  /lighthouse/i, /node-fetch/i, /httpclient/i, /datadoghq/i,
  /pingdom/i, /uptimerobot/i, /statuscake/i,
];

// ── Helpers ────────────────────────────────────────────────────────────────

function isBot(ua) {
  if (!ua) return true;
  return BOT_PATTERNS.some((p) => p.test(ua));
}

function getVisitorHash(ip, ua) {
  const secret = process.env.ANALYTICS_SECRET;
  if (!secret) return null;
  const now = new Date();
  let salt;
  if (SALT_PERIOD === "monthly") {
    salt = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  } else {
    salt = now.toISOString().slice(0, 10);
  }
  return crypto
    .createHash("sha256")
    .update(`${ip}|${ua}|${salt}|${secret}`)
    .digest("hex")
    .slice(0, 32);
}

function parseUserAgent(ua) {
  if (!ua) return { deviceType: null, browser: null, os: null };
  const parser = new UAParser(ua);
  const result = parser.getResult();
  const rawDevice = result.device?.type; // "mobile"|"tablet"|undefined
  const deviceType = rawDevice === "mobile" ? "mobile" : rawDevice === "tablet" ? "tablet" : "desktop";
  const browser = result.browser?.name || null;
  const os = result.os?.name || null;
  return { deviceType, browser, os };
}

function getGeoFromHeaders(req) {
  const country =
    req.headers["cf-ipcountry"] ||
    req.headers["x-country-code"] ||
    req.headers["x-geoip-country-code"] ||
    req.headers["geoip-country-code"] ||
    null;
  const region =
    req.headers["cf-region-code"] ||
    req.headers["x-geoip-region-code"] ||
    req.headers["geoip-region-code"] ||
    null;
  return {
    country: country && country !== "XX" ? country.toUpperCase() : null,
    region: region || null,
  };
}

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
    if (EXCLUDED_IPS.length && EXCLUDED_IPS.includes(ip)) {
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
    const { country, region } = getGeoFromHeaders(req);
    const visitorHash = getVisitorHash(ip, ua);
    const referrerHost = sanitizeReferrerHost(referrer);
    const day = todayStr();

    const db = getDb();
    insertEvent(db, {
      day,
      event_type: eventType,
      visitor_hash: visitorHash,
      path: path || null,
      project_slug: projectSlug || null,
      referrer_host: referrerHost,
      device_type: deviceType,
      browser,
      os,
      country,
      region,
    });
  } catch (err) {
    // Log but never propagate — the frontend must not be affected
    console.error("[analytics] event insert failed:", err.message);
  }

  return res.status(204).end();
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
