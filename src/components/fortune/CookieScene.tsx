import { motion, AnimatePresence } from "framer-motion";

// Cartoon-style fortune cookie matching the classic illustration: two folded
// crescent halves meeting at a knotted seam along the top, each half curving
// down to a pointed tip, with parallel ridge lines suggesting the dough fold.
// On crack the halves swing outward (rotating around their bottom tips, like
// opening a book) and a paper slip emerges from the top gap.
interface CookieSceneProps {
    isOpen: boolean;
    isAnimating: boolean;
    onCrack: () => void;
}

// Left half: from top-center knot, curve out and down to a pointed bottom tip,
// then back up along the inner seam with a slight concave curve.
const LEFT_HALF = "M 0 -50 Q -25 -52 -55 -38 Q -85 -10 -75 25 Q -55 55 -22 60 Q -8 55 -2 40 Q -10 0 0 -50 Z";
const RIGHT_HALF = "M 0 -50 Q 25 -52 55 -38 Q 85 -10 75 25 Q 55 55 22 60 Q 8 55 2 40 Q 10 0 0 -50 Z";

// Ridge lines (the dough texture) running across each half, parallel to the
// fold. Coordinates are in the half's local space before transform.
const LEFT_RIDGES = [
    "M -10 -30 Q -32 -28 -55 -20",
    "M -8  -15 Q -32 -12 -62  -2",
    "M -6   0  Q -32   5 -60  18",
    "M -4  15  Q -28  22 -50  35",
    "M -3  30  Q -22  38 -38  48",
];
const RIGHT_RIDGES = [
    "M 10 -30 Q 32 -28 55 -20",
    "M 8  -15 Q 32 -12 62  -2",
    "M 6   0  Q 32   5 60  18",
    "M 4  15  Q 28  22 50  35",
    "M 3  30  Q 22  38 38  48",
];

export const CookieScene = ({ isOpen, isAnimating, onCrack }: CookieSceneProps) => {
    return (
        <div className="relative w-full max-w-sm mx-auto aspect-square select-none">
            <motion.svg
                viewBox="-100 -100 200 200"
                className={`w-full h-full ${isOpen ? "" : "cursor-pointer"} drop-shadow-xl`}
                onClick={!isOpen && !isAnimating ? onCrack : undefined}
                role={!isOpen ? "button" : undefined}
                aria-label={!isOpen ? "Crack the fortune cookie" : undefined}
                whileHover={!isOpen && !isAnimating ? { scale: 1.03 } : {}}
                animate={!isOpen && !isAnimating ? { rotate: [0, -1.5, 1.5, 0] } : {}}
                transition={!isOpen && !isAnimating ? { repeat: Infinity, repeatDelay: 2.4, duration: 0.6 } : {}}
            >
                <defs>
                    <linearGradient id="ckBodyL" x1="0.2" y1="0" x2="0.6" y2="1">
                        <stop offset="0" stopColor="#F8DA9C" />
                        <stop offset="0.55" stopColor="#E8B662" />
                        <stop offset="1" stopColor="#B5832C" />
                    </linearGradient>
                    <linearGradient id="ckBodyR" x1="0.4" y1="0" x2="0.8" y2="1">
                        <stop offset="0" stopColor="#F8DA9C" />
                        <stop offset="0.55" stopColor="#E8B662" />
                        <stop offset="1" stopColor="#B5832C" />
                    </linearGradient>
                    <linearGradient id="slipPaper" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#FFFCEF" />
                        <stop offset="1" stopColor="#F1E8C8" />
                    </linearGradient>
                </defs>

                {/* Left half — pivots around its bottom tip when cracking,
                    so the top swings outward like opening a book. */}
                <motion.g
                    initial={false}
                    animate={isOpen
                        ? { x: -8, y: 4, rotate: -22 }
                        : isAnimating
                            ? { x: [0, -2, 2, -2, 0], y: [0, -1, 1, -1, 0] }
                            : { x: 0, y: 0, rotate: 0 }
                    }
                    transition={isOpen
                        ? { duration: 0.55, ease: "easeOut" }
                        : { duration: 0.35 }
                    }
                    style={{ transformOrigin: "-22px 60px" }}
                >
                    <path d={LEFT_HALF} fill="url(#ckBodyL)" stroke="#7E541A" strokeWidth="3" strokeLinejoin="round" />
                    {LEFT_RIDGES.map((d, i) => (
                        <path key={i} d={d} fill="none" stroke="#7E541A" strokeWidth="1.8" strokeLinecap="round" opacity="0.55" />
                    ))}
                    {/* upper-left highlight */}
                    <path d="M -55 -25 Q -45 -45 -22 -48" stroke="#FFF1C8" strokeWidth="2.6" fill="none" strokeLinecap="round" opacity="0.8" />
                </motion.g>

                {/* Right half — mirrors. */}
                <motion.g
                    initial={false}
                    animate={isOpen
                        ? { x: 8, y: 4, rotate: 22 }
                        : isAnimating
                            ? { x: [0, 2, -2, 2, 0], y: [0, 1, -1, 1, 0] }
                            : { x: 0, y: 0, rotate: 0 }
                    }
                    transition={isOpen
                        ? { duration: 0.55, ease: "easeOut" }
                        : { duration: 0.35 }
                    }
                    style={{ transformOrigin: "22px 60px" }}
                >
                    <path d={RIGHT_HALF} fill="url(#ckBodyR)" stroke="#7E541A" strokeWidth="3" strokeLinejoin="round" />
                    {RIGHT_RIDGES.map((d, i) => (
                        <path key={i} d={d} fill="none" stroke="#7E541A" strokeWidth="1.8" strokeLinecap="round" opacity="0.55" />
                    ))}
                    {/* highlight on the upper-right */}
                    <path d="M 25 -45 Q 45 -42 58 -25" stroke="#FFF1C8" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.6" />
                </motion.g>

                {/* Top knot/fold detail (visible whenever the halves are closed
                    or near-closed; fades during the crack to suggest it's
                    been broken apart). */}
                <motion.g
                    initial={false}
                    animate={isOpen ? { opacity: 0, scale: 0.6 } : { opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    style={{ transformOrigin: "0 -50px" }}
                >
                    <path
                        d="M -12 -50 Q 0 -64 12 -50 Q 6 -42 0 -45 Q -6 -42 -12 -50 Z"
                        fill="url(#ckBodyL)"
                        stroke="#7E541A"
                        strokeWidth="2.4"
                        strokeLinejoin="round"
                    />
                    <path d="M -6 -52 Q 0 -47 6 -52" stroke="#7E541A" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.65" />
                </motion.g>

                {/* Crumb debris */}
                <AnimatePresence>
                    {isOpen && (
                        <>
                            {[0, 1, 2, 3, 4, 5, 6].map((i) => {
                                const angle = -Math.PI / 2 + ((i - 3) / 6) * Math.PI; // mostly upward fan
                                const dist = 50 + (i % 3) * 15;
                                return (
                                    <motion.circle
                                        key={i}
                                        cx={Math.cos(angle) * 6}
                                        cy={-45 + Math.sin(angle) * 4}
                                        r={1.4 + (i % 3) * 0.7}
                                        fill="#A87929"
                                        initial={{ opacity: 1, x: 0, y: 0 }}
                                        animate={{
                                            opacity: 0,
                                            x: Math.cos(angle) * dist,
                                            y: Math.sin(angle) * dist,
                                        }}
                                        transition={{ duration: 0.9, ease: "easeOut" }}
                                    />
                                );
                            })}
                        </>
                    )}
                </AnimatePresence>

                {/* Paper slip — emerges from the top gap. Rendered last so it
                    stays on top of both halves. Decorative only; the readable
                    fortune sits below the cookie in large serif type. */}
                <AnimatePresence>
                    {isOpen && (
                        <motion.g
                            initial={{ y: -20, opacity: 0, scaleY: 0.1, rotate: -8 }}
                            animate={{ y: -55, opacity: 1, scaleY: 1, rotate: -10 }}
                            exit={{ y: -20, opacity: 0, scaleY: 0.1 }}
                            transition={{ duration: 0.55, delay: 0.4, ease: "easeOut" }}
                            style={{ transformOrigin: "0 0" }}
                        >
                            <rect
                                x="-32" y="-12" width="64" height="32" rx="2"
                                fill="url(#slipPaper)"
                                stroke="#B49B5C"
                                strokeWidth="1.2"
                            />
                            {/* a couple of decorative "ink" lines */}
                            <line x1="-24" y1="-4" x2="24" y2="-4" stroke="#7E541A" strokeWidth="1" strokeLinecap="round" opacity="0.45" />
                            <line x1="-24" y1="2"  x2="16" y2="2"  stroke="#7E541A" strokeWidth="1" strokeLinecap="round" opacity="0.45" />
                            <line x1="-24" y1="8"  x2="20" y2="8"  stroke="#7E541A" strokeWidth="1" strokeLinecap="round" opacity="0.45" />
                        </motion.g>
                    )}
                </AnimatePresence>
            </motion.svg>

            {/* Hint */}
            <AnimatePresence>
                {!isOpen && !isAnimating && (
                    <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="absolute -bottom-2 left-0 right-0 text-center text-xs uppercase tracking-[0.3em] text-base-content/50 font-semibold"
                    >
                        Tap to crack
                    </motion.p>
                )}
            </AnimatePresence>
        </div>
    );
};
