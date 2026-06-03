import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { PROJECTS, ProjectCard } from "./Projects";

// Three prototypes for the carousel rework. Each renders the same PROJECTS
// array using the existing ProjectCard. The page is a side-by-side
// comparison so we can pick one and ship it.

// ── Option 1 ─────────────────────────────────────────────────────────────────
// Auto-scroll same as today, but cards are wider and the viewport is capped
// at max-w-4xl. On any screen only ~1 card is fully visible at a time with
// slivers of its neighbors, so duplicates are always off-frame.
const Option1 = () => {
    const [paused, setPaused] = useState(false);
    const items = [...PROJECTS, ...PROJECTS];
    return (
        <div className="relative max-w-4xl mx-auto">
            <div className="overflow-hidden rounded-2xl project-carousel-fade">
                <div
                    data-paused={paused}
                    className="flex gap-6 project-carousel-track py-1"
                    onMouseEnter={() => setPaused(true)}
                    onMouseLeave={() => setPaused(false)}
                >
                    {items.map((p, i) => (
                        <div key={`${p.title}-${i}`} className="flex-shrink-0 w-[28rem] transition-transform duration-300 hover:scale-[1.02] hover:z-10 relative">
                            <ProjectCard p={p} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// ── Option 2 ─────────────────────────────────────────────────────────────────
// Fade slideshow. One card at a time, fades in/out every 5s. Pause on hover.
// Tiny pager dots at the bottom for orientation.
const Option2 = () => {
    const [index, setIndex] = useState(0);
    const [paused, setPaused] = useState(false);

    useEffect(() => {
        if (paused) return;
        const t = setInterval(() => setIndex((i) => (i + 1) % PROJECTS.length), 5000);
        return () => clearInterval(t);
    }, [paused]);

    return (
        <div className="max-w-2xl mx-auto">
            <div
                className="relative min-h-[28rem]"
                onMouseEnter={() => setPaused(true)}
                onMouseLeave={() => setPaused(false)}
            >
                <AnimatePresence mode="wait">
                    <motion.div
                        key={PROJECTS[index].title}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.4 }}
                    >
                        <ProjectCard p={PROJECTS[index]} />
                    </motion.div>
                </AnimatePresence>
            </div>
            <div className="flex justify-center gap-2 mt-4">
                {PROJECTS.map((_, i) => (
                    <button
                        key={i}
                        type="button"
                        onClick={() => setIndex(i)}
                        aria-label={`Show project ${i + 1}`}
                        className={`h-2 rounded-full transition-all ${i === index ? "w-8 bg-primary" : "w-2 bg-base-content/30 hover:bg-base-content/60"}`}
                    />
                ))}
            </div>
        </div>
    );
};

// ── Option 3 ─────────────────────────────────────────────────────────────────
// Coverflow / 3D stack. The current card sits center-front; the previous and
// next cards are rotated and scaled to recede into space. Auto-rotates every
// 4s; click a side card to jump to it. Hover pauses.
const Option3 = () => {
    const [index, setIndex] = useState(0);
    const [paused, setPaused] = useState(false);
    const n = PROJECTS.length;

    useEffect(() => {
        if (paused) return;
        const t = setInterval(() => setIndex((i) => (i + 1) % n), 4000);
        return () => clearInterval(t);
    }, [paused, n]);

    const prevIdx = (index - 1 + n) % n;
    const nextIdx = (index + 1) % n;

    const slots: { card: typeof PROJECTS[0]; offset: number; idx: number }[] = [
        { card: PROJECTS[prevIdx], offset: -1, idx: prevIdx },
        { card: PROJECTS[index], offset: 0, idx: index },
        { card: PROJECTS[nextIdx], offset: 1, idx: nextIdx },
    ];

    return (
        <div
            className="relative max-w-5xl mx-auto h-[30rem] flex items-center justify-center"
            style={{ perspective: "1400px" }}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
        >
            {slots.map(({ card, offset, idx }) => {
                const isCenter = offset === 0;
                return (
                    <motion.div
                        key={card.title}
                        layoutId={`cf-${card.title}`}
                        animate={{
                            x: offset * 320,
                            scale: isCenter ? 1 : 0.78,
                            rotateY: offset * -22,
                            zIndex: isCenter ? 30 : 10,
                            opacity: isCenter ? 1 : 0.65,
                        }}
                        transition={{ duration: 0.55, ease: "easeOut" }}
                        onClick={() => !isCenter && setIndex(idx)}
                        className={`absolute w-[26rem] ${isCenter ? "" : "cursor-pointer"}`}
                        style={{ transformStyle: "preserve-3d", transformOrigin: "center" }}
                    >
                        <ProjectCard p={card} />
                    </motion.div>
                );
            })}
        </div>
    );
};

const Caption = ({ n, title, blurb }: { n: number; title: string; blurb: string }) => (
    <div className="text-center mb-6 mt-12">
        <p className="text-xs uppercase tracking-[0.3em] text-primary font-semibold">Option {n}</p>
        <h2 className="text-2xl md:text-3xl font-bold text-base-content mt-2">{title}</h2>
        <p className="text-sm text-base-content/70 mt-2 max-w-xl mx-auto">{blurb}</p>
    </div>
);

export default function CarouselPreviews() {
    return (
        <div className="container mx-auto w-full pt-4 overflow-x-hidden pt-18 bg-base-100 rounded-md">
            <Navbar />
            <div className="mockup-window border bg-base-300 !border-neutral dark:border-white rounded-md !overflow-visible">
                <div className="border-t !border-neutral dark:border-white px-4 pt-4 pb-12 rounded-md">
                    <section className="max-w-6xl mx-auto px-2 md:px-6 py-6 md:py-8 space-y-12">
                        {/* Header */}
                        <div className="text-center">
                            <p className="text-xs uppercase tracking-[0.3em] text-primary font-semibold">Carousel preview</p>
                            <h1 className="text-3xl md:text-4xl font-bold text-base-content mt-2">Pick a vibe.</h1>
                            <p className="text-base-content/70 mt-3 max-w-xl mx-auto">
                                Three takes on the projects carousel rendered with real cards. Hover any of them to interact.
                                When you've decided, tell me the number and I'll ship it as the live version.
                            </p>
                            <Link to="/#projects" className="link link-primary text-sm mt-3 inline-block">← back to the live projects section</Link>
                        </div>

                        <Caption
                            n={1}
                            title="Wider cards + capped viewport"
                            blurb="Same auto-scroll mechanic, but cards are 28rem and the row caps at max-w-4xl. Only one card is fully on-screen at a time, with slivers of its neighbors at the edges. Soft edge-fade. Pause on hover."
                        />
                        <Option1 />

                        <Caption
                            n={2}
                            title="Fade slideshow"
                            blurb="One card at a time, fades in/out every 5s. Pause on hover. Pager dots at the bottom for orientation. The quietest option; no duplicates ever appear."
                        />
                        <Option2 />

                        <Caption
                            n={3}
                            title="Coverflow / 3D stack"
                            blurb="The current card is center-front; the previous and next recede behind it with perspective and rotation. Auto-rotates every 4s; click a side card to jump to it. Hover pauses."
                        />
                        <Option3 />
                    </section>
                </div>
            </div>
            <Footer />
        </div>
    );
}
