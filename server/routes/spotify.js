const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const router = express.Router();

// Spotify "now playing". Uses a long-lived refresh token (one-time OAuth) to mint
// short-lived access tokens server-side; the client only ever sees the track.
// Env: SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN.
//
// Refresh token persistence:
//   Runtime tokens are written to TOKEN_STORE (gitignored) and take priority over
//   the .env value. This lets the server survive Spotify's rotating-token policy
//   (new token issued on each refresh) without touching .env at runtime.
//
// Token expiry (Spotify policy, effective July 20 2026):
//   Refresh tokens expire after 6 months of non-use. When Spotify returns
//   invalid_grant, we set a reauth flag and serve the last-played fallback.
//   Reauth is a single browser visit: GET /api/spotify/reauth?secret=<SPOTIFY_REAUTH_SECRET>
//
// The bar must never vanish once we've seen any track, so we remember the last
// resolved track on disk and serve it (as "last played") whenever Spotify says
// nothing is playing or an API call fails.

const SCOPES = "user-read-currently-playing user-read-recently-played";
const REDIRECT_URI =
    process.env.SPOTIFY_REDIRECT_URI || "http://127.0.0.1:3000/api/spotify/callback";

let tokenCache = { token: null, exp: 0 };
let npCache = { at: 0, data: null };

const DATA_DIR = path.join(__dirname, "..", "data");
const STORE = path.join(DATA_DIR, "spotify-last.json");
const FALLBACK = path.join(DATA_DIR, "spotify-fallback.json");
const TOKEN_STORE = path.join(DATA_DIR, "spotify-tokens.json");
const REAUTH_FLAG = path.join(DATA_DIR, "spotify-needs-reauth.flag");
const REAUTH_STATE = path.join(DATA_DIR, "spotify-reauth-state.json");

const readJson = (p) => {
    try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; }
};
let lastTrack = readJson(STORE) || readJson(FALLBACK);

// Load persisted refresh token — takes priority over .env so the server can
// survive rotating tokens without the operator touching .env manually.
let storedRefreshToken = readJson(TOKEN_STORE)?.refreshToken || null;

// Reauth state (persisted across restarts via flag file).
let needsReauth = fs.existsSync(REAUTH_FLAG);
if (needsReauth) {
    console.error(
        "[spotify] Refresh token expired. Now-playing widget will serve last-played fallback.\n" +
        `         To fix: visit /api/spotify/reauth?secret=<SPOTIFY_REAUTH_SECRET>`
    );
}


function getRefreshToken() {
    return storedRefreshToken || process.env.SPOTIFY_REFRESH_TOKEN || null;
}

async function persistRefreshToken(token) {
    storedRefreshToken = token;
    await fs.promises.mkdir(DATA_DIR, { recursive: true });
    await fs.promises.writeFile(
        TOKEN_STORE,
        JSON.stringify({ refreshToken: token, updatedAt: new Date().toISOString() })
    );
}

async function markNeedsReauth() {
    needsReauth = true;
    tokenCache = { token: null, exp: 0 };
    storedRefreshToken = null;
    await fs.promises.mkdir(DATA_DIR, { recursive: true });
    await fs.promises.writeFile(REAUTH_FLAG, new Date().toISOString());
}

async function clearNeedsReauth() {
    needsReauth = false;
    try { await fs.promises.unlink(REAUTH_FLAG); } catch { /* already gone */ }
}

// Re-derive auth state from disk on each poll. In-memory flags get stale when
// the reauth callback runs in a different worker process (Passenger may run more
// than one) or simply after the flag/token files change — without this, a worker
// that once hit invalid_grant keeps logging "needs reauth" and keeps using the
// old token until it restarts. The flag file is the source of truth for reauth
// state; the token store for the current (possibly rotated/reauthed) token.
function syncAuthFromDisk() {
    needsReauth = fs.existsSync(REAUTH_FLAG);
    const onDisk = readJson(TOKEN_STORE)?.refreshToken;
    if (onDisk) storedRefreshToken = onDisk;
}

function remember(track) {
    if (!track?.title) return track;
    const changed = !lastTrack || lastTrack.url !== track.url;
    lastTrack = track;
    if (changed) {
        fs.promises
            .mkdir(DATA_DIR, { recursive: true })
            .then(() => fs.promises.writeFile(STORE, JSON.stringify(track)))
            .catch((e) => console.error("[now-playing] persist", e.message));
    }
    return track;
}

const asLastPlayed = () => (lastTrack ? { ...lastTrack, isPlaying: false } : { isPlaying: false });

async function getAccessToken() {
    if (needsReauth) throw new Error("spotify needs reauth — visit /api/spotify/reauth");
    if (tokenCache.token && Date.now() < tokenCache.exp) return tokenCache.token;

    const refreshToken = getRefreshToken();
    if (!refreshToken) throw new Error("no refresh token configured");

    const basic = Buffer.from(
        `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
    ).toString("base64");

    const res = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }),
    });

    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (body.error === "invalid_grant") {
            console.error(
                "[spotify] invalid_grant — refresh token expired or revoked.\n" +
                `         Discarding token and halting Spotify calls.\n` +
                `         To reauthorize: visit /api/spotify/reauth?secret=<SPOTIFY_REAUTH_SECRET>`
            );
            await markNeedsReauth().catch(() => {});
        }
        throw new Error(`spotify token ${res.status}: ${body.error || ""}`);
    }

    const j = await res.json();

    // Spotify may rotate the refresh token on each use. Capture it so we never
    // lose access between restarts without updating .env.
    if (j.refresh_token && j.refresh_token !== refreshToken) {
        console.log("[spotify] Received rotated refresh token — persisting to disk.");
        await persistRefreshToken(j.refresh_token).catch((e) =>
            console.error("[spotify] persist rotated token:", e.message)
        );
    }

    tokenCache = { token: j.access_token, exp: Date.now() + (j.expires_in - 60) * 1000 };
    return tokenCache.token;
}

function shape(item, isPlaying, progressMs) {
    return {
        isPlaying: !!isPlaying,
        title: item.name,
        artist: (item.artists || []).map((a) => a.name).join(", "),
        album: item.album?.name ?? null,
        albumArt: item.album?.images?.[0]?.url ?? null,
        url: item.external_urls?.spotify ?? null,
        durationMs: item.duration_ms ?? null,
        progressMs: progressMs ?? null,
    };
}

async function recentlyPlayed(token) {
    const r = await fetch(
        "https://api.spotify.com/v1/me/player/recently-played?limit=1",
        { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!r.ok) return null;
    const j = await r.json();
    const it = j.items?.[0];
    if (!it?.track) return null;
    return { ...shape(it.track, false), playedAt: it.played_at };
}

router.get("/now-playing", async (_req, res) => {
    syncAuthFromDisk(); // pick up a reauth/token change from the callback (any worker)
    if (!getRefreshToken() && !needsReauth) return res.json({ isPlaying: false, configured: false });
    if (npCache.data && Date.now() - npCache.at < 10_000) return res.json(npCache.data);

    let data;
    try {
        const token = await getAccessToken();
        const r = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (r.ok) {
            const j = await r.json();
            if (j?.item) data = remember(shape(j.item, j.is_playing, j.progress_ms));
        }
        if (!data) {
            const recent = await recentlyPlayed(token);
            if (recent) data = remember(recent);
        }
    } catch (err) {
        console.error("[now-playing]", err.message);
    }

    if (!data) data = asLastPlayed();
    npCache = { at: Date.now(), data };
    res.json(data);
});

// ── Reauth flow ──────────────────────────────────────────────────────────────
// Gate with SPOTIFY_REAUTH_SECRET so only you can trigger it.
// Step 1: visit /api/spotify/reauth?secret=<your secret> → redirects to Spotify.
// Step 2: Spotify redirects to /api/spotify/callback with a one-time code.
//         The server exchanges the code, persists the new refresh token, and
//         the now-playing widget resumes automatically.
//
// One-time setup: add https://gordonzhong.com/api/spotify/callback (and
// http://127.0.0.1:3000/api/spotify/callback for local) to your Spotify app's
// Redirect URIs at developer.spotify.com/dashboard.

router.get("/spotify/reauth", async (req, res) => {
    const secret = process.env.SPOTIFY_REAUTH_SECRET;
    if (!secret || req.query.secret !== secret) {
        return res.status(401).send("Unauthorized — set SPOTIFY_REAUTH_SECRET in server/.env");
    }
    if (!process.env.SPOTIFY_CLIENT_ID) {
        return res.status(500).send("SPOTIFY_CLIENT_ID not configured in server/.env");
    }
    // Persist the nonce to disk so any Passenger worker can validate the callback.
    const state = crypto.randomBytes(16).toString("hex");
    await fs.promises.mkdir(DATA_DIR, { recursive: true });
    await fs.promises.writeFile(
        REAUTH_STATE,
        JSON.stringify({ state, exp: Date.now() + 10 * 60 * 1000 })
    );

    const url =
        "https://accounts.spotify.com/authorize?" +
        new URLSearchParams({
            client_id: process.env.SPOTIFY_CLIENT_ID,
            response_type: "code",
            redirect_uri: REDIRECT_URI,
            scope: SCOPES,
            state,
            show_dialog: "true",
        });
    res.redirect(url);
});

router.get("/spotify/callback", async (req, res) => {
    const { code, state, error } = req.query;
    if (error) return res.status(400).send(`Spotify auth error: ${error}`);
    if (!code) return res.status(400).send("No authorization code in callback.");

    // Validate nonce from disk — works across all Passenger worker processes.
    const stored = readJson(REAUTH_STATE);
    if (!stored || state !== stored.state || Date.now() > stored.exp) {
        return res.status(400).send("Invalid or expired state — restart the flow via /api/spotify/reauth.");
    }
    await fs.promises.unlink(REAUTH_STATE).catch(() => {}); // consume nonce

    try {
        const basic = Buffer.from(
            `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
        ).toString("base64");
        const r = await fetch("https://accounts.spotify.com/api/token", {
            method: "POST",
            headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                grant_type: "authorization_code",
                code,
                redirect_uri: REDIRECT_URI,
            }),
        });
        const j = await r.json();
        if (!j.refresh_token) throw new Error(JSON.stringify(j));

        await persistRefreshToken(j.refresh_token);
        await clearNeedsReauth();
        tokenCache = { token: null, exp: 0 }; // force a clean refresh on next /now-playing

        console.log("[spotify] Reauthorization successful — new refresh token stored.");
        res.send(
            "<h2>Spotify reauthorized successfully.</h2>" +
            "<p>The now-playing widget will resume on the next poll. You can close this tab.</p>"
        );
    } catch (e) {
        console.error("[spotify] Reauth callback failed:", e.message);
        res.status(500).send("Token exchange failed: " + e.message);
    }
});

module.exports = router;
