// Wrong-password logging for the site's password gates ('investments', 'blog'),
// shown in /admin so repeated guessing can be spotted and blocked. Records when,
// roughly where, the IP, the device, and the guess as typed (guess + IP are
// blanked after GUESS_RETENTION_DAYS in analytics-db). Runs after the response
// is sent and swallows its own errors, so logging can never slow or break a login.

const { isBot, isExcludedIp, getVisitorHash, parseUserAgent, getGeoFromHeaders } = require("./request-meta");
const { resolveGeo } = require("./geoip");
const { getDb, insertLoginFailure, countLoginFailuresToday, purgeOldGuesses, todayStr } = require("./analytics-db");

// Longest guess kept; anything past this is a script pasting junk.
const MAX_GUESS_CHARS = 200;

// A visitor who keeps guessing stops being logged after this many per day, so
// a script hammering the form can't bloat the database.
const MAX_LOGGED_PER_VISITOR_PER_DAY = 100;

function logFailedAttempt(req, guess, gate) {
  try {
    const ip = req.ip || "";
    if (isExcludedIp(ip)) return; // the owner testing from a known IP
    const ua = req.headers["user-agent"] || "";
    const day = todayStr();
    const visitorHash = getVisitorHash(ip, ua);
    const db = getDb();
    if (countLoginFailuresToday(db, visitorHash, day) >= MAX_LOGGED_PER_VISITOR_PER_DAY) return;

    const { deviceType, browser, os } = parseUserAgent(ua);
    const row = {
      day, gate, ip, visitor_hash: visitorHash,
      guess: guess.slice(0, MAX_GUESS_CHARS), guess_length: guess.length,
      is_bot: isBot(ua), device_type: deviceType, browser, os,
    };
    const persist = (geo) => {
      try {
        const db = getDb();
        insertLoginFailure(db, { ...row, country: geo.country ?? null, region: geo.region ?? null });
        purgeOldGuesses(db);
      } catch (err) {
        console.error("[login] failed-login log insert failed:", err.message);
      }
    };
    // Same geo order as analytics: host headers first, else a cached IP lookup.
    const headerGeo = getGeoFromHeaders(req);
    if (headerGeo.country) persist(headerGeo);
    else resolveGeo(ip).then((g) => persist(g.country ? g : headerGeo)).catch(() => persist(headerGeo));
  } catch (err) {
    console.error("[login] failed-login log failed:", err.message);
  }
}

module.exports = { logFailedAttempt };
