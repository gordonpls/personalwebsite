require("dotenv").config();
const express = require("express");
const cors = require("cors");
const plaidRoutes = require("./routes/plaid");
const spotifyRoutes = require("./routes/spotify");

const app = express();

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
    allowedHeaders: ["Content-Type"],
}));

app.use(express.json());

// One-time Plaid Link setup page. Gated behind a flag so it's never reachable
// in production — set PLAID_SETUP_ENABLED=true locally to connect an institution.
if (process.env.PLAID_SETUP_ENABLED === "true") {
    app.get("/setup", (_req, res) => res.sendFile(__dirname + "/test-link.html"));
}

app.use("/api", plaidRoutes);
app.use("/api", spotifyRoutes);

app.get(["/health", "/api/health"], (_req, res) => res.json({ status: "ok" }));

// Passenger on cPanel injects PORT; fall back to 3000 for local dev
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
