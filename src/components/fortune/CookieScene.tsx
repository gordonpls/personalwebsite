import { motion, AnimatePresence } from "framer-motion";

// Classic fortune-cookie silhouette: a horizontal eye/lens shape with
// pointed tips on either side and a curl at the seam. Two halves meet
// along a horizontal centerline. On crack: each half rotates and slides
// outward, the slip emerges between them rendered LAST so it stays on top.
// The fortune text below the cookie is the readable copy — the slip itself
// is just a few decorative lines so the visual stays legible at any size.
interface CookieSceneProps {
    isOpen: boolean;
    isAnimating: boolean;
    onCrack: () => void;
}

// Top half path: from left tip, curve up over the top to right tip, then
// back along the seam with a slight droop in the middle for the fold.
const TOP_HALF_PATH = "M -95 0 Q -90 -50 0 -58 Q 90 -50 95 0 Q 70 -2 60 0 Q 0 -7 -60 0 Q -70 -2 -95 0 Z";
// Bottom half: mirrored, with a slight bulge at the seam.
const BOTTOM_HALF_PATH = "M -95 0 Q -90 50 0 58 Q 90 50 95 0 Q 70 2 60 0 Q 0 7 -60 0 Q -70 2 -95 0 Z";

export const CookieScene = ({ isOpen, isAnimating, onCrack }: CookieSceneProps) => {
    return (
        <div className="relative w-full max-w-md mx-auto aspect-square select-none">
            <motion.svg
                viewBox="-130 -130 260 260"
                className={`w-full h-full ${isOpen ? "" : "cursor-pointer"} drop-shadow-xl`}
                onClick={!isOpen && !isAnimating ? onCrack : undefined}
                role={!isOpen ? "button" : undefined}
                aria-label={!isOpen ? "Crack the fortune cookie" : undefined}
                whileHover={!isOpen && !isAnimating ? { scale: 1.03 } : {}}
                animate={!isOpen && !isAnimating ? { rotate: [0, -1.5, 1.5, 0] } : {}}
                transition={!isOpen && !isAnimating ? { repeat: Infinity, repeatDelay: 2.4, duration: 0.6 } : {}}
            >
                <defs>
                    <linearGradient id="cookieGoldTop" x1="0.2" y1="0" x2="0.6" y2="1">
                        <stop offset="0" stopColor="#F4D08A" />
                        <stop offset="0.55" stopColor="#D89A3C" />
                        <stop offset="1" stopColor="#8C5C1C" />
                    </linearGradient>
                    <linearGradient id="cookieGoldBottom" x1="0.4" y1="0" x2="0.8" y2="1">
                        <stop offset="0" stopColor="#8C5C1C" />
                        <stop offset="0.45" stopColor="#D89A3C" />
                        <stop offset="1" stopColor="#F4D08A" />
                    </linearGradient>
                    <linearGradient id="slipPaper" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#fffdf6" />
                        <stop offset="1" stopColor="#f0ead7" />
                    </linearGradient>
                </defs>

                {/* Top half */}
                <motion.g
                    initial={false}
                    animate={isOpen
                        ? { x: -32, y: -28, rotate: -22 }
                        : isAnimating
                            ? { x: [0, -2.5, 2.5, -2, 0], y: [0, -1, 1, -1, 0] }
                            : { x: 0, y: 0, rotate: 0 }
                    }
                    transition={isOpen
                        ? { duration: 0.55, ease: "easeOut" }
                        : { duration: 0.35 }
                    }
                    style={{ transformOrigin: "center" }}
                >
                    <path d={TOP_HALF_PATH} fill="url(#cookieGoldTop)" stroke="#5e3d0f" strokeWidth="1.4" strokeLinejoin="round" />
                    {/* upper-left highlight */}
                    <path d="M -60 -42 Q -25 -55 10 -52" stroke="#ffe6b0" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.75" />
                    {/* faint crease detail near the seam */}
                    <path d="M -50 -8 Q 0 -12 50 -8" stroke="#7a5520" strokeWidth="0.8" fill="none" opacity="0.4" />
                </motion.g>

                {/* Bottom half */}
                <motion.g
                    initial={false}
                    animate={isOpen
                        ? { x: 32, y: 28, rotate: 22 }
                        : isAnimating
                            ? { x: [0, 2.5, -2.5, 2, 0], y: [0, 1, -1, 1, 0] }
                            : { x: 0, y: 0, rotate: 0 }
                    }
                    transition={isOpen
                        ? { duration: 0.55, ease: "easeOut" }
                        : { duration: 0.35 }
                    }
                    style={{ transformOrigin: "center" }}
                >
                    <path d={BOTTOM_HALF_PATH} fill="url(#cookieGoldBottom)" stroke="#5e3d0f" strokeWidth="1.4" strokeLinejoin="round" />
                    {/* lower curl shading */}
                    <path d="M -55 35 Q 0 50 55 35" stroke="#7a5520" strokeWidth="1.2" fill="none" opacity="0.5" />
                </motion.g>

                {/* Particle debris */}
                <AnimatePresence>
                    {isOpen && (
                        <>
                            {[0, 1, 2, 3, 4, 5].map((i) => {
                                const angle = (i / 6) * Math.PI * 2;
                                const dist = 95 + (i % 2) * 18;
                                return (
                                    <motion.circle
                                        key={i}
                                        cx={Math.cos(angle) * 10}
                                        cy={Math.sin(angle) * 10}
                                        r={1.6 + (i % 3) * 0.7}
                                        fill="#a8741f"
                                        initial={{ opacity: 1, x: 0, y: 0 }}
                                        animate={{
                                            opacity: 0,
                                            x: Math.cos(angle) * dist,
                                            y: Math.sin(angle) * dist,
                                        }}
                                        transition={{ duration: 0.85, ease: "easeOut" }}
                                    />
                                );
                            })}
                        </>
                    )}
                </AnimatePresence>

                {/* Paper slip — rendered LAST so it stays on top of both halves.
                    Decorative only (the actual fortune copy is below the scene
                    in big readable type). A few horizontal lines suggest text. */}
                <AnimatePresence>
                    {isOpen && (
                        <motion.g
                            initial={{ y: 8, opacity: 0, scaleY: 0.2, scaleX: 0.6 }}
                            animate={{ y: 0, opacity: 1, scaleY: 1, scaleX: 1 }}
                            exit={{ y: 8, opacity: 0, scaleY: 0.2 }}
                            transition={{ duration: 0.55, delay: 0.35, ease: "easeOut" }}
                            style={{ transformOrigin: "center" }}
                        >
                            <rect
                                x="-72" y="-16" width="144" height="32" rx="3"
                                fill="url(#slipPaper)"
                                stroke="#c9b88a" strokeWidth="0.7"
                            />
                            {/* decorative "text" lines */}
                            <line x1="-58" y1="-7" x2="58" y2="-7" stroke="#8a6b3a" strokeWidth="1.1" strokeLinecap="round" opacity="0.55" />
                            <line x1="-58" y1="0"  x2="42" y2="0"  stroke="#8a6b3a" strokeWidth="1.1" strokeLinecap="round" opacity="0.55" />
                            <line x1="-58" y1="7"  x2="48" y2="7"  stroke="#8a6b3a" strokeWidth="1.1" strokeLinecap="round" opacity="0.55" />
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
