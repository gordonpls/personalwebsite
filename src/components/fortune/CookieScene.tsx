import { motion, AnimatePresence } from "framer-motion";

// Cartoon-style fortune cookie modeled on the user's reference: two smooth
// leaf-shaped halves meeting at the top center, with soft interior highlights
// and only a single subtle fold line per half. On crack, each half swings
// outward around its bottom tip and a paper slip emerges from the gap.
interface CookieSceneProps {
    isOpen: boolean;
    isAnimating: boolean;
    onCrack: () => void;
}

// Left half: a rounded wing curling inward at the top. Outer edge bulges out
// (left side), bottom is rounded, and the inside edge curves AWAY from center
// at the top so the two halves form a soft V-valley where they meet.
const LEFT_HALF = "M -8 -52 Q -28 -56 -48 -38 Q -64 -12 -54 18 Q -42 50 -14 60 Q 2 60 -2 48 Q -10 -10 -8 -52 Z";
const RIGHT_HALF = "M 8 -52 Q 28 -56 48 -38 Q 64 -12 54 18 Q 42 50 14 60 Q -2 60 2 48 Q 10 -10 8 -52 Z";

// Soft inner highlight following each wing's outer curve.
const LEFT_GLOSS = "M -18 -42 Q -38 -28 -46 -6";
const RIGHT_GLOSS = "M 18 -42 Q 38 -28 46 -6";

export const CookieScene = ({ isOpen, isAnimating, onCrack }: CookieSceneProps) => {
    return (
        <div className="relative w-full max-w-[18rem] mx-auto aspect-square select-none">
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
                    <linearGradient id="ckBody" x1="0.2" y1="0" x2="0.7" y2="1">
                        <stop offset="0" stopColor="#F8C97B" />
                        <stop offset="0.55" stopColor="#E8A85B" />
                        <stop offset="1" stopColor="#C97D2A" />
                    </linearGradient>
                    <linearGradient id="slipPaper" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#FFFCEF" />
                        <stop offset="1" stopColor="#F1E8C8" />
                    </linearGradient>
                </defs>

                {/* Left half — pivots around its bottom tip when cracking. */}
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
                    style={{ transformOrigin: "-16px 60px" }}
                >
                    <path d={LEFT_HALF} fill="url(#ckBody)" stroke="#8B5A1A" strokeWidth="3" strokeLinejoin="round" />
                    {/* Inner shadow at the crease to deepen the V valley */}
                    <path d="M -6 -50 Q -8 0 -4 46" stroke="#8B5A1A" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.45" />
                    {/* Soft inner glow following the leaf's curve */}
                    <path d={LEFT_GLOSS} stroke="#FFF1C8" strokeWidth="6" fill="none" strokeLinecap="round" opacity="0.55" />
                    {/* Specular highlight (small) */}
                    <ellipse cx="-28" cy="-28" rx="6" ry="3" fill="#FFF8DA" opacity="0.7" transform="rotate(-30 -28 -28)" />
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
                    style={{ transformOrigin: "16px 60px" }}
                >
                    <path d={RIGHT_HALF} fill="url(#ckBody)" stroke="#8B5A1A" strokeWidth="3" strokeLinejoin="round" />
                    <path d="M 6 -50 Q 8 0 4 46" stroke="#8B5A1A" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.45" />
                    <path d={RIGHT_GLOSS} stroke="#FFF1C8" strokeWidth="6" fill="none" strokeLinecap="round" opacity="0.55" />
                    <ellipse cx="28" cy="-28" rx="6" ry="3" fill="#FFF8DA" opacity="0.7" transform="rotate(30 28 -28)" />
                </motion.g>

                {/* Crumb debris fans out upward on crack. */}
                <AnimatePresence>
                    {isOpen && (
                        <>
                            {[0, 1, 2, 3, 4, 5, 6].map((i) => {
                                const angle = -Math.PI / 2 + ((i - 3) / 6) * Math.PI;
                                const dist = 50 + (i % 3) * 15;
                                return (
                                    <motion.circle
                                        key={i}
                                        cx={Math.cos(angle) * 6}
                                        cy={-55 + Math.sin(angle) * 4}
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

                {/* Paper slip — rendered last so it sits on top of both halves. */}
                <AnimatePresence>
                    {isOpen && (
                        <motion.g
                            initial={{ y: -25, opacity: 0, scaleY: 0.1, rotate: -8 }}
                            animate={{ y: -62, opacity: 1, scaleY: 1, rotate: -10 }}
                            exit={{ y: -25, opacity: 0, scaleY: 0.1 }}
                            transition={{ duration: 0.55, delay: 0.4, ease: "easeOut" }}
                            style={{ transformOrigin: "0 0" }}
                        >
                            <rect
                                x="-32" y="-12" width="64" height="32" rx="2"
                                fill="url(#slipPaper)"
                                stroke="#B49B5C"
                                strokeWidth="1.2"
                            />
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
                        className="absolute -bottom-2 left-0 right-0 text-center text-xs uppercase tracking-[0.3em] text-base-content/70 font-semibold"
                    >
                        Tap to crack
                    </motion.p>
                )}
            </AnimatePresence>
        </div>
    );
};
