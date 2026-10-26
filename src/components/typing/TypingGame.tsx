// /typing — Typing Game. Asks for a name once (remembered in localStorage so
// retries and return visits skip the prompt), then hands off to TimedRun:
// 30-second runs, a random word pack each time, and one top-10 board.

import { useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Navbar } from "../Navbar";
import { Footer } from "../Footer";
import { SectionHeading } from "../SectionHeading";
import { TimedRun } from "./TimedRun";

const NAME_KEY = "typing_name";
const MAX_NAME = 16;

function readName(): string {
    try { return localStorage.getItem(NAME_KEY) ?? ""; } catch { return ""; }
}

function writeName(name: string) {
    try { localStorage.setItem(NAME_KEY, name); } catch { /* private mode: name lasts this visit only */ }
}

// "Who's typing?" — a name tag to fill in before the first run.
const NameGate = ({ initial, onDone }: { initial: string; onDone: (name: string) => void }) => {
    const reduce = useReducedMotion();
    const [draft, setDraft] = useState(initial);
    const inputRef = useRef<HTMLInputElement>(null);
    const clean = draft.replace(/\s+/g, " ").trim();

    return (
        <motion.form
            initial={reduce ? false : { opacity: 0, y: 12, rotate: -1.5 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            onSubmit={(e) => { e.preventDefault(); if (clean) onDone(clean); }}
            className="mx-auto w-full max-w-sm overflow-hidden rounded-2xl bg-base-100 shadow-lg ring-1 ring-base-300"
        >
            {/* Conference-style name tag header */}
            <div className="bg-primary px-6 py-4 text-center text-primary-content">
                <p className="text-2xl font-bold tracking-wide">HELLO</p>
                <p className="text-sm opacity-90">my name is</p>
            </div>
            <div className="space-y-4 px-6 py-6">
                <input
                    ref={inputRef}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value.slice(0, MAX_NAME))}
                    aria-label="Your name for the leaderboard"
                    placeholder="your name"
                    autoFocus
                    autoComplete="nickname"
                    maxLength={MAX_NAME}
                    className="w-full border-b-2 border-dashed border-base-content/30 bg-transparent pb-1 text-center font-mono text-2xl text-base-content outline-none transition-colors placeholder:text-base-content/60 focus:border-primary"
                />
                <p className="text-center text-xs text-base-content/60">
                    Shown on the leaderboard. Remembered on this device.
                </p>
                <button type="submit" disabled={!clean} className="btn btn-primary btn-block">
                    Let's type <kbd className="kbd kbd-xs text-base-content">↵</kbd>
                </button>
            </div>
        </motion.form>
    );
};

export default function TypingGame() {
    const [name, setName] = useState(readName);
    const [editing, setEditing] = useState(() => !readName());

    return (
        <div className="container mx-auto w-full pt-4 overflow-x-clip bg-base-100 rounded-md">
            <div className="mockup-window border bg-base-300 !border-neutral dark:border-white rounded-md !overflow-visible !pt-0 before:!hidden">
                <Navbar embedded />
                <div className="px-4 pt-6 pb-16 space-y-10">
                    <SectionHeading
                        className="mx-auto max-w-3xl"
                        eyebrow="Typing Game"
                        title="How fast are your fingers?"
                        description="30 seconds, a random word pack, same rules for everyone. The clock starts on your first keystroke. Make the top 10 and your name goes on the board."
                    />

                    {editing ? (
                        <NameGate
                            initial={name}
                            onDone={(n) => { setName(n); writeName(n); setEditing(false); }}
                        />
                    ) : (
                        <TimedRun name={name} onChangeName={() => setEditing(true)} />
                    )}
                </div>
            </div>
            <Footer />
        </div>
    );
}
