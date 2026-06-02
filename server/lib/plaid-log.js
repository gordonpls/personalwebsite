// Structured logging for Plaid interactions.
//
// Plaid Support troubleshooting needs four identifiers per event:
//   - request_id        (every Plaid response carries this)
//   - item_id           (every successful Item-scoped response)
//   - account_id        (account-scoped events)
//   - link_session_id   (Link callbacks: onExit, onEvent, onSuccess)
//
// Emit them as JSON lines so it's grep-friendly and parseable. Writes to
// server/logs/plaid.log if the logs/ directory exists; otherwise prints to
// stderr. Access tokens are stripped defensively in case a caller passes a
// whole error object that contains one.

const fs = require("fs");
const path = require("path");

const LOG_DIR = path.join(__dirname, "..", "logs");
const LOG_FILE = path.join(LOG_DIR, "plaid.log");

const ALLOWED_FIELDS = [
    "level", "event", "request_id", "item_id", "account_id",
    "link_session_id", "institution", "error_code", "error_type", "message",
];

function sanitize(value) {
    if (value == null) return value;
    if (typeof value === "string") {
        // never let a stringified access_token slip into a log line
        return value
            .replace(/access[-_]?token[=:]\s*[\w-]+/gi, "access_token=[REDACTED]")
            .replace(/public[-_]?token[=:]\s*[\w-]+/gi, "public_token=[REDACTED]");
    }
    return value;
}

function logPlaid(fields) {
    const entry = { ts: new Date().toISOString() };
    for (const k of ALLOWED_FIELDS) {
        if (fields[k] != null) entry[k] = sanitize(fields[k]);
    }
    const line = JSON.stringify(entry);
    try {
        if (fs.existsSync(LOG_DIR)) {
            fs.appendFileSync(LOG_FILE, line + "\n");
        } else {
            // No logs/ dir yet → stderr (which Passenger captures).
            process.stderr.write(line + "\n");
        }
    } catch {
        // Logging must never crash the request path.
        process.stderr.write(line + "\n");
    }
}

// Helper for the common shape: pull request_id off the Plaid response.
function logPlaidResponse(event, response, extra = {}) {
    logPlaid({
        level: "info",
        event,
        request_id: response?.data?.request_id ?? null,
        item_id: response?.data?.item?.item_id ?? extra.item_id ?? null,
        ...extra,
    });
}

function logPlaidError(event, err, extra = {}) {
    const data = err?.response?.data ?? {};
    logPlaid({
        level: "error",
        event,
        request_id: data.request_id ?? null,
        error_code: data.error_code ?? null,
        error_type: data.error_type ?? null,
        message: data.error_message ?? err?.message ?? "unknown",
        ...extra,
    });
}

module.exports = { logPlaid, logPlaidResponse, logPlaidError };
