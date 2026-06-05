import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useSwipeable } from "react-swipeable";
import avatar2 from "../assets/avatar2.webp";

// About Me photos. The existing portrait is always first; any images dropped
// into src/assets/about/ are appended (optimized to ~800px webp at build time).
//
// Layout is responsive:
//  - lg and up: a vertical column of static portraits (the original design),
//    filling the sticky right rail beside the prose.
//  - below lg (where the rail stacks on top of the text): a swipeable deck —
//    navigate by swipe, the pulsing double-caret buttons, or ←/→ when in view.

type Photo = { src: string; alt: string };

const extra = import.meta.glob("../assets/about/*.{jpg,jpeg,png,webp}", {
    query: { w: "800", format: "webp" },
    import: "default",
    eager: true,
});

const PHOTOS: Photo[] = [
    { src: avatar2, alt: "Portrait of Gordon Zhong" },
    ...Object.keys(extra)
        .sort()
        .map((path) => ({
            src: extra[path] as string,
            alt:
                "Gordon " +
                (path.split("/").pop() || "").replace(/\.[^.]+$/, "").replace(/[-_]/g, " "),
        })),
];

// Offset tint block behind each column photo — varied corner + color per photo
// so the column reads as a deliberate, lively set rather than a repeat. (Full
// literal class strings so Tailwind's scanner keeps them.)
const TINTS = [
    "-bottom-3 -right-3 bg-primary/20",
    "-top-3 -left-3 bg-secondary/25",
    "-bottom-3 -left-3 bg-accent/20",
    "-top-3 -right-3 bg-info/20",
    "-top-3 -right-3 bg-success/20",
    "-bottom-3 -left-3 bg-warning/20",
];

const slide = {
    enter: (dir: number) => ({ x: dir > 0 ? 120 : -120, opacity: 0, scale: 0.96 }),
    center: { x: 0, opacity: 1, scale: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -120 : 120, opacity: 0, scale: 0.96 }),
};

function DoubleCaret({ direction }: { direction: "left" | "right" }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`h-4 w-4 ${direction === "right" ? "rotate-180" : ""}`}
        >
            <path d="M18 6 12 12 18 18" />
            <path d="M12 6 6 12 12 18" />
        </svg>
    );
}

export function PhotoDeck() {
    const [index, setIndex] = useState(0);
    const [dir, setDir] = useState(0);
    const ref = useRef<HTMLDivElement>(null);
    const count = PHOTOS.length;
    const hasStack = count > 1;

    const go = (d: number) => {
        setDir(d);
        setIndex((i) => (i + d + count) % count);
    };
    const jumpTo = (i: number) => {
        setDir(i > index ? 1 : -1);
        setIndex(i);
    };

    // Arrow-key navigation, but only while the deck is actually on screen (it's
    // display:none at lg, so this naturally disables on the desktop column).
    useEffect(() => {
        const el = ref.current;
        if (!el || !hasStack) return;
        let inView = false;
        const io = new IntersectionObserver(([e]) => (inView = e.isIntersecting), {
            threshold: 0.4,
        });
        io.observe(el);
        const onKey = (e: KeyboardEvent) => {
            if (!inView) return;
            if (e.key === "ArrowLeft") {
                e.preventDefault();
                go(-1);
            } else if (e.key === "ArrowRight") {
                e.preventDefault();
                go(1);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => {
            io.disconnect();
            window.removeEventListener("keydown", onKey);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasStack, count]);

    const swipe = useSwipeable({
        onSwipedLeft: () => go(1),
        onSwipedRight: () => go(-1),
        trackTouch: true,
        trackMouse: false,
    });

    if (count === 0) return null;

    const back1 = PHOTOS[(index + 1) % count];
    const back2 = PHOTOS[(index + 2) % count];

    return (
        <>
            {/* ── lg and up: vertical column of static portraits (original design) ── */}
            <div className="hidden lg:flex lg:flex-col lg:gap-12">
                {PHOTOS.map((p, i) => (
                    <div key={i} className="relative h-72 w-72">
                        <div
                            aria-hidden="true"
                            className={`absolute h-24 w-24 rounded-2xl ${TINTS[i % TINTS.length]}`}
                        />
                        <img
                            src={p.src}
                            alt={p.alt}
                            loading={i === 0 ? undefined : "lazy"}
                            className="relative h-full w-full rounded-2xl object-cover shadow-xl ring-1 ring-base-300"
                        />
                    </div>
                ))}
            </div>

            {/* ── below lg: swipeable stacked deck ── */}
            {/* w-44 box is centered; carets are absolutely placed OUTSIDE it and
                vertically centered on the front card; dots sit below, clearing
                the deck's bottom-right overhang. */}
            <div className="lg:hidden">
                <div className="relative mx-auto w-44">
                    <div
                        {...swipe}
                        ref={ref}
                        role="group"
                        aria-roledescription="carousel"
                        aria-label="Travel photos"
                        className="relative aspect-square w-full touch-pan-y select-none"
                    >
                        {/* Stacked cards peeking behind the front — the visible "deck". */}
                        {hasStack && (
                            <>
                                <div
                                    aria-hidden="true"
                                    className="absolute inset-0 translate-x-3 translate-y-3 rotate-6 overflow-hidden rounded-2xl bg-base-100 shadow-lg ring-1 ring-base-300"
                                >
                                    <img src={back2.src} alt="" className="h-full w-full object-cover opacity-70" />
                                </div>
                                <div
                                    aria-hidden="true"
                                    className="absolute inset-0 translate-x-1.5 translate-y-1.5 rotate-3 overflow-hidden rounded-2xl bg-base-100 shadow-lg ring-1 ring-base-300"
                                >
                                    <img src={back1.src} alt="" className="h-full w-full object-cover opacity-90" />
                                </div>
                            </>
                        )}

                        {/* Front card (animated on navigation). */}
                        <div className="absolute inset-0 overflow-hidden rounded-2xl shadow-xl ring-1 ring-base-300">
                            <AnimatePresence custom={dir} initial={false} mode="popLayout">
                                <motion.img
                                    key={index}
                                    src={PHOTOS[index].src}
                                    alt={PHOTOS[index].alt}
                                    custom={dir}
                                    variants={slide}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    transition={{ duration: 0.32, ease: "easeOut" }}
                                    draggable={false}
                                    className="absolute inset-0 h-full w-full object-cover"
                                />
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Carets outside the photo, vertically centered on the front
                        card. The right one is pushed out an extra notch so it
                        clears the deck's rightward overhang and reads balanced
                        against the left. Each gently nudges in its direction. */}
                    {hasStack && (
                        <>
                            <button
                                type="button"
                                onClick={() => go(-1)}
                                aria-label="Previous photo"
                                className="deck-caret-left absolute -left-7 top-1/2 -translate-y-1/2 rounded text-primary/80 transition-colors hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            >
                                <DoubleCaret direction="left" />
                            </button>
                            <button
                                type="button"
                                onClick={() => go(1)}
                                aria-label="Next photo"
                                className="deck-caret-right absolute -right-10 top-1/2 -translate-y-1/2 rounded text-primary/80 transition-colors hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            >
                                <DoubleCaret direction="right" />
                            </button>
                        </>
                    )}
                </div>

                {/* Position dots — extra top margin clears the stack's overhang. */}
                {hasStack && (
                    <div className="mx-auto mt-7 flex w-44 justify-center gap-1.5">
                        {PHOTOS.map((_, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => jumpTo(i)}
                                aria-label={`Go to photo ${i + 1}`}
                                aria-current={i === index ? "true" : undefined}
                                className={`h-1.5 rounded-full transition-all ${
                                    i === index
                                        ? "w-5 bg-primary"
                                        : "w-1.5 bg-base-content/30 hover:bg-base-content/50"
                                }`}
                            />
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
