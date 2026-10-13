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

    -- Wrong passwords at a password gate (gate = 'investments' | 'blog'; NULL
    -- on rows from before the column = 'investments'). The guess and IP are
    -- kept for GUESS_RETENTION_DAYS, then blanked (people type passwords they
    -- use elsewhere); the guess length stays. The table name predates the blog gate.
    CREATE TABLE IF NOT EXISTS finance_login_failures (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
      day          TEXT NOT NULL,
      visitor_hash TEXT,
      guess_length INTEGER,
      is_bot       INTEGER NOT NULL DEFAULT 0,
      device_type  TEXT,
      browser      TEXT,
      os           TEXT,
      country      TEXT,
      region       TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_flf_day     ON finance_login_failures(day);
    CREATE INDEX IF NOT EXISTS idx_flf_visitor ON finance_login_failures(visitor_hash, day);
  `);

  // Added after the table shipped: older databases need the column.
  const cols = db.prepare(`PRAGMA table_info(finance_login_failures)`).all([]);
  if (!cols.some((c) => c.name === "guess")) {
    db.exec(`ALTER TABLE finance_login_failures ADD COLUMN guess TEXT`);
  }
  if (!cols.some((c) => c.name === "gate")) {
    db.exec(`ALTER TABLE finance_login_failures ADD COLUMN gate TEXT`);
  }
  if (!cols.some((c) => c.name === "ip")) {
    db.exec(`ALTER TABLE finance_login_failures ADD COLUMN ip TEXT`);
  }
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

function insertLoginFailure(db, row) {
  db.prepare(`
    INSERT INTO finance_login_failures
      (day, gate, ip, visitor_hash, guess, guess_length, is_bot, device_type, browser, os, country, region)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run([
    row.day,
    row.gate,
    row.ip ?? null,
    row.visitor_hash ?? null,
    row.guess ?? null,
    row.guess_length ?? null,
    row.is_bot ? 1 : 0,
    row.device_type ?? null,
    row.browser ?? null,
    row.os ?? null,
    row.country ?? null,
    row.region ?? null,
  ]);
}

// Attempts already logged for this visitor today (for the per-day cap).
function countLoginFailuresToday(db, visitorHash, day) {
  if (!visitorHash) return 0;
  const row = db.prepare(
    `SELECT COUNT(*) AS n FROM finance_login_failures WHERE visitor_hash = ? AND day = ?`
  ).get([visitorHash, day]);
  return row?.n ?? 0;
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

// One row per visitor since `startDay`, most recently active first, each with
// its trail of events. A visitor is a visitor_hash, which rotates with the
// salt period (daily by default), so one person on two days is two rows.
// Time on a page = until that visitor's next event (any type), capped at
// IDLE_CAP_S so a tab left open doesn't count as reading. The last page of a
// visit has no next event, so its time is unknown (null), not zero.
const IDLE_CAP_S = 30 * 60;
const TRAIL_MAX = 12;
function pageTrail(events) {
  const pages = new Map(); // path -> { path, views, seconds, known }
  events.forEach((ev, i) => {
    if (ev.event_type !== "page_view") return;
    const path = ev.path || "/";
    const p = pages.get(path) ?? { path, views: 0, seconds: 0, known: false };
    p.views += 1;
    const next = events[i + 1];
    if (next) {
      const s = (Date.parse(next.created_at) - Date.parse(ev.created_at)) / 1000;
      if (s >= 0) { p.seconds += Math.min(s, IDLE_CAP_S); p.known = true; }
    }
    pages.set(path, p);
  });
  // First-visited order, so it reads as the path through the site.
  return [...pages.values()].slice(0, TRAIL_MAX).map((p) => ({ path: p.path, views: p.views, seconds: p.known ? Math.round(p.seconds) : null }));
}
function getVisitors(db, startDay, limit = 50, offset = 0) {
  const total = db.prepare(`
    SELECT COUNT(DISTINCT visitor_hash) AS n
    FROM analytics_events WHERE day >= ? AND visitor_hash IS NOT NULL
  `).get([startDay])?.n ?? 0;

  const rows = db.prepare(`
    SELECT visitor_hash,
           MIN(created_at) AS first_at, MAX(created_at) AS last_at,
           SUM(event_type = 'page_view') AS views,
           COUNT(DISTINCT CASE WHEN event_type = 'page_view' THEN path END) AS pages,
           SUM(event_type <> 'page_view') AS clicks,
           MAX(country) AS country, MAX(region) AS region,
           MAX(device_type) AS device_type, MAX(browser) AS browser, MAX(os) AS os,
           (SELECT e2.referrer_host FROM analytics_events e2
             WHERE e2.visitor_hash = e.visitor_hash AND e2.day >= ? AND e2.referrer_host IS NOT NULL
             ORDER BY e2.created_at LIMIT 1) AS referrer_host
    FROM analytics_events e
    WHERE day >= ? AND visitor_hash IS NOT NULL
    GROUP BY visitor_hash
    ORDER BY last_at DESC
    LIMIT ? OFFSET ?
  `).all([startDay, startDay, limit, offset]);

  if (rows.length) {
    const hashes = rows.map((r) => r.visitor_hash);
    const events = db.prepare(`
      SELECT visitor_hash, created_at, event_type, path
      FROM analytics_events
      WHERE day >= ? AND visitor_hash IN (${hashes.map(() => "?").join(",")})
      ORDER BY created_at, id
    `).all([startDay, ...hashes]);
    const byHash = new Map();
    for (const ev of events) byHash.set(ev.visitor_hash, [...(byHash.get(ev.visitor_hash) ?? []), ev]);
    for (const r of rows) r.trail = pageTrail(byHash.get(r.visitor_hash) ?? []);
  }
  return { total, visitors: rows };
}

// ── Date helpers ───────────────────────────────────────────────────────────

// Stored guesses and IPs are blanked after this many days; the attempt row stays.
const GUESS_RETENTION_DAYS = 30;
function purgeOldGuesses(db) {
  db.prepare(`
    UPDATE finance_login_failures SET guess = NULL, ip = NULL
    WHERE (guess IS NOT NULL OR ip IS NOT NULL) AND created_at < strftime('%Y-%m-%dT%H:%M:%SZ', 'now', ?)
  `).run([`-${GUESS_RETENTION_DAYS} days`]);
}

// Failed password attempts at one gate since `startDay`, for /admin.
const GATE_SQL = `COALESCE(gate, 'investments') = ?`;
function getLoginFailures(db, startDay, gate = "investments") {
  // Also runs on every logged attempt; doing it here too means expired guesses
  // are never shown even if nobody has guessed in a while.
  purgeOldGuesses(db);
  const totals = db.prepare(`
    SELECT COUNT(*) AS attempts,
           COUNT(DISTINCT visitor_hash) AS visitors,
           SUM(is_bot) AS bots,
           MAX(created_at) AS last_at
    FROM finance_login_failures WHERE day >= ? AND ${GATE_SQL}
  `).get([startDay, gate]);

  const recent = db.prepare(`
    SELECT created_at, ip, visitor_hash, guess, guess_length, is_bot, device_type, browser, os, country, region
    FROM finance_login_failures WHERE day >= ? AND ${GATE_SQL}
    ORDER BY created_at DESC LIMIT 50
  `).all([startDay, gate]);

  // Visitor hashes rotate daily, so "repeat" means repeated within one day.
  const repeat = db.prepare(`
    SELECT visitor_hash, day, COUNT(*) AS attempts,
           MIN(created_at) AS first_at, MAX(created_at) AS last_at, MAX(ip) AS ip,
           MAX(country) AS country, MAX(region) AS region,
           MAX(device_type) AS device_type, MAX(browser) AS browser, MAX(os) AS os
    FROM finance_login_failures
    WHERE day >= ? AND visitor_hash IS NOT NULL AND ${GATE_SQL}
    GROUP BY visitor_hash, day
    HAVING COUNT(*) > 1
    ORDER BY attempts DESC, last_at DESC
    LIMIT 10
  `).all([startDay, gate]);

  return {
    attempts: totals?.attempts ?? 0,
    visitors: totals?.visitors ?? 0,
    bots: totals?.bots ?? 0,
    lastAt: totals?.last_at ?? null,
    recent,
    repeat,
  };
}

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
  insertLoginFailure,
  countLoginFailuresToday,
  getLoginFailures,
  getVisitors,
  purgeOldGuesses,
  GUESS_RETENTION_DAYS,
};
