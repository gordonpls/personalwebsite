import { ArchitectureDrawer, type ArchitectureContent } from "./ArchitectureDrawer";

const CONTENT: ArchitectureContent = {
    title: "How this is built",
    oneLiner:
        "A short risk quiz (five questions plus age and time-horizon sliders) that scores your willingness and ability to take risk separately, then drives a four-ETF historical simulator (VTI, VXUS, BND, BNDX) so you can see how your suggested mix would have actually moved over time.",
    stack: [
        { label: "Frontend", items: ["React 19 + Vite 6 + TypeScript", "Tailwind v4 + DaisyUI v5", "Recharts", "framer-motion"] },
        { label: "Quiz", items: ["Static JSON question bank", "Per-question weighted scoring", "Shuffled options per session"] },
        { label: "Simulator", items: ["VTI/VXUS equity sleeve (60/40)", "BND/BNDX bond sleeve (60/40)", "Returns rebased to period start"] },
        { label: "Data sources", items: ["Alpha Vantage (live)", "Baked tickerCache.json (build-time)", "Server /api/tickers.json (mirror)"] },
        { label: "Build / CI", items: ["GitHub Actions", "rsync-over-SSH deploy", "npm run fetch-cache (manual refresh)"] },
    ],
    dataFlow:
        "The quiz reads questions from a static JSON bank and shuffles each question's options on mount. Answers score two axes, willingness (goal, outcome range, reaction to a drop, weighted toward behavior) and ability (cash cushion, time horizon). Willingness is blended with a 110-minus-age anchor, docked for a thin cushion, and capped by the horizon to get an equity %, which maps to one of five profiles (Conservative through Aggressive) with tailored insights. Applying it sets the simulator's slider, which splits the portfolio 60/40 inside each sleeve: VTI/VXUS for equities, BND/BNDX for bonds. Price series come through a four-tier fallback so the page works even with no API key: localStorage cache (24h) → server-cached /api/tickers.json (≤25h) → live Alpha Vantage (staggered for 5 req/min) → baked tickerCache.json imported at build time. Prices are stored raw and rebased to percent-return-from-period-start whenever the range changes, so range switching never re-fetches.",
    diagram: ` Quiz (static JSON)
   │ shuffled options
   │ weighted scoring
   ▼
 Risk band → equity %
   │
   ▼
 Simulator slider (equity %)
   │ 60/40 within each sleeve
   │ VTI + VXUS  (equities)
   │ BND + BNDX (bonds)
   ▼
 useTickerData (4-tier fallback)
   1. localStorage cache (24h)
   2. /api/tickers.json (≤25h)
   3. Alpha Vantage (live, staggered)
   4. baked tickerCache.json
   ▼
 Recharts: portfolio vs
   equities-only vs bonds-only
   (rebased to % from start)`,
    decisions: [
        { title: "Quiz → equity %, not a dollar plan", body: "The quiz outputs a suggested equity allocation (and an implied bond %), never a dollar amount. Risk bands are coarse on purpose so the recommendation feels like a starting point, not financial advice." },
        { title: "Four-tier ticker fallback", body: "Live prices go localStorage → server JSON → Alpha Vantage → baked JSON. Each tier short-circuits the next, so the page always renders something: with a key it can be live-fresh; with no key it still works off the build-time bake." },
        { title: "60/40 inside each sleeve", body: "The slider chooses the equity/bond split; inside each sleeve the ratio is fixed (VTI/VXUS 60/40 for equities, BND/BNDX 60/40 for bonds). That keeps the comparison readable: one knob, not a four-way slider." },
        { title: "Rebase on range change, not on fetch", body: "Prices are stored raw. Every range switch recomputes returns from the start of the selected window, so 1M/3M/1Y/YTD/All never re-fetch and never disagree about the start point." },
        { title: "Free-tier safe by default", body: "Alpha Vantage's 5 requests/minute free tier is enough only if calls are staggered and re-use a cache. The four tiers above mean the page never hammers the API: the bake covers cold starts, localStorage covers warm visits, and the server JSON covers everyone else." },
    ],
    metrics: ["5 questions + 2 sliders", "5 risk bands", "4 ETFs simulated", "~6y price history baked", "24h localStorage cache", "free-tier-safe live API"],
};

export const AllocationArchitecture = () => <ArchitectureDrawer content={CONTENT} />;
