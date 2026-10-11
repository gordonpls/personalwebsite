// Daily allocation snapshots, so the dashboard can chart how the portfolio's
// mix has changed over time. One entry per calendar day (America/New_York),
// overwritten through the day so it ends as that day's last-known state.
//
// Same privacy rule as /api/holdings: weights and % returns only, never dollar
// amounts. Runtime data — gitignored and excluded from the deploy rsync
// (`--delete` would otherwise wipe the history on every deploy).

const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "data", "holdingsSnapshots.json");

const dayKey = (d = new Date()) => d.toLocaleDateString("en-CA", { timeZone: "America/New_York" }); // YYYY-MM-DD

function read() {
    try {
        const parsed = JSON.parse(fs.readFileSync(FILE, "utf8"));
        return parsed && typeof parsed.days === "object" ? parsed : { days: {} };
    } catch {
        return { days: {} };
    }
}

// Record `payload` (the /api/holdings shape) as today's snapshot. No-op when it
// is the payload already stored, so calling this on every cache hit is cheap.
function record(payload) {
    if (!payload?.holdings?.length) return;
    const store = read();
    const key = dayKey();
    if (store.days[key]?.asOf === payload.asOf) return;
    store.days[key] = {
        asOf: payload.asOf,
        totalReturnPct: payload.totalReturnPct ?? null,
        holdings: payload.holdings.map((h) => ({
            portfolio: h.portfolio,
            ticker: h.ticker,
            weightPct: h.weightPct,
            returnPct: h.returnPct,
        })),
    };
    store.updatedAt = new Date().toISOString();
    try {
        fs.writeFileSync(FILE, JSON.stringify(store));
    } catch (e) {
        console.error("[snapshots] write failed:", e.message);
    }
}

function hasToday() {
    return Boolean(read().days[dayKey()]);
}

// Sorted oldest → newest.
function list() {
    const { days } = read();
    return Object.keys(days).sort().map((date) => ({ date, ...days[date] }));
}

module.exports = { record, hasToday, list };
