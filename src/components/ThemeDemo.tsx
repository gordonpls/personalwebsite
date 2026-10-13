import { useEffect, useState } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { getDarkTheme, getMode, setDarkPreview, DARK_THEME } from "@/lib/theme";

const THEMES = [
    { id: DARK_THEME, label: "Current — Twilight Pastels", description: "Today's dark mode: soft slate-violet base, sky-blue primary, mint accent. Here for comparison." },
    { id: "dark-midnight-lilac", label: "1 — Midnight Lilac", description: "A deeper base with a lilac tint that mirrors the new light theme. Sky-blue primary, lilac accent." },
    { id: "dark-deep-ocean", label: "2 — Deep Ocean", description: "Dark navy base, aqua primary, coral accent. Richer and more saturated than the current theme." },
    { id: "dark-graphite", label: "3 — Graphite", description: "Almost colorless charcoal, sky-blue primary, mint accent. The closest to a true dark mode, so the pastels stand out most." },
    { id: "dark-ember", label: "4 — Ember", description: "Warm charcoal base, amber primary, rose accent. Cozy and evening-like, and a deliberate contrast to the cool light theme." },
    { id: "dark-forest-night", label: "5 — Forest Night", description: "Green-black base, mint primary, gold accent. Calm and natural, and it pairs well with the gallery." },
];

const SWATCHES = ["base-100", "base-200", "base-300", "base-content", "primary", "secondary", "accent", "neutral"];

// A miniature of the real page shell (navbar → mockup-window → section card)
// rendered under the candidate theme, using the same classes the site uses.
function Sample() {
    return (
        <div className="bg-base-100 text-base-content rounded-md p-3">
            <div className="flex items-center justify-between px-1 pb-3">
                <span className="font-semibold text-sm">G. Zhong</span>
                <div className="flex gap-3 text-xs text-base-content/60">
                    <span>About</span><span>Projects</span><span className="text-primary font-medium">Blog</span>
                </div>
            </div>
            <div className="mockup-window border bg-base-300 !border-neutral rounded-md">
                <div className="border-t !border-neutral px-4 py-5 bg-base-200 rounded-b-md">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-primary font-semibold mb-1">Projects</p>
                    <h3 className="text-lg font-bold mb-1">Investing Dashboard</h3>
                    <p className="text-xs text-base-content/60 mb-4 leading-relaxed">
                        Live holdings and performance, pulled from Plaid and rebased to the selected range.
                    </p>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                        {[["YTD", "+12.4%", "text-success"], ["1D", "−0.8%", "text-error"], ["Holdings", "14", ""]].map(([k, v, c]) => (
                            <div key={k} className="bg-base-100 border border-base-content/10 rounded-md p-2">
                                <p className="text-[10px] text-base-content/60">{k}</p>
                                <p className={`text-sm font-semibold tabular-nums ${c}`}>{v}</p>
                            </div>
                        ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <button className="btn btn-primary btn-sm">Download Resume</button>
                        <button className="btn btn-outline btn-secondary btn-sm">View code</button>
                        <span className="badge badge-accent badge-sm">New</span>
                        <span className="badge badge-outline badge-sm">React</span>
                    </div>
                </div>
            </div>
            <div className="flex mt-3 rounded overflow-hidden border border-base-content/10">
                {SWATCHES.map((s) => (
                    <div key={s} className="flex-1 h-5" style={{ background: `var(--color-${s})` }} title={s} />
                ))}
            </div>
        </div>
    );
}

export default function ThemeDemo() {
    const [active, setActive] = useState<string | null>(() => (getMode() === "dark" ? getDarkTheme() : null));

    useEffect(() => {
        const sync = () => setActive(getMode() === "dark" ? getDarkTheme() : null);
        window.addEventListener("themechange", sync);
        return () => window.removeEventListener("themechange", sync);
    }, []);

    const tryTheme = (id: string) => setDarkPreview(id === DARK_THEME ? null : id);

    return (
        <div className="container mx-auto w-full overflow-x-hidden pt-18 bg-base-100 rounded-md">
            <Navbar />
            <div className="mockup-window border bg-base-300 !border-neutral dark:border-white rounded-md !overflow-visible">
                <div className="border-t !border-neutral dark:border-white px-4 pt-8 pb-12 rounded-md">
                    <div className="max-w-5xl mx-auto">
                        <p className="text-xs uppercase tracking-[0.3em] text-primary font-semibold mb-2">
                            Design Preview
                        </p>
                        <h1 className="text-2xl font-bold text-base-content mb-1">Dark Mode Palettes</h1>
                        <p className="text-sm text-base-content/60 mb-10 max-w-2xl">
                            Each card renders the site's real classes under a candidate theme. "Try site-wide"
                            switches to dark mode with that palette for this browser tab only, so you can browse the
                            real pages. Closing the tab resets it.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {THEMES.map((t) => (
                                <div key={t.id} className="bg-base-200 border border-base-content/10 rounded-md p-4 flex flex-col gap-4">
                                    <div data-theme={t.id} className="rounded-md">
                                        <Sample />
                                    </div>
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-semibold text-sm text-base-content">{t.label}</p>
                                            <p className="text-xs text-base-content/60 mt-1 leading-relaxed">{t.description}</p>
                                        </div>
                                        <button
                                            className={`btn btn-sm shrink-0 ${active === t.id ? "btn-primary" : "btn-outline"}`}
                                            onClick={() => tryTheme(t.id)}
                                        >
                                            {active === t.id ? "Active" : "Try site-wide"}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
}
