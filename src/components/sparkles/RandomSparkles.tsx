// Sparkles: every click makes a sparkle appear right where you clicked, and
// every finished scroll makes one appear on the right edge, at the height
// matching how far down the page you are (like a scrollbar thumb). Two variants built on the Hero avatar's four-point star (twinkle:
// the avatar's diamond; float: stars drifting up), each randomly rotated,
// mirrored and sized, with every star its own randomly generated color.
// Skipped entirely under prefers-reduced-motion.

import { useEffect, useState, type CSSProperties } from "react";
import "./sparkles.css";

const KINDS = ["twinkle", "float"] as const;
type Kind = (typeof KINDS)[number];
const DURATION: Record<Kind, number> = { twinkle: 1700, float: 2100 }; // last star's delay + its animation
const SCROLL_MIN_PX = 400;     // a scroll gesture must travel this far to count
const SCROLL_IDLE_MS = 180;    // scroll is "finished" after this long with no movement

interface Fx { id: number; kind: Kind; x: number; y: number; colors: string[]; orient: string }

// Random orientation per cluster so repeats never look identical: a twinkle
// takes any rotation (which also changes the direction its stars pop in) and
// a mirror on either axis; a float only tilts and mirrors sideways, so it
// still drifts up. Both vary a little in size.
const randomOrient = (kind: Kind) => {
    const r = (a: number, b: number) => a + Math.random() * (b - a);
    const rot = kind === "float" ? r(-30, 30) : r(0, 360);
    const flipX = Math.random() < 0.5 ? -1 : 1;
    const flipY = kind === "float" ? 1 : Math.random() < 0.5 ? -1 : 1;
    const size = r(0.85, 1.2);
    return `rotate(${rot.toFixed(0)}deg) scale(${(flipX * size).toFixed(2)}, ${(flipY * size).toFixed(2)})`;
};

const pick = <T,>(arr: readonly T[]) => arr[Math.floor(Math.random() * arr.length)];

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
const randomColor = () => {
    const r = (a: number, b: number) => a + Math.random() * (b - a);
    const light = document.documentElement.getAttribute("data-theme") !== "business";
    let roll = Math.random();
    const mood = MOODS.find((m) => (roll -= m.weight[light ? 1 : 0]) < 0) ?? MOODS[0];
    return `oklch(${r(mood.l[0], mood.l[1]).toFixed(1)}% ${r(mood.c[0], mood.c[1]).toFixed(3)} ${r(0, 360).toFixed(0)})`;
};

const Star = ({ className, style }: { className: string; style: CSSProperties }) => (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`sparkle-star ${className}`} style={style}>
        <path fill="currentColor" d="M12 0C12.9 6.6 17.4 11.1 24 12 17.4 12.9 12.9 17.4 12 24 11.1 17.4 6.6 12.9 0 12 6.6 11.1 11.1 6.6 12 0Z" />
    </svg>
);

const v = (o: Record<string, string | number>) => o as CSSProperties;

// Twinkle mirrors the avatar layout: a big centre star, four small satellites.
const TWINKLE = [
    { x: 0, y: 0, s: 44, d: 0 },
    { x: 0, y: -40, s: 20, d: 0.15 },
    { x: 40, y: 0, s: 20, d: 0.3 },
    { x: 0, y: 40, s: 14, d: 0.45 },
    { x: -40, y: 0, s: 14, d: 0.6 },
];

const Effect = ({ fx }: { fx: Fx }) => {
    return (
        <div className="sparkle-fx" style={{ left: fx.x, top: fx.y }}>
            <div className="sparkle-fx" style={{ transform: fx.orient }}>
                {fx.kind === "twinkle" &&
                    TWINKLE.map((p, i) => (
                        <Star key={i} className="sparkle-twinkle" style={v({ left: p.x, top: p.y, "--s": `${p.s}px`, "--c": fx.colors[i], animationDelay: `${p.d}s` })} />
                    ))}
                {fx.kind === "float" &&
                    // Small stars drift upward from a loose row, swaying as they go.
                    [-50, -25, 0, 25, 50].map((x, i) => (
                        <Star key={i} className="sparkle-float" style={v({
                            left: x, top: (i % 2) * 14, "--s": i % 2 ? "14px" : "20px", "--c": fx.colors[i],
                            "--sway": `${i % 2 ? -14 : 14}px`, animationDelay: `${i * 0.12}s`,
                        })} />
                    ))}
            </div>
        </div>
    );
};

type Pt = { x: number; y: number };

export const RandomSparkles = () => {
    const [effects, setEffects] = useState<Fx[]>([]);

    useEffect(() => {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        let nextId = 0;

        const timers: number[] = [];
        const later = (fn: () => void, ms: number) => { timers.push(window.setTimeout(fn, ms)); };

        const trigger = (anchor: Pt) => {
            const kind = pick(KINDS);
            const fx: Fx = { id: nextId++, kind, x: anchor.x, y: anchor.y, colors: Array.from({ length: 5 }, randomColor), orient: randomOrient(kind) };
            setEffects((cur) => [...cur, fx]);
            later(() => setEffects((cur) => cur.filter((f) => f.id !== fx.id)), DURATION[kind]);
        };

        const onClick = (e: MouseEvent) => {
            // The sparkle lands exactly where the click happened. Keyboard
            // "clicks" (Enter/Space) have no pointer position (detail 0), so
            // those fall back to the focused element's centre.
            if (e.detail > 0) return trigger({ x: e.clientX, y: e.clientY });
            const el = e.target as Element | null;
            if (!el?.getBoundingClientRect) return;
            const r = el.getBoundingClientRect();
            if (!r.width || !r.height) return; // e.g. a script clicking a hidden download link
            trigger({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
        };

        // Scroll sparkles hug the right edge, at the height of a scrollbar
        // thumb for the current scroll position (top of page → top of screen).
        const scrollAnchor = (): Pt => {
            const max = document.documentElement.scrollHeight - window.innerHeight;
            const progress = max > 0 ? window.scrollY / max : 0;
            const pad = 70; // keep the whole twinkle on screen
            return { x: window.innerWidth - 48, y: pad + progress * (window.innerHeight - pad * 2) };
        };

        // Scroll counts once per gesture: when scrolling settles, if it
        // travelled far enough since it started.
        let scrollStartY: number | null = null;
        let idle = 0;
        const onScroll = () => {
            if (scrollStartY === null) scrollStartY = window.scrollY;
            window.clearTimeout(idle);
            idle = window.setTimeout(() => {
                const dy = window.scrollY - (scrollStartY ?? window.scrollY);
                scrollStartY = null;
                if (Math.abs(dy) >= SCROLL_MIN_PX) trigger(scrollAnchor());
            }, SCROLL_IDLE_MS);
        };

        // Capture phase so clicks that stop propagation still count.
        document.addEventListener("click", onClick, true);
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => {
            document.removeEventListener("click", onClick, true);
            window.removeEventListener("scroll", onScroll);
            window.clearTimeout(idle);
            timers.forEach((t) => window.clearTimeout(t));
        };
    }, []);

    if (!effects.length) return null;
    return (
        <div className="sparkle-layer" aria-hidden="true">
            {effects.map((fx) => <Effect key={fx.id} fx={fx} />)}
        </div>
    );
};
