// Sparkles: while you scroll, a steady trail of small four-point stars (the
// Hero avatar's star) rides the scrollbar thumb on the right edge, with a
// mirror-image twin on the left edge at the same height. Each star is randomly
// rotated, sized and colored. Skipped entirely under prefers-reduced-motion.
//
// Built to stay cheap during long/rapid scrolls (e.g. mashing navbar links):
// one star per emission (not a cluster), no CSS filters on trail stars (each
// filter costs an offscreen render pass per frame), and page metrics cached
// instead of read from layout on every emission.

import { memo, useEffect, useState, type CSSProperties } from "react";
import "./sparkles.css";

const SCROLL_EMIT_MS = 55;     // while scrolling, a star on each side per this interval
const LIFETIME_MS = 1150;      // the twinkle animation (1.1s) plus a little slack

interface Fx { id: number; x: number; y: number; color: string; size: number; rot: number; mirror: boolean }

// A fresh color per star: any hue, in one of three moods so the mix has both
// stars that pop and quieter ones. OKLCH keeps each mood's brightness even
// across hues (no muddy yellows or glaring blues).
// Weights are [dark, light]: pastels nearly vanish on the light theme, so
// they're rarer there, with the difference going to the deeper jewel tones.
const MOODS = [
    { weight: [0.5, 0.55], l: [70, 82], c: [0.17, 0.24] },  // vivid: the eye-catchers
    { weight: [0.3, 0.1], l: [86, 94], c: [0.04, 0.1] },    // pastel: soft and subtle
    { weight: [0.2, 0.35], l: [56, 66], c: [0.14, 0.2] },   // jewel: deep, reads on light pages
];
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const randomColor = () => {
    const light = document.documentElement.getAttribute("data-theme") !== "business";
    let roll = Math.random();
    const mood = MOODS.find((m) => (roll -= m.weight[light ? 1 : 0]) < 0) ?? MOODS[0];
    return `oklch(${rand(mood.l[0], mood.l[1]).toFixed(1)}% ${rand(mood.c[0], mood.c[1]).toFixed(3)} ${rand(0, 360).toFixed(0)})`;
};

// Memoized: each fx object never changes, so existing stars skip
// re-rendering whenever a new one is added.
const Star = memo(({ fx }: { fx: Fx }) => (
    <div className="sparkle-fx" style={{ left: fx.x, top: fx.y, transform: `${fx.mirror ? "scale(-1, 1) " : ""}rotate(${fx.rot}deg)` }}>
        <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="sparkle-star sparkle-trail sparkle-twinkle"
            style={{ "--s": `${fx.size}px`, "--c": fx.color } as CSSProperties}
        >
            <path fill="currentColor" d="M12 0C12.9 6.6 17.4 11.1 24 12 17.4 12.9 12.9 17.4 12 24 11.1 17.4 6.6 12.9 0 12 6.6 11.1 11.1 6.6 12 0Z" />
        </svg>
    </div>
));

export const RandomSparkles = () => {
    const [stars, setStars] = useState<Fx[]>([]);

    useEffect(() => {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        let nextId = 0;
        const timers: number[] = [];

        // Page metrics, refreshed only when the page or viewport resizes.
        const doc = document.documentElement;
        let pageH = doc.scrollHeight, viewW = doc.clientWidth, viewH = window.innerHeight;
        const measure = () => { pageH = doc.scrollHeight; viewW = doc.clientWidth; viewH = window.innerHeight; };
        const ro = new ResizeObserver(measure);
        ro.observe(doc);
        window.addEventListener("resize", measure);

        // The centre of the scrollbar thumb.
        const thumbY = () => {
            const max = pageH - viewH;
            const progress = max > 0 ? Math.min(1, window.scrollY / max) : 0;
            const thumbH = Math.max(40, (viewH * viewH) / pageH);
            return progress * (viewH - thumbH) + thumbH / 2;
        };

        // While scrolling, emit every SCROLL_EMIT_MS (throttled, not per scroll
        // event): one star just inside the right edge, jittered a little, and
        // its mirror image on the left edge.
        let lastEmit = 0;
        const onScroll = () => {
            const now = performance.now();
            if (now - lastEmit < SCROLL_EMIT_MS) return;
            lastEmit = now;
            const inset = 12 + rand(-3, 3);
            const right: Fx = {
                id: nextId++, x: viewW - inset, y: thumbY() + rand(-12, 12),
                color: randomColor(), size: Math.round(rand(9, 15)), rot: Math.round(rand(0, 90)), mirror: false,
            };
            const left: Fx = { ...right, id: nextId++, x: inset, mirror: true };
            setStars((cur) => [...cur, right, left]);
            timers.push(window.setTimeout(() => setStars((cur) => cur.filter((s) => s.id !== right.id && s.id !== left.id)), LIFETIME_MS));
        };

        window.addEventListener("scroll", onScroll, { passive: true });
        return () => {
            window.removeEventListener("scroll", onScroll);
            window.removeEventListener("resize", measure);
            ro.disconnect();
            timers.forEach((t) => window.clearTimeout(t));
        };
    }, []);

    if (!stars.length) return null;
    return (
        <div className="sparkle-layer" aria-hidden="true">
            {stars.map((fx) => <Star key={fx.id} fx={fx} />)}
        </div>
    );
};
