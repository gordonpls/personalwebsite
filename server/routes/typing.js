// Typing Game leaderboard: a top-10 board per run length (30s and 60s), stored
// as a small JSON file. Runtime data — gitignored and excluded from the deploy
// rsync so scores survive deploys.
//
// Anti-forgery: the browser never reports a score. Instead:
//   1. POST /runs deals the words and returns them with a signed run token
//      (HMAC over the text, mode, and server issue time). Stateless, so it
//      works across Passenger processes and restarts.
//   2. The browser records a keystroke log (time since first key + what was
//      inserted / how many chars were deleted) and posts it with the token.
//   3. The server replays the log against the signed text, computes WPM and
//      accuracy itself, and rejects runs that are impossible: forged tokens,
//      logs longer than the real time since the token was issued, superhuman
//      speed, or machine-regular key timing.
// A determined script that fakes realistic human timing can still get through;
// this stops a typed-up curl with a made-up number.

const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const router = express.Router();

const DATA = path.join(__dirname, "..", "data");
const FILE = path.join(DATA, "typingScores.json");
const WORDS = JSON.parse(fs.readFileSync(path.join(DATA, "typing-words.json"), "utf8"));
const DURATIONS = [30, 60];
const PACKS = Object.keys(WORDS);
const BOARD_SIZE = 10;
const RUN_WORDS = 200;
const MAX_WPM = 250;              // anything above this is a bot
const TOKEN_TTL_MS = 60 * 60e3;   // a dealt run can be played within the hour
const CLOCK_SLACK_MS = 2000;      // network + timer-tick wiggle room
const MIN_TIMING_CV = 0.15;       // human key intervals are irregular; scripts aren't
const POST_COOLDOWN_MS = 4000;    // per IP; a run is at least 15s anyway

// Signing secret: TYPING_SECRET if set, else a random key generated once and
// kept in server/data (gitignored, excluded from deploys). 'wx' makes the
// first process to boot win the race; the rest read its key.
function loadSecret() {
    if (process.env.TYPING_SECRET) return process.env.TYPING_SECRET;
    const file = path.join(DATA, "typing-secret.key");
    try {
        fs.writeFileSync(file, crypto.randomBytes(32).toString("hex"), { flag: "wx", mode: 0o600 });
    } catch (err) {
        if (err.code !== "EEXIST") {
            console.error("[typing] can't persist secret, using a per-process one:", err.message);
            return crypto.randomBytes(32).toString("hex");
        }
    }
    return fs.readFileSync(file, "utf8").trim();
}
const SECRET = loadSecret();

const b64 = (buf) => Buffer.from(buf).toString("base64url");
const sign = (body) => crypto.createHmac("sha256", SECRET).update(body).digest();

function makeToken(run) {
    const body = b64(JSON.stringify(run));
    return `${body}.${b64(sign(body))}`;
}

function readToken(token) {
    if (typeof token !== "string" || token.length > 8000) return null;
    const [body, mac] = token.split(".");
    if (!body || !mac) return null;
    const expected = sign(body);
    const given = Buffer.from(mac, "base64url");
    if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
    try { return JSON.parse(Buffer.from(body, "base64url").toString("utf8")); } catch { return null; }
}

function dealText(pack) {
    const pool = WORDS[pack];
    const out = [];
    while (out.length < RUN_WORDS) {
        const w = pool[crypto.randomInt(pool.length)];
        if (w !== out[out.length - 1]) out.push(w);
    }
    return out.join(" ");
}

function load() {
    try {
        return JSON.parse(fs.readFileSync(FILE, "utf8"));
    } catch {
        return {};
    }
}

// Write to a temp file then rename, so a crash mid-write never truncates the board.
function save(store) {
    const tmp = `${FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(store));
    fs.renameSync(tmp, FILE);
}

// Strip control chars, collapse whitespace, cap length. React escapes on render.
function cleanName(raw) {
    if (typeof raw !== "string") return "";
    // eslint-disable-next-line no-control-regex -- stripping control chars is the point
    return raw.replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim().slice(0, 16);
}

// Higher WPM wins; ties go to accuracy, then whoever got there first.
const byRank = (a, b) => b.wpm - a.wpm || b.accuracy - a.accuracy || a.at - b.at;

// The run id stays server-side (it's only for replay protection).
// eslint-disable-next-line no-unused-vars -- destructured out on purpose
const publicBoard = (board) => board.map(({ id, ...e }) => e);

// Replays a keystroke log against the dealt text, mirroring the browser's
// useTypingSession: input clips at the text length, and accuracy counts every
// inserted char, including mistakes later fixed. Returns null if malformed.
function replay(text, log, limitMs) {
    if (!Array.isArray(log) || log.length === 0 || log.length > 6000) return null;
    let typed = "";
    let keystrokes = 0;
    let mistakes = 0;
    let lastT = 0;
    const times = [];
    for (const ev of log) {
        if (!Array.isArray(ev) || ev.length !== 2) return null;
        const [t, op] = ev;
        if (!Number.isInteger(t) || t < lastT || t < 0) return null;
        if (t > limitMs) break; // the browser stops accepting keys at the buzzer
        if (typeof op === "number") {
            if (!Number.isInteger(op) || op < 1) return null;
            typed = typed.slice(0, Math.max(0, typed.length - op));
        } else if (typeof op === "string" && op.length >= 1 && op.length <= 32) {
            for (const ch of op) {
                if (typed.length >= text.length) break;
                keystrokes++;
                if (ch !== text[typed.length]) mistakes++;
                typed += ch;
            }
        } else {
            return null;
        }
        times.push(t);
        lastT = t;
    }
    let correct = 0;
    for (let i = 0; i < typed.length; i++) if (typed[i] === text[i]) correct++;
    return { typed, keystrokes, mistakes, correct, lastT, times };
}

// Coefficient of variation of the gaps between keystrokes.
function timingCV(times) {
    const gaps = [];
    for (let i = 1; i < times.length; i++) gaps.push(times[i] - times[i - 1]);
    if (gaps.length < 10) return Infinity; // too short to judge; the WPM floor handles it
    const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    if (mean === 0) return 0;
    const sd = Math.sqrt(gaps.reduce((a, g) => a + (g - mean) ** 2, 0) / gaps.length);
    return sd / mean;
}

// GET /api/typing/scores → { 30: [...], 60: [...] }
router.get("/scores", (_req, res) => {
    const store = load();
    const out = {};
    for (const d of DURATIONS) out[d] = publicBoard(store[d] || []);
    res.json(out);
});

// POST /api/typing/runs { seconds, pack } → { token, text }
router.post("/runs", (req, res) => {
    const { seconds, pack } = req.body || {};
    if (!DURATIONS.includes(seconds) || !PACKS.includes(pack)) {
        return res.status(400).json({ error: "Unknown run type" });
    }
    const text = dealText(pack);
    const token = makeToken({ id: crypto.randomUUID(), seconds, pack, issuedAt: Date.now(), text });
    res.json({ token, text });
});

const lastPost = new Map();

// POST /api/typing/scores { token, name, log }
//   → { board, rank, wpm, accuracy } where rank is 1-based, or null if it didn't place.
router.post("/scores", (req, res) => {
    const now = Date.now();
    const ip = req.ip || "anon";
    if (now - (lastPost.get(ip) || 0) < POST_COOLDOWN_MS) {
        return res.status(429).json({ error: "Slow down a little" });
    }

    const run = readToken(req.body?.token);
    const name = cleanName(req.body?.name);
    if (!run || !name) return res.status(400).json({ error: "Invalid run" });
    const { id, seconds, pack, issuedAt, text } = run;
    if (!DURATIONS.includes(seconds)) return res.status(400).json({ error: "Unknown run type" });
    if (now - issuedAt > TOKEN_TTL_MS) return res.status(400).json({ error: "This run expired" });

    const result = replay(text, req.body?.log, seconds * 1000);
    if (!result) return res.status(400).json({ error: "Invalid run" });
    lastPost.set(ip, now);

    // A finished-early run lasts until its last key; otherwise the full clock.
    const finishedAll = result.typed === text;
    const runMs = finishedAll ? result.lastT : seconds * 1000;
    const wpm = runMs > 0 ? Math.round(result.correct / 5 / (runMs / 60000)) : 0;
    const accuracy = result.keystrokes
        ? Math.round(((result.keystrokes - result.mistakes) / result.keystrokes) * 100)
        : 100;

    const plausible =
        now - issuedAt >= runMs - CLOCK_SLACK_MS &&   // can't play faster than real time
        wpm <= MAX_WPM &&
        timingCV(result.times) >= MIN_TIMING_CV;
    if (!plausible) return res.status(422).json({ error: "This run couldn't be verified" });
    if (wpm <= 0) return res.json({ board: publicBoard(load()[seconds] || []), rank: null, wpm, accuracy });

    const store = load();
    const current = store[seconds] || [];
    if (current.some((e) => e.id === id)) return res.status(409).json({ error: "This run is already on the board" });

    const entry = { id, name, wpm, accuracy, pack, at: now };
    const board = [...current, entry].sort(byRank).slice(0, BOARD_SIZE);
    const idx = board.indexOf(entry);
    if (idx !== -1) {
        store[seconds] = board;
        try {
            save(store);
        } catch (err) {
            console.error("[typing] failed to save scores:", err.message);
            return res.status(500).json({ error: "Could not save score" });
        }
    }
    res.json({ board: publicBoard(store[seconds] || []), rank: idx === -1 ? null : idx + 1, wpm, accuracy });
});

module.exports = router;
