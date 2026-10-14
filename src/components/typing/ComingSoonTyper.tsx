// The "coming soon" sign *is* the game: the phrase sits in ghost letters and
// the visitor types over it. Correct letters ink in, a wrong one shakes the
// line, and finishing shows WPM before serving the next teaser phrase.
// A real (visually hidden) <input> captures keys so mobile keyboards, paste,
// IME and screen readers all work.

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useTypingSession } from "./useTypingSession";

const PHRASES = [
    "coming soon",
    "warming up the keys",
    "fingers on the home row",
    "the quick brown fox is stretching",
];

export const ComingSoonTyper = () => {
    const reduce = useReducedMotion();
    const inputRef = useRef<HTMLInputElement>(null);
    const [phraseIdx, setPhraseIdx] = useState(0);
    const [focused, setFocused] = useState(false);
    const s = useTypingSession(PHRASES[0]);

    const next = () => {
        const i = (phraseIdx + 1) % PHRASES.length;
        setPhraseIdx(i);
        s.reset(PHRASES[i]);
        inputRef.current?.focus();
    };

    // Enter (or space, once finished) moves on to the next phrase.
    useEffect(() => {
        if (!s.done) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); next(); }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    });

    const caretAt = s.typed.length;
    const hint = s.done ? null : !focused ? "Click here and start typing" : s.typed ? null : "Go on, type it ↓";

    return (
        <div className="flex flex-col items-center gap-6">
            <div
                className="relative w-full max-w-3xl cursor-text rounded-2xl bg-base-100 px-6 py-10 shadow-sm ring-1 ring-base-300 transition-shadow duration-300 focus-within:ring-2 focus-within:ring-primary/50 focus-within:shadow-lg md:py-14"
                onClick={() => inputRef.current?.focus()}
            >
                <input
                    ref={inputRef}
                    value={s.typed}
                    onChange={(e) => s.input(e.target.value)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    aria-label={`Type the phrase: ${s.target}`}
                    autoFocus
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    className="absolute inset-0 h-full w-full cursor-text opacity-0"
                />

                {/* The phrase. Shakes sideways on every new mistake. */}
                <motion.p
                    key={`${s.target}-${s.mistakes}`}
                    animate={s.mistakes && !reduce ? { x: [0, -7, 6, -4, 2, 0] } : undefined}
                    transition={{ duration: 0.35 }}
                    className="pointer-events-none select-none text-center font-mono text-3xl font-bold leading-relaxed tracking-tight md:text-5xl"
                    aria-hidden="true"
                >
                    {[...s.target].map((ch, i) => {
                        const st = s.statuses[i];
                        return (
                            <motion.span
                                key={i}
                                className={`relative inline-block whitespace-pre transition-colors duration-150 ${
                                    st === "correct" ? "text-primary" : st === "wrong" ? "rounded-sm bg-error/15 text-error" : "text-base-content/60"
                                }`}
                                // Finishing ripples a little wave through the letters.
                                animate={s.done && !reduce ? { y: [0, -10, 0] } : { y: 0 }}
                                transition={s.done ? { duration: 0.45, delay: i * 0.03, ease: "easeOut" } : { duration: 0.1 }}
                            >
                                {/* Caret glides between letters via a shared layoutId. */}
                                {i === caretAt && !s.done && (
                                    <motion.span
                                        layoutId="typer-caret"
                                        transition={{ type: "spring", stiffness: 700, damping: 40 }}
                                        className={`absolute -left-[2px] top-[12%] h-[76%] w-[3px] rounded-full bg-primary ${s.typed ? "" : "typer-caret-idle"}`}
                                    />
                                )}
                                {ch}
                            </motion.span>
                        );
                    })}
                </motion.p>

                <p className="pointer-events-none mt-6 h-5 text-center text-sm text-base-content/60" aria-live="polite">
                    {s.done ? (
                        <span className="font-medium text-base-content">
                            <span className="text-primary">{s.wpm} wpm</span> · {s.accuracy}% accuracy
                        </span>
                    ) : (
                        hint
                    )}
                </p>
            </div>

            {s.done && (
                <motion.button
                    type="button"
                    initial={reduce ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={next}
                    className="btn btn-primary btn-sm gap-2"
                >
                    Another one <kbd className="kbd kbd-xs">↵</kbd>
                </motion.button>
            )}
        </div>
    );
};
