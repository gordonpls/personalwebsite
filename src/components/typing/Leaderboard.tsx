// Top-10 board for one run length. The row you just set glows; rows under your
// name get a quiet tint so you can spot your other runs.

import { motion, useReducedMotion } from "framer-motion";
import { PACKS, type PackId } from "./wordPacks";

export interface ScoreEntry {
    name: string;
    wpm: number;
    accuracy: number;
    pack: PackId;
    at: number;
}

const MEDALS = ["🥇", "🥈", "🥉"];

export const Leaderboard = ({
    seconds,
    active,
    entries,
    you,
    highlightAt,
    status,
}: {
    seconds: number;
    active: boolean;
    entries: ScoreEntry[];
    you: string;
    highlightAt: number | null;
    status: "loading" | "ready" | "offline";
}) => {
    const reduce = useReducedMotion();

    return (
        <section className="w-full min-w-0" aria-labelledby={`board-title-${seconds}`}>
            <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2 id={`board-title-${seconds}`} className="font-semibold text-base-content">
                    Top 10 · {seconds}s runs
                </h2>
                {active && <span className="badge badge-primary badge-sm">playing</span>}
            </div>

            <div className={`overflow-hidden rounded-xl bg-base-100 transition-shadow ${active ? "ring-2 ring-primary/50" : "ring-1 ring-base-300"}`}>
                {status !== "ready" || entries.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-base-content/60">
                        {status === "loading"
                            ? "Fetching the board…"
                            : status === "offline"
                                ? "The leaderboard is napping. Your runs still count here, they just won't be saved."
                                : "Nobody's on this board yet. First run takes the crown 👑"}
                    </p>
                ) : (
                    <ol>
                        {entries.map((e, i) => {
                            const isNew = e.at === highlightAt;
                            const isYou = e.name === you;
                            return (
                                <motion.li
                                    key={e.at}
                                    layout={!reduce}
                                    // A fresh entry slides in from the left, like a name chalked onto the board.
                                    initial={isNew && !reduce ? { opacity: 0, x: -16 } : false}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 24 }}
                                    className={`grid grid-cols-[2.5rem_1fr_auto_auto] items-center gap-3 border-b border-base-200 px-4 py-2.5 text-sm last:border-b-0 ${
                                        isNew ? "bg-primary/10" : isYou ? "bg-base-200/60" : ""
                                    }`}
                                >
                                    <span className="text-center font-mono text-base-content/60">
                                        {MEDALS[i] ?? i + 1}
                                    </span>
                                    <span className="flex min-w-0 items-center gap-2">
                                        <span className={`truncate ${isYou ? "font-semibold text-base-content" : "text-base-content"}`}>
                                            {e.name}
                                        </span>
                                        <span className="hidden text-xs text-base-content/60 sm:inline" title={`${PACKS[e.pack]?.label ?? e.pack} pack`}>
                                            {PACKS[e.pack]?.emoji}
                                        </span>
                                        {isNew && <span className="badge badge-primary badge-sm">new</span>}
                                    </span>
                                    <span className="font-mono text-base-content/60">{e.accuracy}%</span>
                                    <span className="w-16 text-right font-mono font-semibold text-primary">{e.wpm} wpm</span>
                                </motion.li>
                            );
                        })}
                    </ol>
                )}
            </div>
        </section>
    );
};
