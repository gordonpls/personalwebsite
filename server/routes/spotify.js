const express = require("express");

const router = express.Router();

// Spotify "now playing". Uses a long-lived refresh token (one-time OAuth) to mint
// short-lived access tokens server-side; the client only ever sees the track.
// Env: SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN.
let tokenCache = { token: null, exp: 0 };
let npCache = { at: 0, data: null };

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

async function recentlyPlayed(token) {
    const r = await fetch("https://api.spotify.com/v1/me/player/recently-played?limit=1", { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) return { isPlaying: false };
    const j = await r.json();
    const it = j.items?.[0];
    if (!it?.track) return { isPlaying: false };
    return { ...shape(it.track, false), playedAt: it.played_at };
}

router.get("/now-playing", async (_req, res) => {
    if (!process.env.SPOTIFY_REFRESH_TOKEN) return res.json({ isPlaying: false, configured: false });
    if (npCache.data && Date.now() - npCache.at < 10_000) return res.json(npCache.data); // 10s cache
    try {
        const token = await getAccessToken();
        const r = await fetch("https://api.spotify.com/v1/me/player/currently-playing", { headers: { Authorization: `Bearer ${token}` } });
        let data;
        if (r.status === 204 || r.status === 202) data = await recentlyPlayed(token);
        else if (r.ok) {
            const j = await r.json();
            data = j?.item ? shape(j.item, j.is_playing, j.progress_ms) : await recentlyPlayed(token);
        } else data = { isPlaying: false };
        npCache = { at: Date.now(), data };
        res.json(data);
    } catch (err) {
        console.error("[now-playing]", err.message);
        res.json({ isPlaying: false });
    }
});

module.exports = router;
