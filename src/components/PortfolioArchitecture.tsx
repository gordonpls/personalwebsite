import { ArchitectureDrawer, type ArchitectureContent } from "./ArchitectureDrawer";

const CONTENT: ArchitectureContent = {
    title: "How this is built",
    oneLiner:
        "A React/Vite site whose finance section turns a live Plaid brokerage feed into a privacy-safe holdings dashboard — heatmap, performance vs the S&P 500, allocation, and per-holding analytics — backed by baked, free-tier-safe data pipelines.",
    stack: [
        { label: "Frontend", items: ["React 19 + Vite 6 + TypeScript", "Tailwind v4 + DaisyUI v5", "Recharts", "framer-motion"] },
        { label: "Backend", items: ["Express (Node)", "Plaid SDK", "cPanel / CloudLinux", "LiteSpeed + Passenger"] },
        { label: "Data sources", items: ["Plaid — holdings (runtime)", "Finnhub — quotes + metrics", "Yahoo — adj. prices + dividends"] },
        { label: "Build / CI", items: ["GitHub Actions", "rsync-over-SSH deploy", "weekly scheduled data bake"] },
        { label: "Quality", items: ["ESLint", "husky + lint-staged", "gitleaks secret scan"] },
    ],
    dataFlow:
        "Plaid is the only runtime source: the Express /api/holdings route reshapes raw Plaid holdings into privacy-safe rows — ticker, relative weight, and cost-basis return, never dollar amounts — cached server-side (6h) with in-flight dedup and serve-stale-on-error. Live daily quotes come from Finnhub (/api/quotes, 2-min cache). Everything heavy is baked at schedule time: a weekly GitHub Actions job pulls ~6 years of dividend-adjusted prices + trailing dividends from Yahoo and per-holding metrics/profiles/analyst data from Finnhub (throttled ≤1 req/s), commits the JSON, and rsyncs it live — so per-visit third-party API cost is ~zero. The React app reads those static files (cache-revalidated) and computes returns, the S&P 500 benchmark, allocation, and risk client-side.",
    diagram: ` Plaid (brokerage)
   │ runtime
   ▼
 Express /api ──► reshape (no $ amounts) ──► cache 6h · dedup · serve-stale
   │  /holdings · /quotes (Finnhub, 2-min)
   ▼
 React + Vite (Recharts / framer-motion)
   ▲ reads static JSON (revalidated)
   │
 GitHub Actions — weekly bake
   Yahoo   → 6y adj. prices + TTM dividends
   Finnhub → metrics · profiles · analysts (≤1 req/s)
   └─► holdingsHistory.json + holdingsMeta.json ─► commit + rsync to prod`,
    decisions: [
        { title: "Privacy by reshaping", body: "The backend never returns dollar amounts — only ticker, relative weight, and cost-basis return %. Value-weighted figures (yield, beta, total return) are computed server-side and exposed as percentages, so the portfolio's actual size stays private." },
        { title: "Free-tier safeguards", body: "Per-visit cost is bounded by server caches (holdings 6h, quotes 2-min) with in-flight dedup + serve-stale-on-error; all historical/metadata data is baked weekly into committed JSON, so traffic never multiplies upstream calls." },
        { title: "Cost-basis HPR “All” curve", body: "With no purchase-date history available, the all-time chart rebases each holding to its implied cost price (current price ÷ (1 + its return)) and cost-weights it, so the curve is a true holding-period return that ends exactly at the verified all-time figure." },
        { title: "Fragile prod /api routing", body: "The live backend is a CloudLinux Node app behind LiteSpeed/Passenger, with a routing stub that lives inside the SPA web root — so the frontend deploy excludes it (rsync --exclude 'api') to avoid wiping it, a past cause of /api outages." },
        { title: "Accurate ETF dividend yield", body: "Finnhub returns no yield for ETFs (most of the book), so trailing-12-month yield is computed from Yahoo's actual dividend events instead, then value-weighted across holdings." },
    ],
    metrics: ["~6y price history baked", "50+ positions", "holdings cache 6h", "quotes cache 2 min", "weekly auto-refresh", "S&P 500 benchmark", "~0 per-visit data API calls"],
};

export const PortfolioArchitecture = () => <ArchitectureDrawer content={CONTENT} />;
