// Themed word packs for timed runs. The word lists live with the server
// (server/data/typing-words.json), which picks a pack at random and deals each
// scored run; the browser only deals a run itself (unscored) when the server
// is offline.
// Lowercase, no punctuation, so every pack plays at the same difficulty and
// scores stay comparable on one leaderboard.

import WORDS from "../../../server/data/typing-words.json";

export const PACKS = {
    code: { label: "Code", emoji: "⌨️" },
    finance: { label: "Finance", emoji: "📈" },
    food: { label: "Food", emoji: "🍜" },
} as const;

export type PackId = keyof typeof PACKS;

export const PACK_IDS = Object.keys(PACKS) as PackId[];
export const randomPack = (): PackId => PACK_IDS[Math.floor(Math.random() * PACK_IDS.length)];

// Every sign line is LINE_MIN-LINE_MAX characters; the sign splits the text
// greedily at LINE_MAX, which reproduces the dealt lines exactly.
export const LINE_MIN = 19;
export const LINE_MAX = 21;
const RUN_LINES = 40;

// Offline fallback, same algorithm as the server's dealText (server/routes/
// typing.js): fixed-length lines from a shuffled deck, no repeats until the
// pack is used up.
export function makeRunText(pack: PackId): string {
    const pool: string[] = WORDS[pack];
    const shuffled = () => {
        const a = [...pool];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    };
    let deck = shuffled();
    const lines: string[] = [];
    while (lines.length < RUN_LINES) {
        if (deck.length < 12) deck = [...deck, ...shuffled().filter((w) => !deck.includes(w))];
        const line: string[] = [];
        let len = 0;
        const fits = (w: string) => {
            const next = len ? len + 1 + w.length : w.length;
            return next <= LINE_MAX && (next >= LINE_MIN || LINE_MAX - next - 1 >= 4);
        };
        while (len < LINE_MIN) {
            const i = deck.findIndex(fits);
            const w = i !== -1 ? deck.splice(i, 1)[0] : pool.find((x) => fits(x) && !line.includes(x));
            if (!w) break;
            line.push(w);
            len = len ? len + 1 + w.length : w.length;
        }
        lines.push(line.join(" "));
    }
    return lines.join(" ");
}
