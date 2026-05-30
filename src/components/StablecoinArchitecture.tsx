import { ArchitectureDrawer, type ArchitectureContent } from "./ArchitectureDrawer";

const CONTENT: ArchitectureContent = {
    title: "How this dashboard is built",
    oneLiner:
        "A cost-conscious Streamlit dashboard that tracks ~320 stablecoins (circulating supply, peg deviation, liquidity depth, reserve freshness) and rolls them into an explainable weighted risk score, stored as daily time-series snapshots.",
    stack: [
        { label: "Frontend", items: ["Streamlit ≥1.35 + autorefresh", "Plotly ≥5.22", "pandas ≥2.2"] },
        { label: "Ingestion", items: ["Python 3.11", "async httpx ≥0.27", "structlog", "FastAPI (optional, not deployed)"] },
        { label: "Storage", items: ["SQLite + SQLAlchemy 2.0 ORM", "DB committed to git", "Postgres-capable (unused)"] },
        { label: "Hosting / CI", items: ["Streamlit Community Cloud", "GitHub Actions nightly (02:00 UTC)", "keep-awake (~9h, headless Chromium)"] },
        { label: "Quality", items: ["ruff", "mypy", "pytest + asyncio", "456 tests / 27 files"] },
    ],
    dataFlow:
        "GitHub Actions runs four nightly pipelines: update_supply (DefiLlama), update_prices (Binance → Coinbase → batched CoinGecko), update_reserves (curated transparency URLs), and score_stablecoins. Every external call funnels through core.http.tracked_get: budget check → in-memory TTL cache → fetch → log → store. Normalized rows persist as snapshots in SQLite; the job commits the updated .db back to the repo ([skip ci]). The dashboard itself makes zero network calls; it reads SQLite through a cached services layer (st.cache_data, 30 to 300s) with autorefresh re-rendering.",
    diagram: ` GitHub Actions (cron 02:00 UTC)
   │ runs 4 nightly pipelines
   ▼
 ingestion/* → tracked_get
   DefiLlama, Binance, Coinbase,
   CoinGecko, transparency URLs
   │ budget → cache → fetch → log
   ▼
 SQLite snapshots
   │ commit .db to git
   ▼
 Streamlit (reads DB only,
   st.cache_data 30 to 300s,
   autorefresh)
   ▼
 Browser

 keep-awake.yml (headless Chromium)
   wakes Streamlit ~9h/day`,
    decisions: [
        { title: "Read-only-FS deploy", body: "Streamlit Cloud's read-only overlay means the model layer probes real writability and falls back to a /tmp copy seeded from the committed DB, with NullPool so a git-swapped .db never surfaces “disk image malformed.”" },
        { title: "Binance 451 geo-block", body: "Datacenter IPs get HTTP 451, so a 1-hour circuit-breaker stops hammering a dead provider. Coinbase, then a single batched CoinGecko call, are the fallbacks, recording provider provenance per price." },
        { title: "Single cost funnel", body: "Every call routes through tracked_get, which enforces per-provider daily budgets, RPM limits, caching, and logging, keeping paid calls off the frontend entirely." },
        { title: "Data as a git artifact", body: "The nightly job commits the SQLite snapshot back to the repo for free persistence (no hosted DB), which is what drove the read-only file-swap hardening above." },
        { title: "Explainable scoring", body: "Deterministic 0 to 100 sub-scores from one shared weights constant (peg .35 / liquidity .25 / reserve .25 / adoption .15), so the UI drilldown can never disagree with the pipeline." },
    ],
    metrics: ["~320 stablecoins", "243 with supply history", "~22k supply snapshots", "~17k risk scores", "213 reserve reports", "30 to 300s UI cache", "456 tests / 27 files"],
    metricsNote: "Bundle size / Lighthouse: N/A for Streamlit; coverage % not measured.",
};

export const StablecoinArchitecture = () => <ArchitectureDrawer content={CONTENT} />;
