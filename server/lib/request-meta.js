// Per-request metadata shared by analytics events and the finance login log:
// bot detection, the owner's excluded IPs, device/browser/OS, header-provided
// geo, and the salted, rotating visitor hash (never the raw IP).

const crypto = require("crypto");
const { UAParser } = require("ua-parser-js");

const EXCLUDED_IPS = (process.env.ANALYTICS_EXCLUDED_IPS || "")
  .split(",")
  .map((ip) => ip.trim())
  .filter(Boolean);

const SALT_PERIOD = process.env.ANALYTICS_SALT_PERIOD || "daily";

const BOT_PATTERNS = [
  /bot/i, /spider/i, /crawl/i, /slurp/i, /facebot/i,
  /ia_archiver/i, /wget/i, /curl\/\d/i, /python-requests/i,
  /go-http-client/i, /java\//i, /postmanruntime/i, /scrapy/i,
  /headlesschrome/i, /phantomjs/i, /selenium/i, /puppeteer/i,
  /lighthouse/i, /node-fetch/i, /httpclient/i, /datadoghq/i,
  /pingdom/i, /uptimerobot/i, /statuscake/i,
];

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

const isExcludedIp = (ip) => EXCLUDED_IPS.length > 0 && EXCLUDED_IPS.includes(ip);

module.exports = { EXCLUDED_IPS, isBot, isExcludedIp, getVisitorHash, parseUserAgent, getGeoFromHeaders };
