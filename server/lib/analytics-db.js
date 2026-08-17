const path = require("path");
const { openDatabase } = require("./sqlite");

const DB_PATH =
  process.env.ANALYTICS_DB_PATH ||
  path.join(__dirname, "../data/analytics.db");

let _db = null;

function getDb() {
  if (_db) return _db;
  // WAL mode: higher write throughput for frequent event inserts. Opened via the
  // shared helper, which ensures the data dir, clears any stale lock left by an
  // ungraceful restart, and registers a graceful close.
  _db = openDatabase(DB_PATH, { journalMode: "WAL", synchronous: "NORMAL" });
  initSchema(_db);
  return _db;
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS analytics_events (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
      day          TEXT NOT NULL,
      event_type   TEXT NOT NULL,
      visitor_hash TEXT,
      path         TEXT,
      project_slug TEXT,
      referrer_host TEXT,
      device_type  TEXT,
      browser      TEXT,
      os           TEXT,
      country      TEXT,
      region       TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_ae_created_at   ON analytics_events(created_at);
    CREATE INDEX IF NOT EXISTS idx_ae_day          ON analytics_events(day);
    CREATE INDEX IF NOT EXISTS idx_ae_event_type   ON analytics_events(event_type);
    CREATE INDEX IF NOT EXISTS idx_ae_path         ON analytics_events(path);
    CREATE INDEX IF NOT EXISTS idx_ae_project_slug ON analytics_events(project_slug);
    CREATE INDEX IF NOT EXISTS idx_ae_visitor_hash ON analytics_events(visitor_hash);
  `);
}

// ── Write ──────────────────────────────────────────────────────────────────

function insertEvent(db, event) {
  db.prepare(`
    INSERT INTO analytics_events
      (day, event_type, visitor_hash, path, project_slug, referrer_host,
       device_type, browser, os, country, region)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run([
    event.day,
    event.event_type,
    event.visitor_hash ?? null,
    event.path ?? null,
    event.project_slug ?? null,
    event.referrer_host ?? null,
    event.device_type ?? null,
    event.browser ?? null,
    event.os ?? null,
    event.country ?? null,
    event.region ?? null,
  ]);
}

// ── Read ───────────────────────────────────────────────────────────────────

function getOverview(db, startDay) {
  const views = db
    .prepare(
      `SELECT COUNT(*) AS total FROM analytics_events
       WHERE event_type = 'page_view' AND day >= ?`
    )
    .get([startDay]).total;

  const unique = db
    .prepare(
      `SELECT COUNT(DISTINCT visitor_hash) AS total FROM analytics_events
       WHERE event_type = 'page_view' AND day >= ? AND visitor_hash IS NOT NULL`
    )
    .get([startDay]).total;

  const projectClicks = db
    .prepare(
      `SELECT COUNT(*) AS total FROM analytics_events
       WHERE (event_type LIKE '%_click%' OR event_type LIKE '%_clicked%')
       AND day >= ?`
    )
    .get([startDay]).total;

  const conversionClicks = db
    .prepare(
      `SELECT COUNT(*) AS total FROM analytics_events
       WHERE event_type IN ('resume_downloaded','email_clicked','linkedin_clicked','github_clicked')
       AND day >= ?`
    )
    .get([startDay]).total;

  return { totalPageViews: views, uniqueVisitors: unique, projectClicks, conversionClicks };
}

function getTopPages(db, startDay, limit = 10) {
  return db
    .prepare(
      `SELECT path, COUNT(*) AS views, COUNT(DISTINCT visitor_hash) AS unique_visitors
       FROM analytics_events
       WHERE event_type = 'page_view' AND day >= ?
         AND (path NOT LIKE '/admin%' OR path IS NULL)
       GROUP BY path
       ORDER BY views DESC
       LIMIT ?`
    )
    .all([startDay, limit]);
}

function getTopProjects(db, startDay) {
  return db
    .prepare(
      `SELECT project_slug, event_type, COUNT(*) AS count
       FROM analytics_events
       WHERE project_slug IS NOT NULL AND day >= ?
       GROUP BY project_slug, event_type
       ORDER BY count DESC`
    )
    .all([startDay]);
}

function getDeviceBreakdown(db, startDay) {
  return db
    .prepare(
      `SELECT COALESCE(device_type, 'desktop') AS device_type, COUNT(*) AS count
       FROM analytics_events
       WHERE event_type = 'page_view' AND day >= ?
       GROUP BY COALESCE(device_type, 'desktop')
       ORDER BY count DESC`
    )
    .all([startDay]);
}

function getBrowserBreakdown(db, startDay, limit = 8) {
  return db
    .prepare(
      `SELECT browser, COUNT(*) AS count
       FROM analytics_events
       WHERE event_type = 'page_view' AND day >= ? AND browser IS NOT NULL
       GROUP BY browser
       ORDER BY count DESC
       LIMIT ?`
    )
    .all([startDay, limit]);
}

function getOsBreakdown(db, startDay, limit = 8) {
  return db
    .prepare(
      `SELECT os, COUNT(*) AS count
       FROM analytics_events
       WHERE event_type = 'page_view' AND day >= ? AND os IS NOT NULL
       GROUP BY os
       ORDER BY count DESC
       LIMIT ?`
    )
    .all([startDay, limit]);
}

function getLocationBreakdown(db, startDay, limit = 20) {
  return db
    .prepare(
      `SELECT country, region,
              COUNT(DISTINCT visitor_hash) AS unique_visitors,
              COUNT(*) AS count
       FROM analytics_events
       WHERE event_type = 'page_view' AND day >= ? AND country IS NOT NULL
       GROUP BY country, region
       ORDER BY unique_visitors DESC, count DESC
       LIMIT ?`
    )
    .all([startDay, limit]);
}

function getReferrerBreakdown(db, startDay, limit = 10) {
  return db
    .prepare(
      `SELECT referrer_host, COUNT(*) AS count
       FROM analytics_events
       WHERE event_type = 'page_view' AND day >= ? AND referrer_host IS NOT NULL
       GROUP BY referrer_host
       ORDER BY count DESC
       LIMIT ?`
    )
    .all([startDay, limit]);
}

// ── Date helpers ───────────────────────────────────────────────────────────

function getStartDay(range) {
  const now = new Date();
  switch (range) {
    case "7d":
      now.setUTCDate(now.getUTCDate() - 7);
      break;
    case "month":
      now.setUTCDate(1);
      break;
    case "all":
      return "0000-01-01";
    default: // '30d'
      now.setUTCDate(now.getUTCDate() - 30);
  }
  return now.toISOString().slice(0, 10);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

module.exports = {
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
};
