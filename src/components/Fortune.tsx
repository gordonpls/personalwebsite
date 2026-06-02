import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { CookieScene } from "./fortune/CookieScene";
import { LuckyRow, type Lucky } from "./fortune/LuckyRow";
import { ChinesePhrase, type Chinese } from "./fortune/ChinesePhrase";
import { buildShareImage, downloadShareImage } from "./fortune/shareCard";

interface FortuneResponse {
    date: string;
    message: string;
    source: "rapidapi" | "corpus";
    lucky: Lucky;
    chinese: Chinese | null;
}

type State =
    | { kind: "closed"; data: FortuneResponse | null }
    | { kind: "cracking"; data: FortuneResponse | null }
    | { kind: "open"; data: FortuneResponse };

function formatDate(date: string | null): string {
    if (!date) return "";
    const [y, m, d] = date.split("-").map(Number);
    const dt = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
    return dt.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
}

export default function Fortune() {
    const [state, setState] = useState<State>({ kind: "closed", data: null });
    const [error, setError] = useState<string | null>(null);

    // One-shot prefetch on mount so the slip is ready the instant the user cracks.
    useEffect(() => {
        let cancelled = false;
        setError(null);
        fetch("/api/fortune")
            .then((r) => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json() as Promise<FortuneResponse>;
            })
            .then((data) => {
                if (cancelled) return;
                setState((s) => (s.kind === "closed" ? { kind: "closed", data } : s));
            })
            .catch((e) => {
                if (!cancelled) setError(`The fortune cookie jar is empty: ${e.message}`);
            });
        return () => { cancelled = true; };
    }, []);

    const crack = () => {
        if (state.kind === "open" || state.kind === "cracking") return;
        setState({ kind: "cracking", data: state.data });
        setTimeout(() => {
            setState((s) => (s.data ? { kind: "open", data: s.data } : { kind: "closed", data: null }));
        }, 700);
    };

    const share = () => {
        if (state.kind !== "open") return;
        const dataUrl = buildShareImage({
            fortune: state.data.message,
            seed: state.data.date,
            lucky: state.data.lucky,
            chinese: state.data.chinese,
        });
        downloadShareImage(dataUrl, state.data.date);
    };

    const data = state.data;

    return (
        <div className="container mx-auto w-full pt-4 overflow-x-hidden pt-18 bg-base-100 rounded-md">
            <Navbar />
            <div className="mockup-window border bg-base-300 !border-neutral dark:border-white rounded-md !overflow-visible">
                <div className="border-t !border-neutral dark:border-white px-4 pt-4 pb-10 rounded-md">
                    <section className="max-w-5xl mx-auto px-2 md:px-6 py-6 md:py-8">
                        {/* Eyebrow */}
                        <div className="text-center mb-8 md:mb-10">
                            <p className="text-xs uppercase tracking-[0.3em] text-primary font-semibold">Fortune</p>
                            <h1 className="text-3xl md:text-4xl font-bold text-base-content mt-2">Crack open today’s.</h1>
                            <p className="text-sm text-base-content/60 mt-2">{formatDate(data?.date ?? null)}</p>
                        </div>

                        {/* Two-column grid: cookie + fortune on the left, lucky + phrase on the right.
                            Stacks on mobile. */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
                            {/* Left column: cookie + the actual fortune text */}
                            <div className="space-y-6 flex flex-col items-center">
                                <CookieScene
                                    isOpen={state.kind === "open"}
                                    isAnimating={state.kind === "cracking"}
                                    onCrack={crack}
                                />

                                <AnimatePresence>
                                    {state.kind === "open" && (
                                        <motion.blockquote
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.5, delay: 0.55 }}
                                            className="text-center text-xl md:text-2xl leading-snug italic text-base-content max-w-md mx-auto px-4"
                                            style={{ fontFamily: '"Iowan Old Style", Georgia, serif' }}
                                        >
                                            <span aria-hidden="true" className="text-primary/60 pr-1">“</span>
                                            {state.data.message}
                                            <span aria-hidden="true" className="text-primary/60 pl-0.5">”</span>
                                        </motion.blockquote>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Right column: stacked lucky + phrase. Stays hidden until crack so the
                                page is visually focused on the cookie until the user interacts. */}
                            <AnimatePresence>
                                {state.kind === "open" && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.5, delay: 0.65 }}
                                        className="space-y-6"
                                    >
                                        <LuckyRow lucky={state.data.lucky} />
                                        <ChinesePhrase chinese={state.data.chinese} />
                                        <div className="flex justify-center pt-1">
                                            <button onClick={share} className="btn btn-primary btn-sm gap-2">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
                                                    <polyline points="7 10 12 15 17 10" strokeLinecap="round" strokeLinejoin="round" />
                                                    <line x1="12" y1="15" x2="12" y2="3" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                                Save share card
                                            </button>
                                        </div>
                                        <p className="text-[11px] text-base-content/40 text-center">
                                            One fortune per day. Come back tomorrow for a new one.
                                        </p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {error && (
                            <p className="text-sm text-error text-center mt-6">{error}</p>
                        )}
                    </section>
                </div>
            </div>
            <Footer />
        </div>
    );
}
