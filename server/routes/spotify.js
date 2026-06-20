const express = require("express");
const path = require("path");
const fs = require("fs");

const router = express.Router();

// Spotify "now playing". Uses a long-lived refresh token (one-time OAuth) to mint
// short-lived access tokens server-side; the client only ever sees the track.
// Env: SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN.
//
// The bar must never vanish once we've seen any track, so we remember the last
// resolved track on disk and serve it (as "last played") whenever Spotify says
// nothing is playing or an API call fails — including when the refresh token
// lacks the user-read-recently-played scope and that endpoint 403s.
let tokenCache = { token: null, exp: 0 };
let npCache = { at: 0, data: null };

const STORE = path.join(__dirname, "..", "data", "spotify-last.json");
// Committed seed so the bar always has something — even on a cold server that
// has never resolved a live track (e.g. right after a fresh deploy).
const FALLBACK = path.join(__dirname, "..", "data", "spotify-fallback.json");
const readJson = (p) => {
    try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; }
};
// Prefer the runtime cache (last track we actually resolved); fall back to the
// committed seed until the first live resolution overwrites it.
let lastTrack = readJson(STORE) || readJson(FALLBACK);

// Persist the most recently resolved track, but only write to disk when the
// track actually changes (keyed by url) so we don't churn the disk every poll.
function remember(track) {
    if (!track?.title) return track;
    const changed = !lastTrack || lastTrack.url !== track.url;
    lastTrack = track;
    if (changed) {
        fs.promises
            .mkdir(path.dirname(STORE), { recursive: true })
            .then(() => fs.promises.writeFile(STORE, JSON.stringify(track)))
            .catch((e) => console.error("[now-playing] persist", e.message));
    }
    return track;
}

// The remembered track, always presented as not-currently-playing.
const asLastPlayed = () => (lastTrack ? { ...lastTrack, isPlaying: false } : { isPlaying: false });

async function getAccessToken() {
    if (tokenCache.token && Date.now() < tokenCache.exp) return tokenCache.token;
    const basic = Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString("base64");
    const res = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: process.env.SPOTIFY_REFRESH_TOKEN }),
    });
    if (!res.ok) throw new Error(`spotify token ${res.status}`);
    const j = await res.json();
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

// Last item from recently-played; null if unavailable (e.g. missing scope).
async function recentlyPlayed(token) {
    const r = await fetch("https://api.spotify.com/v1/me/player/recently-played?limit=1", { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) return null;
    const j = await r.json();
    const it = j.items?.[0];
    if (!it?.track) return null;
    return { ...shape(it.track, false), playedAt: it.played_at };
}

router.get("/now-playing", async (_req, res) => {
    if (!process.env.SPOTIFY_REFRESH_TOKEN) return res.json({ isPlaying: false, configured: false });
    if (npCache.data && Date.now() - npCache.at < 10_000) return res.json(npCache.data); // 10s shared cache

    let data;
    try {
        const token = await getAccessToken();
        const r = await fetch("https://api.spotify.com/v1/me/player/currently-playing", { headers: { Authorization: `Bearer ${token}` } });
        if (r.ok) {
            const j = await r.json(); // 200: a track is loaded (playing or paused)
            if (j?.item) data = remember(shape(j.item, j.is_playing, j.progress_ms));
        }
        // 204 (nothing loaded) or 200 without an item → fall back to recently-played.
        if (!data) {
            const recent = await recentlyPlayed(token);
            if (recent) data = remember(recent);
        }
    } catch (err) {
        console.error("[now-playing]", err.message);
    }

    // Nothing live and recently-played unavailable → serve the remembered track
    // so the bar persists. Only truly empty before we've ever resolved a track.
    if (!data) data = asLastPlayed();

    npCache = { at: Date.now(), data };
    res.json(data);
});

module.exports = router;
