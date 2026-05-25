// One-time helper to mint a Spotify refresh token for the "now playing" feature.
//   1. Ensure SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET are in server/.env
//   2. In the Spotify app settings, add redirect URI: http://127.0.0.1:8888/callback
//   3. Run:  node scripts/spotify-token.mjs
//   4. Open the printed URL, approve, then copy SPOTIFY_REFRESH_TOKEN into server/.env
import http from "http";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envVal = (k) => {
    if (process.env[k]) return process.env[k];
    try { return (readFileSync(resolve(__dirname, "../server/.env"), "utf-8").match(new RegExp(`^${k}=(.+)$`, "m")) || [])[1]?.trim() || ""; }
    catch { return ""; }
};

const CLIENT_ID = envVal("SPOTIFY_CLIENT_ID");
const CLIENT_SECRET = envVal("SPOTIFY_CLIENT_SECRET");
const REDIRECT = "http://127.0.0.1:8888/callback";
const SCOPES = "user-read-currently-playing user-read-recently-played";

if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error("Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in server/.env first.");
    process.exit(1);
}

const authUrl = "https://accounts.spotify.com/authorize?" + new URLSearchParams({
    client_id: CLIENT_ID, response_type: "code", redirect_uri: REDIRECT, scope: SCOPES,
});
console.log(`\n1) Open this URL in your browser and approve:\n\n${authUrl}\n\nWaiting for the redirect on http://127.0.0.1:8888 ...\n`);

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://127.0.0.1:8888");
    if (url.pathname !== "/callback") { res.writeHead(404); res.end(); return; }
    const code = url.searchParams.get("code");
    if (!code) { res.writeHead(400); res.end("No code in callback."); return; }
    try {
        const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
        const r = await fetch("https://accounts.spotify.com/api/token", {
            method: "POST",
            headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: REDIRECT }),
        });
        const j = await r.json();
        if (!j.refresh_token) throw new Error(JSON.stringify(j));
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end("<h2>Done — copy the refresh token from your terminal, then close this tab.</h2>");
        console.log(`✅ Add this line to server/.env:\n\nSPOTIFY_REFRESH_TOKEN=${j.refresh_token}\n`);
        server.close(); process.exit(0);
    } catch (e) {
        res.writeHead(500); res.end("Error: " + e.message);
        console.error("Token exchange failed:", e.message);
        server.close(); process.exit(1);
    }
});
server.listen(8888, "127.0.0.1");
