// Tiny deterministic RNG so every visitor on the same calendar day gets the
// same fortune, the same lucky numbers, the same lucky color and element.
// Encourages return visits (the fortune is the same all day) without needing
// any persistent storage. Seed = "YYYY-MM-DD" in UTC.

function hashSeed(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
        h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
        h = (h << 13) | (h >>> 19);
    }
    return h >>> 0;
}

// mulberry32: small, fast, decent quality for this use.
function mulberry32(seedInt) {
    let s = seedInt >>> 0;
    return function rand() {
        s = (s + 0x6d2b79f5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function dailySeed(date = new Date()) {
    // YYYY-MM-DD in UTC. Everyone on the same calendar day → same seed.
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, "0");
    const d = String(date.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

const LUCKY_COLORS = [
    { name: "Vermillion", hex: "#E0556B" },
    { name: "Gold leaf",  hex: "#E8A020" },
    { name: "Jade",       hex: "#1D9E75" },
    { name: "Lapis",      hex: "#378ADD" },
    { name: "Amethyst",   hex: "#7F77DD" },
    { name: "Saffron",    hex: "#D85A30" },
    { name: "Bamboo",     hex: "#56CC5A" },
    { name: "Cinnabar",   hex: "#B91C1C" },
    { name: "Indigo",     hex: "#3F3FBD" },
    { name: "Rose quartz", hex: "#E0556B" },
    { name: "Sea-foam",   hex: "#5AA9C9" },
    { name: "Ochre",      hex: "#9C8B3E" },
];

// Chinese five-element cycle (Wu Xing). Each element has an associated color
// in tradition, but we let the lucky-color slot vary independently above.
const ELEMENTS = [
    { name: "Wood",  glyph: "木" },
    { name: "Fire",  glyph: "火" },
    { name: "Earth", glyph: "土" },
    { name: "Metal", glyph: "金" },
    { name: "Water", glyph: "水" },
];

// Powerball-style draw: 5 unique from 1–69 plus 1 from 1–26.
function pickLuckyNumbers(rand) {
    const pool = new Set();
    while (pool.size < 5) pool.add(1 + Math.floor(rand() * 69));
    const powerball = 1 + Math.floor(rand() * 26);
    return { numbers: [...pool].sort((a, b) => a - b), powerball };
}

function buildLuckyForSeed(seedStr) {
    const rand = mulberry32(hashSeed(seedStr));
    return {
        ...pickLuckyNumbers(rand),
        color: LUCKY_COLORS[Math.floor(rand() * LUCKY_COLORS.length)],
        element: ELEMENTS[Math.floor(rand() * ELEMENTS.length)],
    };
}

function pickFromArray(arr, seedStr) {
    if (!arr || !arr.length) return null;
    const rand = mulberry32(hashSeed(seedStr));
    return arr[Math.floor(rand() * arr.length)];
}

module.exports = {
    hashSeed,
    mulberry32,
    dailySeed,
    buildLuckyForSeed,
    pickFromArray,
};
