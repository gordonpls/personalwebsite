require("dotenv").config();
const express = require("express");
const cors = require("cors");
const plaidRoutes = require("./routes/plaid");
const spotifyRoutes = require("./routes/spotify");
const fortuneRoutes = require("./routes/fortune");
const adminRoutes = require("./routes/admin");
const financeRoutes = require("./routes/finance");
const analyticsRoutes = require("./routes/analytics");
const blogRoutes = require("./routes/blog");
const typingRoutes = require("./routes/typing");

const app = express();

// Behind LiteSpeed/Passenger; trust the proxy chain so req.ip resolves to the
// real client (read from X-Forwarded-For) instead of 127.0.0.1.
app.set("trust proxy", true);
app.disable("x-powered-by");

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "http://localhost:5173,http://localhost:3000")
    .split(",")
    .map((o) => o.trim());

// Local dev only: any http://localhost:<port> / 127.0.0.1:<port> page may call
// the API, so a dev or preview server on an unexpected port still works. Opt-in
// via ALLOW_LOCALHOST_ORIGINS=true, which only the dev scripts set; production
// (Passenger, `npm start`) never does.
const ALLOW_LOCALHOST = process.env.ALLOW_LOCALHOST_ORIGINS === "true";
const LOCALHOST_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

app.use(cors({
    origin: (origin, callback) => {
        // allow server-to-server requests (no origin) and listed origins only
        if (!origin || ALLOWED_ORIGINS.includes(origin) || (ALLOW_LOCALHOST && LOCALHOST_ORIGIN.test(origin))) {
            callback(null, true);
        } else {
            callback(new Error(`CORS: origin ${origin} not allowed`));
        }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));

// Keep the raw bytes too: Plaid webhook verification hashes the exact body.
app.use(express.json({ verify: (req, _res, buf) => { req.rawBody = buf; } }));

// One-time Plaid Link setup page. Gated behind a flag so it's never reachable
// in production — set PLAID_SETUP_ENABLED=true locally to connect an institution.
if (process.env.PLAID_SETUP_ENABLED === "true") {
    app.get("/setup", (_req, res) => res.sendFile(__dirname + "/test-link.html"));
}

app.use("/api", plaidRoutes);
app.use("/api", spotifyRoutes);
app.use("/api", fortuneRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/finance", financeRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/blog", blogRoutes);
app.use("/api/typing", typingRoutes);

app.get(["/health", "/api/health"], (_req, res) => res.json({ status: "ok" }));

// Passenger on cPanel injects PORT; fall back to 3000 for local dev
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
