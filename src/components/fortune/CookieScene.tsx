import { motion, AnimatePresence } from "framer-motion";

// One continuous folded fortune cookie. The two lobes are joined at the
// bottom by a pinched fold (rendered as a fixed connector element) so the
// whole thing reads as a single object even when the lobes rotate open on
// crack. The right lobe is drawn first and the left lobe is drawn on top,
// so the left flap tucks the right one slightly behind it near the center
// — the asymmetric overlap that defines the silhouette. The crease in the
// middle is a curved shadow line, not a vertical cut.
interface CookieSceneProps {
    isOpen: boolean;
    isAnimating: boolean;
    onCrack: () => void;
}

// Right lobe (drawn first; left lobe overlaps it near the center top).
// Slightly lower top + shorter outer reach gives the asymmetry.
const RIGHT_LOBE = "M 4 -50 Q 28 -56 50 -36 Q 66 -8 56 22 Q 42 50 14 56 Q -2 56 -4 44 Q 8 0 4 -50 Z";
// Left lobe sits on top, slightly taller and reaches a touch further out
// so the right lobe disappears behind it near the upper center.
const LEFT_LOBE = "M -2 -54 Q -28 -58 -52 -38 Q -68 -8 -58 24 Q -44 52 -14 58 Q 4 56 0 42 Q -8 0 -2 -54 Z";
// Pinched fold at the bottom that visually joins the two lobes — this is the
// "knot" of the cookie and never animates; it stays put while the lobes rotate.
const BOTTOM_FOLD = "M -16 50 Q -4 64 0 60 Q 4 64 16 50 Q 6 54 0 55 Q -6 54 -16 50 Z";
// Curved shadow line inside the cookie suggesting the fold/valley. Not a
// straight cut — it dips and rises like a real fold.
const CREASE = "M -2 -45 Q -10 -10 -2 30 Q 0 44 4 52";
// Soft inner-glow curves following each lobe's outer face.
const LEFT_GLOSS = "M -22 -40 Q -40 -22 -50 0";
const RIGHT_GLOSS = "M 18 -38 Q 36 -20 46 0";

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
                        <stop offset="0" stopColor="#F8CB7C" />
                        <stop offset="0.5" stopColor="#E5A24B" />
                        <stop offset="1" stopColor="#B97623" />
                    </linearGradient>
                    <linearGradient id="ckFold" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#A66B1F" />
                        <stop offset="1" stopColor="#7B4D14" />
                    </linearGradient>
                    <linearGradient id="slipPaper" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#FFFCEF" />
                        <stop offset="1" stopColor="#F1E8C8" />
                    </linearGradient>
                </defs>

                {/* Right lobe — drawn first so the left can tuck it behind */}
                <motion.g
                    initial={false}
                    animate={isOpen
                        ? { x: 8, y: 3, rotate: 20 }
                        : isAnimating
                            ? { x: [0, 2, -2, 2, 0], y: [0, 1, -1, 1, 0] }
                            : { x: 0, y: 0, rotate: 0 }
                    }
                    transition={isOpen
                        ? { duration: 0.6, ease: "easeOut" }
                        : { duration: 0.35 }
                    }
                    style={{ transformOrigin: "8px 56px" }}
                >
                    <path d={RIGHT_LOBE} fill="url(#ckBody)" stroke="#7E4F18" strokeWidth="3" strokeLinejoin="round" />
                    <path d={RIGHT_GLOSS} stroke="#FFF1C8" strokeWidth="6" fill="none" strokeLinecap="round" opacity="0.55" />
                    <ellipse cx="30" cy="-26" rx="6" ry="3" fill="#FFF8DA" opacity="0.7" transform="rotate(30 30 -26)" />
                </motion.g>

                {/* Left lobe — drawn on top, sits slightly higher; the right
                    lobe tucks behind it near the center top */}
                <motion.g
                    initial={false}
                    animate={isOpen
                        ? { x: -8, y: 3, rotate: -22 }
                        : isAnimating
                            ? { x: [0, -2, 2, -2, 0], y: [0, -1, 1, -1, 0] }
                            : { x: 0, y: 0, rotate: 0 }
                    }
                    transition={isOpen
                        ? { duration: 0.6, ease: "easeOut" }
                        : { duration: 0.35 }
                    }
                    style={{ transformOrigin: "-14px 58px" }}
                >
                    <path d={LEFT_LOBE} fill="url(#ckBody)" stroke="#7E4F18" strokeWidth="3" strokeLinejoin="round" />
                    <path d={LEFT_GLOSS} stroke="#FFF1C8" strokeWidth="6" fill="none" strokeLinecap="round" opacity="0.55" />
                    <ellipse cx="-26" cy="-26" rx="6" ry="3" fill="#FFF8DA" opacity="0.7" transform="rotate(-30 -26 -26)" />
                </motion.g>

                {/* Curved shadow crease — the fold valley. Fades on open. */}
                <motion.path
                    d={CREASE}
                    fill="none"
                    stroke="#5E3B0F"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    opacity="0.55"
                    initial={false}
                    animate={{ opacity: isOpen ? 0 : 0.55 }}
                    transition={{ duration: 0.3 }}
                />

                {/* Pinched bottom fold — the knot that joins the two lobes.
                    Stays in place when the lobes rotate so the cookie still
                    reads as a single continuous object. */}
                <path d={BOTTOM_FOLD} fill="url(#ckFold)" stroke="#5E3B0F" strokeWidth="2" strokeLinejoin="round" />
                {/* Highlight pinch line across the knot */}
                <path d="M -10 56 Q 0 60 10 56" stroke="#FFE3A8" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.6" />

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
                                        cy={-50 + Math.sin(angle) * 4}
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

                {/* Paper slip — rendered last so it sits on top of everything. */}
                <AnimatePresence>
                    {isOpen && (
                        <motion.g
                            initial={{ y: -22, opacity: 0, scaleY: 0.1, rotate: -8 }}
                            animate={{ y: -58, opacity: 1, scaleY: 1, rotate: -10 }}
                            exit={{ y: -22, opacity: 0, scaleY: 0.1 }}
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
