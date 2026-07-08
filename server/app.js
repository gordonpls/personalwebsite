require("dotenv").config();
const express = require("express");
const cors = require("cors");
const plaidRoutes = require("./routes/plaid");
const spotifyRoutes = require("./routes/spotify");
const fortuneRoutes = require("./routes/fortune");
const adminRoutes = require("./routes/admin");
const analyticsRoutes = require("./routes/analytics");

const app = express();

// Behind LiteSpeed/Passenger; trust the proxy chain so req.ip resolves to the
// real client (read from X-Forwarded-For) instead of 127.0.0.1.
app.set("trust proxy", true);

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "http://localhost:5173,http://localhost:3000")
    .split(",")
    .map((o) => o.trim());

app.use(cors({
    origin: (origin, callback) => {
        // allow server-to-server requests (no origin) and listed origins only
        if (!origin || ALLOWED_ORIGINS.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`CORS: origin ${origin} not allowed`));
        }
    },
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json());

// One-time Plaid Link setup page. Gated behind a flag so it's never reachable
// in production — set PLAID_SETUP_ENABLED=true locally to connect an institution.
if (process.env.PLAID_SETUP_ENABLED === "true") {
    app.get("/setup", (_req, res) => res.sendFile(__dirname + "/test-link.html"));
}

app.use("/api", plaidRoutes);
app.use("/api", spotifyRoutes);
app.use("/api", fortuneRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/analytics", analyticsRoutes);

app.get(["/health", "/api/health"], (_req, res) => res.json({ status: "ok" }));

// Passenger on cPanel injects PORT; fall back to 3000 for local dev
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
