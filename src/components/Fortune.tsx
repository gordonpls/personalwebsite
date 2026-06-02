import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { CookieScene } from "./fortune/CookieScene";
import { LuckyRow, type Lucky } from "./fortune/LuckyRow";
import { ChinesePhrase, type Chinese } from "./fortune/ChinesePhrase";
import { buildShareImage, downloadShareImage } from "./fortune/shareCard";

interface FortuneResponse {
    seed: string | null;
    message: string;
    source: "rapidapi" | "corpus";
    lucky: Lucky;
    chinese: Chinese | null;
}

type State =
    | { kind: "closed"; data: FortuneResponse | null }
    | { kind: "cracking"; data: FortuneResponse | null }
    | { kind: "open"; data: FortuneResponse };

function formatDate(seed: string | null): string {
    if (!seed) return "Random fortune";
    const [y, m, d] = seed.split("-").map(Number);
    const dt = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
    return dt.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
}

export default function Fortune() {
    const [state, setState] = useState<State>({ kind: "closed", data: null });
    const [error, setError] = useState<string | null>(null);

    const fetchFortune = (random = false) => {
        setError(null);
        const url = random ? "/api/fortune?random=1" : "/api/fortune";
        return fetch(url)
            .then((r) => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json() as Promise<FortuneResponse>;
            })
            .catch((e) => {
                setError(`The fortune cookie jar is empty: ${e.message}`);
                return null;
            });
    };

    // Pre-fetch today's fortune on mount so it's ready the instant the user cracks.
    useEffect(() => {
        let cancelled = false;
        fetchFortune(false).then((data) => {
            if (cancelled || !data) return;
            setState((s) => (s.kind === "closed" ? { kind: "closed", data } : s));
        });
        return () => { cancelled = true; };
    }, []);

    const crack = () => {
        if (state.kind === "open" || state.kind === "cracking") return;
        setState({ kind: "cracking", data: state.data });
        // Brief shake-then-split sequence; transition to open after the shake.
        setTimeout(() => {
            setState((s) => (s.data ? { kind: "open", data: s.data } : { kind: "closed", data: null }));
        }, 700);
    };

    const reroll = async () => {
        setState({ kind: "cracking", data: state.data });
        const fresh = await fetchFortune(true);
        if (!fresh) {
            setState({ kind: "closed", data: state.data });
            return;
        }
        // Slight delay so the swap doesn't feel jarring.
        setTimeout(() => setState({ kind: "open", data: fresh }), 250);
    };

    const reset = () => {
        setState({ kind: "closed", data: state.data });
    };

    const share = () => {
        if (state.kind !== "open") return;
        const dataUrl = buildShareImage({
            fortune: state.data.message,
            seed: state.data.seed,
            lucky: state.data.lucky,
            chinese: state.data.chinese,
        });
        downloadShareImage(dataUrl, state.data.seed);
    };

    const seed = state.data?.seed ?? null;

    return (
        <div className="container mx-auto w-full pt-4 overflow-x-hidden pt-18 bg-base-100 rounded-md">
            <Navbar />
            <div className="mockup-window border bg-base-300 !border-neutral dark:border-white rounded-md !overflow-visible">
                <div className="border-t !border-neutral dark:border-white px-4 pt-4 pb-12 rounded-md">
                    <section className="max-w-2xl mx-auto px-2 md:px-6 py-8 space-y-10">
                        {/* Eyebrow */}
                        <div className="text-center">
                            <p className="text-xs uppercase tracking-[0.3em] text-primary font-semibold">Fortune</p>
                            <h1 className="text-3xl md:text-4xl font-bold text-base-content mt-2">A cookie a day.</h1>
                            <p className="text-sm text-base-content/60 mt-2">{formatDate(seed)}</p>
                        </div>

                        {/* The cookie */}
                        <CookieScene
                            isOpen={state.kind === "open"}
                            isAnimating={state.kind === "cracking"}
                            onCrack={crack}
                            fortune={state.kind === "open" ? state.data.message : null}
                        />

                        {/* The fortune slip & details */}
                        <AnimatePresence>
                            {state.kind === "open" && (
                                <motion.div
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.5, delay: 0.55 }}
                                    className="space-y-8"
                                >
                                    {/* Big readable fortune (the slip text in the cookie is small) */}
                                    <figure className="text-center px-4">
                                        <blockquote
                                            className="text-xl md:text-2xl leading-snug italic text-base-content max-w-xl mx-auto"
                                            style={{ fontFamily: '"Iowan Old Style", Georgia, serif' }}
                                        >
                                            <span aria-hidden="true" className="text-primary/60 pr-1">“</span>
                                            {state.data.message}
                                            <span aria-hidden="true" className="text-primary/60 pl-0.5">”</span>
                                        </blockquote>
                                        <figcaption className="text-[10px] uppercase tracking-widest text-base-content/40 mt-3">
                                            Source: {state.data.source === "rapidapi" ? "live oracle" : "house corpus"}
                                        </figcaption>
                                    </figure>

                                    <LuckyRow lucky={state.data.lucky} />

                                    <ChinesePhrase chinese={state.data.chinese} />

                                    {/* Actions */}
                                    <div className="flex flex-wrap justify-center gap-3 pt-2">
                                        <button onClick={share} className="btn btn-primary btn-sm gap-2">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
                                                <polyline points="7 10 12 15 17 10" strokeLinecap="round" strokeLinejoin="round" />
                                                <line x1="12" y1="15" x2="12" y2="3" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                            Share card
                                        </button>
                                        <button onClick={reroll} className="btn btn-outline btn-sm gap-2">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                                                <path d="M23 4v6h-6" strokeLinecap="round" strokeLinejoin="round" />
                                                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                            Crack another
                                        </button>
                                        <button onClick={reset} className="btn btn-ghost btn-sm gap-2">
                                            Close cookie
                                        </button>
                                    </div>

                                    <p className="text-[11px] text-base-content/40 text-center mt-2">
                                        Same fortune for everyone today. New cookie tomorrow.
                                    </p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {error && (
                            <p className="text-sm text-error text-center">{error}</p>
                        )}
                    </section>
                </div>
            </div>
            <Footer />
        </div>
    );
}
