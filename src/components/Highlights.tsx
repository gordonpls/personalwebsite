import { useEffect, useRef, useState } from "react";
import { useSwipeable } from "react-swipeable";
import { SectionHeading } from "./SectionHeading";

// Short video clips. On md+ they sit in a single row, each auto-looping muted;
// hovering one pauses the others. Below md it collapses to a single stacked
// deck navigated by swipe, the nudging double-caret buttons, or ←/→ keys.
// Click any clip to expand it in a modal with full controls and sound.
// Sources live in src/assets/highlights/ as web-optimized .mp4 (transcoded from
// the phone .MOV originals) each with a matching .jpg poster.

type Clip = { src: string; poster?: string; alt: string };

const vidGlob = import.meta.glob("../assets/highlights/*.mp4", {
    query: "?url",
    import: "default",
    eager: true,
});
const posterGlob = import.meta.glob("../assets/highlights/*.jpg", {
    query: { w: "640", format: "webp" },
    import: "default",
    eager: true,
});

const baseName = (path: string) => (path.split("/").pop() || "").replace(/\.[^.]+$/, "");
const posterByBase = new Map(Object.keys(posterGlob).map((p) => [baseName(p), posterGlob[p] as string]));

const CLIPS: Clip[] = Object.keys(vidGlob)
    .sort()
    .map((path) => ({
        src: vidGlob[path] as string,
        poster: posterByBase.get(baseName(path)),
        alt: baseName(path).replace(/[-_]/g, " "),
    }));

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

function ExpandHint() {
    return (
        <>
            <div className="absolute inset-0 flex items-center justify-center bg-base-content/0 transition-colors duration-300 group-hover:bg-base-content/25">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-7 w-7 scale-75 text-white opacity-0 drop-shadow transition-all duration-300 group-hover:scale-100 group-hover:opacity-100"
                >
                    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                </svg>
            </div>
            {/* Muted indicator — sound comes when expanded. */}
            <span className="absolute bottom-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3.5 w-3.5"
                >
                    <path d="M11 5 6 9H2v6h4l5 4V5Z" />
                    <line x1="22" y1="9" x2="16" y2="15" />
                    <line x1="16" y1="9" x2="22" y2="15" />
                </svg>
            </span>
        </>
    );
}

// Desktop tile: auto-loops muted while on screen and while no *other* tile is
// hovered (hovering one pauses the rest).
function RowTile({
    clip,
    index,
    hovered,
    setHovered,
    onOpen,
}: {
    clip: Clip;
    index: number;
    hovered: number | null;
    setHovered: (updater: (h: number | null) => number | null) => void;
    onOpen: () => void;
}) {
    const ref = useRef<HTMLVideoElement>(null);
    const [inView, setInView] = useState(false);

    useEffect(() => {
        const v = ref.current;
        if (!v) return;
        const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.25 });
        io.observe(v);
        return () => io.disconnect();
    }, []);

    useEffect(() => {
        const v = ref.current;
        if (!v) return;
        if (inView && (hovered === null || hovered === index)) v.play().catch(() => {});
        else v.pause();
    }, [inView, hovered, index]);

    return (
        <button
            type="button"
            onClick={onOpen}
            onMouseEnter={() => setHovered(() => index)}
            onMouseLeave={() => setHovered((h) => (h === index ? null : h))}
            aria-label={`Expand video: ${clip.alt}`}
            className="group relative aspect-[3/4] overflow-hidden rounded-xl border border-base-300 bg-base-300 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
            <video
                ref={ref}
                src={clip.src}
                poster={clip.poster}
                muted
                loop
                playsInline
                preload="metadata"
                tabIndex={-1}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            />
            <ExpandHint />
        </button>
    );
}

// Mobile: a single stacked deck. Front clip auto-loops muted; poster cards peek
// behind for the deck look. Swipe / carets / arrow keys navigate.
function MobileDeck({ onOpen }: { onOpen: (i: number) => void }) {
    const [index, setIndex] = useState(0);
    const ref = useRef<HTMLDivElement>(null);
    const n = CLIPS.length;
    const hasStack = n > 1;

    const go = (d: number) => setIndex((i) => (i + d + n) % n);

    const videoRef = useRef<HTMLVideoElement>(null);
    const [inView, setInView] = useState(false);

    // Track whether the deck is on screen.
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.4 });
        io.observe(el);
        return () => io.disconnect();
    }, []);

    // Auto-play the front clip whenever the deck enters view — covers scrolling
    // it into view and jumping to #highlights from the navbar; pause off-screen.
    useEffect(() => {
        const v = videoRef.current;
        if (!v) return;
        if (inView) v.play().catch(() => {});
        else v.pause();
    }, [inView, index]);

    // Arrow-key navigation only while on screen.
    useEffect(() => {
        if (!hasStack || !inView) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "ArrowLeft") {
                e.preventDefault();
                go(-1);
            } else if (e.key === "ArrowRight") {
                e.preventDefault();
                go(1);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasStack, inView, n]);

    const swipe = useSwipeable({
        onSwipedLeft: () => go(1),
        onSwipedRight: () => go(-1),
        trackTouch: true,
        trackMouse: false,
    });

    const setRef = (el: HTMLDivElement | null) => {
        swipe.ref(el);
        ref.current = el;
    };

    const back1 = CLIPS[(index + 1) % n];
    const back2 = CLIPS[(index + 2) % n];

    return (
        <div className="md:hidden">
            <div className="relative mx-auto w-56">
                <div
                    {...swipe}
                    ref={setRef}
                    className="relative aspect-[3/4] w-full touch-pan-y select-none"
                >
                    {hasStack && (
                        <>
                            <div
                                aria-hidden="true"
                                className="absolute inset-0 translate-x-3 translate-y-3 rotate-6 overflow-hidden rounded-2xl bg-base-100 shadow-lg ring-1 ring-base-300"
                            >
                                <img src={back2.poster} alt="" className="h-full w-full object-cover opacity-70" />
                            </div>
                            <div
                                aria-hidden="true"
                                className="absolute inset-0 translate-x-1.5 translate-y-1.5 rotate-3 overflow-hidden rounded-2xl bg-base-100 shadow-lg ring-1 ring-base-300"
                            >
                                <img src={back1.poster} alt="" className="h-full w-full object-cover opacity-90" />
                            </div>
                        </>
                    )}

                    <button
                        type="button"
                        onClick={() => onOpen(index)}
                        aria-label={`Expand video: ${CLIPS[index].alt}`}
                        className="group absolute inset-0 overflow-hidden rounded-2xl shadow-xl ring-1 ring-base-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                        <video
                            key={index}
                            ref={videoRef}
                            src={CLIPS[index].src}
                            poster={CLIPS[index].poster}
                            muted
                            loop
                            playsInline
                            preload="metadata"
                            tabIndex={-1}
                            className="absolute inset-0 h-full w-full object-cover"
                        />
                    </button>
                </div>

                {hasStack && (
                    <>
                        <button
                            type="button"
                            onClick={() => go(-1)}
                            aria-label="Previous video"
                            className="deck-caret-left absolute -left-7 top-1/2 -translate-y-1/2 rounded text-primary/80 transition-colors hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                            <DoubleCaret direction="left" />
                        </button>
                        <button
                            type="button"
                            onClick={() => go(1)}
                            aria-label="Next video"
                            className="deck-caret-right absolute -right-10 top-1/2 -translate-y-1/2 rounded text-primary/80 transition-colors hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                            <DoubleCaret direction="right" />
                        </button>
                    </>
                )}
            </div>

            {hasStack && (
                <div className="mx-auto mt-7 flex w-56 justify-center gap-1.5">
                    {CLIPS.map((_, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => setIndex(i)}
                            aria-label={`Go to video ${i + 1}`}
                            aria-current={i === index ? "true" : undefined}
                            className={`h-1.5 rounded-full transition-all ${
                                i === index ? "w-5 bg-primary" : "w-1.5 bg-base-content/30 hover:bg-base-content/50"
                            }`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export const Highlights = () => {
    const [active, setActive] = useState<number | null>(null);
    const [hovered, setHovered] = useState<number | null>(null);

    useEffect(() => {
        if (active === null) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setActive(null);
        };
        window.addEventListener("keydown", onKey);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.style.overflow = prevOverflow;
        };
    }, [active]);

    const current = active === null ? null : CLIPS[active];

    return (
        <section className="p-6 md:p-10 bg-base-200 border-2 border-secondary rounded-md">
            <SectionHeading
                eyebrow="Highlights"
                description="some short clips of my adventures"
                className="mb-6 md:mb-8"
            />

            {CLIPS.length === 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="skeleton aspect-[3/4] w-full rounded-xl" />
                    ))}
                </div>
            ) : (
                <>
                    {/* md+: one row of all clips */}
                    <div
                        className="hidden gap-3 md:grid lg:gap-4"
                        style={{ gridTemplateColumns: `repeat(${CLIPS.length}, minmax(0, 1fr))` }}
                    >
                        {CLIPS.map((c, i) => (
                            <RowTile
                                key={c.src}
                                clip={c}
                                index={i}
                                hovered={hovered}
                                setHovered={setHovered}
                                onOpen={() => setActive(i)}
                            />
                        ))}
                    </div>

                    {/* below md: stacked deck */}
                    <MobileDeck onOpen={(i) => setActive(i)} />
                </>
            )}

            {/* Expanded player */}
            {current && (
                <dialog className="modal modal-open">
                    <div className="modal-box h-fit max-h-none w-fit max-w-none overflow-visible bg-transparent p-0 shadow-none">
                        <div className="relative inline-block">
                            <video
                                src={current.src}
                                poster={current.poster}
                                controls
                                autoPlay
                                loop
                                playsInline
                                className="block max-h-[85vh] max-w-[90vw] rounded-lg"
                            />
                            <button
                                type="button"
                                className="btn btn-circle btn-sm absolute right-2 top-2 z-10 border-none bg-base-100/80 shadow hover:bg-base-100"
                                onClick={() => setActive(null)}
                                aria-label="Close"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                    <form method="dialog" className="modal-backdrop">
                        <button onClick={() => setActive(null)}>close</button>
                    </form>
                </dialog>
            )}
        </section>
    );
};
