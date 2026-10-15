// Themed word packs for timed runs. The word lists live with the server
// (server/data/typing-words.json), which deals each scored run; the browser
// only uses them directly to deal an unscored run when the server is offline.
// Lowercase, no punctuation, so every pack plays at the same difficulty and
// scores stay comparable on one leaderboard.

import WORDS from "../../../server/data/typing-words.json";

export const PACKS = {
    code: { label: "Code", emoji: "⌨️" },
    finance: { label: "Finance", emoji: "📈" },
    food: { label: "Food", emoji: "🍜" },
} as const;

export type PackId = keyof typeof PACKS;

// Offline fallback, same shape as the server's: never the same word twice in a row.
export function makeRunText(pack: PackId, count = 200): string {
    const pool: string[] = WORDS[pack];
    const out: string[] = [];
    while (out.length < count) {
        const w = pool[Math.floor(Math.random() * pool.length)];
        if (w !== out[out.length - 1]) out.push(w);
    }
    return out.join(" ");
}
