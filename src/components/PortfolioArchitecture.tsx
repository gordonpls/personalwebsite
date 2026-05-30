import { ArchitectureDrawer, type ArchitectureContent } from "./ArchitectureDrawer";

const CONTENT: ArchitectureContent = {
    title: "How this is built",
    oneLiner:
        "A React/Vite site whose finance section turns a live Plaid brokerage feed into a privacy-safe holdings dashboard (heatmap, performance vs the S&P 500, sector allocation, and per-holding analytics), backed by baked, free-tier-safe data pipelines.",
    stack: [
        { label: "Frontend", items: ["React 19 + Vite 6 + TypeScript", "Tailwind v4 + DaisyUI v5", "Recharts", "framer-motion"] },
        { label: "Backend", items: ["Express (Node)", "Plaid SDK", "cPanel / CloudLinux", "LiteSpeed + Passenger"] },
        { label: "Data sources", items: ["Plaid: holdings (runtime)", "Finnhub: quotes, metrics, analysts", "Yahoo: adj. prices, dividends, SPY"] },
        { label: "Build / CI", items: ["GitHub Actions", "rsync-over-SSH deploy", "weekly scheduled data bake"] },
        { label: "Quality", items: ["ESLint", "husky + lint-staged", "gitleaks secret scan"] },
    ],
    dataFlow:
        "Plaid is the only runtime source. The Express /api/holdings route reshapes raw Plaid holdings into privacy-safe rows (ticker, relative weight, and cost-basis return, never dollar amounts), cached server-side for 6 hours with in-flight dedup and serve-stale-on-error. Live daily quotes come from Finnhub via /api/quotes with a 2-minute cache. Everything heavy is baked at schedule time: a weekly GitHub Actions job pulls ~6 years of dividend-adjusted prices and dividend events from Yahoo (plus SPY as the S&P 500 benchmark), and per-holding metrics, profiles, and analyst data from Finnhub (throttled to ≤1 req/s). It commits the JSON and rsyncs it live. The React app reads those static files (cache-revalidated) and computes every return on the page (chart, risk-card 1Y, sparkline, per-position total return) from the same baked adjusted closes, so widgets never disagree. Per-visit third-party API cost is ≈ zero.",
    diagram: ` Plaid (brokerage)
   │ runtime
   ▼
 Express /api
   │ reshape: weights + return %
   │ /holdings (6h) · /quotes (2-min)
   ▼
 React + Vite (Recharts, framer-motion)
   ▲ reads static JSON (revalidated)
   │
 GitHub Actions, weekly bake
   Yahoo:   6y adj. closes + dividends
            + SPY benchmark
   Finnhub: metrics, profiles, analysts
   ▼
 holdingsHistory.json
 holdingsMeta.json
   ▼ commit + rsync to prod`,
    decisions: [
        { title: "Privacy by reshaping", body: "The backend never returns dollar amounts, only ticker, relative weight, and cost-basis return %. Every value-weighted figure (returns, yield, beta, volatility) is computed from those percentages so the portfolio's actual size stays private." },
        { title: "Free-tier safeguards", body: "Per-visit cost is bounded by server caches (holdings 6h, quotes 2-min) with in-flight dedup and serve-stale-on-error. All historical and metadata data is baked weekly into committed JSON, with Finnhub calls throttled to ≤1 req/s so the bake itself never trips a rate limit." },
        { title: "One source of truth for returns", body: "Every return shown (the chart line, the risk card's 1Y, the holding sparkline, the per-position total return) is computed from the same baked Yahoo adjusted-close series, or for All, from cost-basis. Range cutoffs anchor to the latest data point we have, not “today,” so a weekend bake lag doesn't empty 1W." },
        { title: "Cost-basis HPR “All” curve", body: "With no purchase-date history available, the all-time chart rebases each holding to its implied cost price (current price ÷ (1 + its return)) and cost-weights it, so the curve is a true holding-period return that ends exactly at the verified all-time figure." },
        { title: "Accurate ETF dividend yield", body: "Finnhub returns no yield for ETFs (most of the book), so trailing-12-month yield is computed from Yahoo's actual dividend events instead, then value-weighted into the portfolio's blended yield stat." },
        { title: "Fragile prod /api routing", body: "The live backend is a CloudLinux Node app behind LiteSpeed/Passenger, with a routing stub that lives inside the SPA web root, so the frontend deploy excludes it (rsync --exclude 'api') to avoid wiping it. LiteSpeed page caching is also disabled for the SPA so a redeploy isn't masked by a stale shell." },
    ],
    metrics: ["~6y price history baked", "50+ positions", "S&P 500 benchmark", "holdings cache 6h", "quotes cache 2 min", "weekly auto-refresh", "~0 per-visit data API calls"],
};

export const PortfolioArchitecture = () => <ArchitectureDrawer content={CONTENT} />;
