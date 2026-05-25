import { useEffect, useState } from "react";

const ONE_LINER =
    "A cost-conscious Streamlit dashboard that tracks ~320 stablecoins — circulating supply, peg deviation, liquidity depth, reserve freshness — and rolls them into an explainable weighted risk score, stored as daily time-series snapshots.";

const STACK: { label: string; items: string[] }[] = [
    { label: "Frontend", items: ["Streamlit ≥1.35 + autorefresh", "Plotly ≥5.22", "pandas ≥2.2"] },
    { label: "Ingestion", items: ["Python 3.11", "async httpx ≥0.27", "structlog", "FastAPI (optional, not deployed)"] },
    { label: "Storage", items: ["SQLite + SQLAlchemy 2.0 ORM", "DB committed to git", "Postgres-capable (unused)"] },
    { label: "Hosting / CI", items: ["Streamlit Community Cloud", "GitHub Actions nightly (02:00 UTC)", "keep-awake (~9h, headless Chromium)"] },
    { label: "Quality", items: ["ruff", "mypy", "pytest + asyncio", "456 tests / 27 files"] },
];

const DATA_FLOW =
    "GitHub Actions runs four nightly pipelines — update_supply (DefiLlama), update_prices (Binance → Coinbase → batched CoinGecko), update_reserves (curated transparency URLs), and score_stablecoins. Every external call funnels through core.http.tracked_get: budget check → in-memory TTL cache → fetch → log → store. Normalized rows persist as snapshots in SQLite; the job commits the updated .db back to the repo ([skip ci]). The dashboard itself makes zero network calls — it reads SQLite through a cached services layer (st.cache_data, 30–300s) with autorefresh re-rendering.";

const DIAGRAM = ` GitHub Actions (cron 02:00 UTC)
        │ runs pipelines
        ▼
 ingestion/* ──tracked_get──► [ budget → cache → fetch → log ]
   DefiLlama / Binance              │
   Coinbase / CoinGecko             ▼
                            SQLite (time-series snapshots)
                                    │ commit .db to git
                                    ▼
                       Streamlit app (reads DB only,
                       st.cache_data 30–300s, autorefresh)
                                    ▼
                                 Browser

 keep-awake.yml (~9h, headless Chromium) ──► wakes Streamlit`;

const DECISIONS: { title: string; body: string }[] = [
    { title: "Read-only-FS deploy", body: "Streamlit Cloud's read-only overlay → the model layer probes real writability and falls back to a /tmp copy seeded from the committed DB, with NullPool so a git-swapped .db never surfaces “disk image malformed.”" },
    { title: "Binance 451 geo-block", body: "Datacenter IPs get HTTP 451, so a 1-hour circuit-breaker stops hammering a dead provider — Coinbase then a single batched CoinGecko call are the fallbacks, recording provider provenance per price." },
    { title: "Single cost funnel", body: "Every call routes through tracked_get, which enforces per-provider daily budgets, RPM limits, caching, and logging — keeping paid calls off the frontend entirely." },
    { title: "Data as a git artifact", body: "The nightly job commits the SQLite snapshot back to the repo for free persistence (no hosted DB) — which is what drove the read-only file-swap hardening above." },
    { title: "Explainable scoring", body: "Deterministic 0–100 sub-scores from one shared weights constant (peg .35 / liquidity .25 / reserve .25 / adoption .15), so the UI drilldown can never disagree with the pipeline." },
];

const METRICS = ["~320 stablecoins", "243 with supply history", "~22k supply snapshots", "~17k risk scores", "213 reserve reports", "30–300s UI cache", "456 tests / 27 files"];

const H3 = "text-xs font-semibold uppercase tracking-widest text-base-content/50";

// Slide-out "Under the hood" drawer (opens from the right) documenting the
// dashboard's architecture, with an edge tab to open it.
export const StablecoinArchitecture = () => {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    return (
        <>
            {/* Edge tab */}
            <button
                onClick={() => setOpen(true)}
                aria-label="Open: how this dashboard is built"
                className={`fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-primary text-primary-content py-4 px-2 rounded-l-xl shadow-lg text-sm font-semibold tracking-wide [writing-mode:vertical-rl] rotate-180 transition-all hover:px-2.5 ${open ? "opacity-0 pointer-events-none" : "opacity-100"}`}
            >
                Under the hood
            </button>

            {/* Backdrop */}
            <div
                onClick={() => setOpen(false)}
                className={`fixed inset-0 z-40 bg-base-content/40 backdrop-blur-sm transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
            />

            {/* Drawer */}
            <aside
                className={`fixed top-0 right-0 z-50 h-full w-full max-w-xl bg-base-200 shadow-2xl flex flex-col transition-transform duration-300 ease-out ${open ? "translate-x-0" : "translate-x-full"}`}
                aria-hidden={!open}
            >
                <header className="flex items-start justify-between gap-3 p-5 border-b border-base-300 shrink-0">
                    <div>
                        <p className="text-xs uppercase tracking-widest text-primary font-semibold">Under the hood</p>
                        <h2 className="text-xl font-bold text-base-content mt-0.5">How this dashboard is built</h2>
                    </div>
                    <button onClick={() => setOpen(false)} className="btn btn-sm btn-circle btn-ghost shrink-0" aria-label="Close">✕</button>
                </header>

                <div className="overflow-y-auto px-5 py-6 space-y-9">
                    <p className="text-base-content/70 leading-relaxed">{ONE_LINER}</p>

                    {/* Stack */}
                    <div className="space-y-3">
                        <h3 className={H3}>Stack</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {STACK.map((c) => (
                                <div key={c.label} className="bg-base-100 border border-base-300 rounded-xl p-4">
                                    <p className="text-sm font-semibold text-base-content mb-2">{c.label}</p>
                                    <ul className="space-y-1">
                                        {c.items.map((it) => (
                                            <li key={it} className="text-sm text-base-content/70 flex gap-2"><span className="text-primary/60">›</span>{it}</li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Architecture */}
                    <div className="space-y-3">
                        <h3 className={H3}>Architecture</h3>
                        <p className="text-base-content/70 leading-relaxed">{DATA_FLOW}</p>
                        <pre className="bg-neutral text-neutral-content/90 rounded-xl p-4 text-[10px] sm:text-xs leading-relaxed overflow-x-auto font-mono">{DIAGRAM}</pre>
                    </div>

                    {/* Key decisions */}
                    <div className="space-y-3">
                        <h3 className={H3}>Key decisions &amp; challenges</h3>
                        <div className="space-y-3">
                            {DECISIONS.map((d) => (
                                <div key={d.title} className="bg-base-100 border border-base-300 rounded-xl p-4">
                                    <p className="font-semibold text-base-content mb-1">{d.title}</p>
                                    <p className="text-sm text-base-content/70 leading-relaxed">{d.body}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Metrics */}
                    <div className="space-y-3">
                        <h3 className={H3}>By the numbers</h3>
                        <div className="flex flex-wrap gap-2">
                            {METRICS.map((m) => (
                                <span key={m} className="px-3 py-1.5 rounded-lg bg-base-100 border border-base-300 text-sm text-base-content/80 font-medium tabular-nums">{m}</span>
                            ))}
                        </div>
                        <p className="text-[11px] text-base-content/40">Bundle size / Lighthouse: N/A for Streamlit; coverage % not measured.</p>
                    </div>
                </div>
            </aside>
        </>
    );
};
