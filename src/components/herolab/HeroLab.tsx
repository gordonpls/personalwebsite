// /hero-lab: side-by-side rough previews of greeting + name effects for the
// Hero redesign. Throwaway exploration page (unlinked); the winner gets
// rebuilt properly inside Hero.

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Navbar } from "../Navbar";
import { Footer } from "../Footer";
import { SectionHeading } from "../SectionHeading";
import "./herolab.css";

const GREETINGS = ["Hello, my name is", "你好，我的名字是"];
const NAME = "Gordon Zhong";
const NAME_ZH = "钟"; // placeholder: swap in the real Chinese name

// Flips between the two greetings every `ms`.
const useAlternate = (ms = 3200) => {
    const [i, setI] = useState(0);
    useEffect(() => {
        const t = window.setInterval(() => setI((n) => (n + 1) % GREETINGS.length), ms);
        return () => window.clearInterval(t);
    }, [ms]);
    return GREETINGS[i];
};

// Sky panel the previews sit on (stand-in for the Vanta clouds).
const Card = ({ n, title, blurb, children }: { n: number; title: string; blurb: string; children: ReactNode }) => (
    <li className="flex flex-col overflow-hidden rounded-2xl bg-base-100 shadow-sm ring-1 ring-base-300">
        <div className="lab-sky flex min-h-56 flex-col items-center justify-center gap-3 px-4 py-8 text-center">{children}</div>
        <div className="p-4">
            <h3 className="font-semibold text-base-content">
                <span className="mr-2 font-mono text-primary">{String(n).padStart(2, "0")}</span>
                {title}
            </h3>
            <p className="mt-1 text-sm text-base-content/70">{blurb}</p>
        </div>
    </li>
);

const PlainName = () => <h2 className="text-4xl md:text-5xl font-bold text-white drop-shadow-lg">{NAME}</h2>;

// ─── 1. Split-flap ───────────────────────────────────────────────────────────
const SplitFlap = () => {
    const text = useAlternate();
    const len = Math.max(...GREETINGS.map((g) => [...g].length));
    const cells = [...text.padEnd(len, " ")].slice(0, len);
    return (
        <div className="flex flex-wrap justify-center gap-[3px]" aria-label={text}>
            {cells.map((ch, i) => (
                <span key={i} className="lab-flap-cell" aria-hidden="true">
                    <AnimatePresence initial={false} mode="popLayout">
                        <motion.span
                            key={ch + text}
                            initial={{ rotateX: -90, opacity: 0.4 }}
                            animate={{ rotateX: 0, opacity: 1 }}
                            exit={{ rotateX: 90, opacity: 0 }}
                            transition={{ duration: 0.22, delay: i * 0.035, ease: "easeOut" }}
                            className="lab-flap-face"
                        >
                            {ch === " " ? " " : ch}
                        </motion.span>
                    </AnimatePresence>
                </span>
            ))}
        </div>
    );
};

// ─── 2. Scramble decode ──────────────────────────────────────────────────────
const GLYPHS = "ABCDEFGHJKLMNPQRSTUVWXYZ#%&*+<>?你好我的名字是天云风光";
const Scramble = () => {
    const text = useAlternate();
    const [shown, setShown] = useState(text);
    useEffect(() => {
        const target = [...text];
        let frame = 0;
        const t = window.setInterval(() => {
            frame++;
            setShown(target.map((ch, i) => (ch === " " || frame > 6 + i * 1.5 ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)])).join(""));
            if (frame > 8 + target.length * 1.5) window.clearInterval(t);
        }, 40);
        return () => window.clearInterval(t);
    }, [text]);
    return <p className="font-mono text-xl md:text-2xl font-bold text-white drop-shadow" aria-label={text}>{shown}</p>;
};

// ─── 3. Vertical roll ────────────────────────────────────────────────────────
const Roll = () => {
    const text = useAlternate();
    return (
        <div className="relative h-[1.5em] overflow-hidden text-xl md:text-3xl font-bold text-white drop-shadow">
            <AnimatePresence initial={false} mode="popLayout">
                <motion.p
                    key={text}
                    initial={{ y: "100%", opacity: 0 }}
                    animate={{ y: "0%", opacity: 1 }}
                    exit={{ y: "-100%", opacity: 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 26 }}
                    className="whitespace-nowrap"
                >
                    {text}
                </motion.p>
            </AnimatePresence>
        </div>
    );
};

// ─── 4. Ink brush ────────────────────────────────────────────────────────────
// Rough stand-in for stroke-by-stroke: each character is wiped in with a soft
// brush-edged mask, in a brush font (Ma Shan Zheng / Caveat).
const Ink = () => {
    const text = useAlternate(3800);
    const zh = /[一-鿿]/.test(text);
    return (
        <p key={text} className={`lab-ink text-3xl md:text-4xl text-slate-800 ${zh ? "lab-ink-zh" : "lab-ink-en"}`} aria-label={text}>
            {[...text].map((ch, i) => (
                <span key={i} aria-hidden="true" style={{ animationDelay: `${i * (zh ? 0.16 : 0.06)}s` }}>
                    {ch === " " ? " " : ch}
                </span>
            ))}
        </p>
    );
};

// ─── 5–8. Name treatments ────────────────────────────────────────────────────
const CloudName = () => <h2 className="lab-cloud-name text-6xl md:text-7xl font-black">{NAME}</h2>;
const SunlitName = () => <h2 className="lab-sunlit-name text-5xl md:text-6xl font-bold">{NAME}</h2>;

const BilingualName = () => (
    <div className="group relative grid place-items-center">
        <span className="lab-watermark pointer-events-none absolute select-none text-[9rem] font-black leading-none" aria-hidden="true">
            {NAME_ZH}
        </span>
        <h2 className="relative text-4xl md:text-5xl font-bold text-white drop-shadow-lg transition-opacity duration-300 group-hover:opacity-0">{NAME}</h2>
        <h2 className="absolute text-5xl font-bold text-white drop-shadow-lg opacity-0 transition-opacity duration-300 group-hover:opacity-100" aria-hidden="true">
            {NAME_ZH}
        </h2>
    </div>
);

// Each letter's weight rises as the cursor nears it (Inter variable 200–900).
const WeightName = () => {
    const ref = useRef<HTMLHeadingElement>(null);
    const letters = useMemo(() => [...NAME], []);
    const [weights, setWeights] = useState<number[]>(() => letters.map(() => 300));
    const onMove = (e: React.PointerEvent) => {
        const spans = ref.current?.querySelectorAll("span");
        if (!spans) return;
        setWeights([...spans].map((s) => {
            const r = s.getBoundingClientRect();
            const d = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
            return Math.round(900 - Math.min(1, d / 220) * 700);
        }));
    };
    return (
        <div className="w-full py-6" onPointerMove={onMove} onPointerLeave={() => setWeights(letters.map(() => 300))}>
            <h2 ref={ref} className="lab-weight-name text-5xl md:text-6xl text-white drop-shadow-lg" aria-label={NAME}>
                {letters.map((ch, i) => (
                    <span key={i} aria-hidden="true" style={{ fontVariationSettings: `"wght" ${weights[i]}` }}>
                        {ch === " " ? " " : ch}
                    </span>
                ))}
            </h2>
        </div>
    );
};

// Brush + variable fonts are only needed here, so load them with the page.
const useLabFonts = () => {
    useEffect(() => {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://fonts.googleapis.com/css2?family=Caveat:wght@600&family=Ma+Shan+Zheng&family=Inter:wght@200..900&display=swap";
        document.head.appendChild(link);
        return () => link.remove();
    }, []);
};

export default function HeroLab() {
    useLabFonts();
    return (
        <div className="container mx-auto w-full pt-4 overflow-x-clip bg-base-100 rounded-md">
            <div className="mockup-window border bg-base-300 !border-neutral dark:border-white rounded-md !overflow-visible !pt-0 before:!hidden">
                <Navbar embedded />
                <div className="px-4 pt-6 pb-16 space-y-8">
                    <SectionHeading
                        eyebrow="Hero lab"
                        title="Greeting & name effects"
                        description="Rough previews to compare. 1–4 are greeting effects (switching English ↔ 中文); 5–8 are name treatments. Hover 7 and move over 8."
                    />
                    <ul className="grid gap-5 md:grid-cols-2">
                        <Card n={1} title="Split-flap board" blurb="Each character flips like a departures board when the language switches.">
                            <SplitFlap /><PlainName />
                        </Card>
                        <Card n={2} title="Scramble decode" blurb="Characters cycle through random Latin + Chinese glyphs, then lock in.">
                            <Scramble /><PlainName />
                        </Card>
                        <Card n={3} title="Vertical roll" blurb="The greeting rolls up like an odometer; calm and clean.">
                            <Roll /><PlainName />
                        </Card>
                        <Card n={4} title="Ink brush" blurb="Characters are brushed in with a soft edge, in a calligraphy face (stand-in for true stroke order).">
                            <Ink /><PlainName />
                        </Card>
                        <Card n={5} title="Cloud cut-out" blurb="The name is a window onto drifting sky and clouds.">
                            <CloudName />
                        </Card>
                        <Card n={6} title="Sunlit sweep" blurb="A slow band of sunlight glints across the name every few seconds.">
                            <SunlitName />
                        </Card>
                        <Card n={7} title="Bilingual name" blurb="Chinese name as a faint watermark; hover to swap it in.">
                            <BilingualName />
                        </Card>
                        <Card n={8} title="Variable weight" blurb="Letters thicken as your cursor approaches.">
                            <WeightName />
                        </Card>
                    </ul>
                </div>
            </div>
            <Footer />
        </div>
    );
}
