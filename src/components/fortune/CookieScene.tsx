import { motion, AnimatePresence } from "framer-motion";

// One continuous folded fortune cookie modeled on a real one: two puffy
// rounded lobes whose tops curl inward toward each other, a deep V valley
// at the top center, and a pinched fold at the bottom that joins both
// lobes into one object. The right lobe is drawn first and the left lobe
// is drawn on top, so the right one tucks slightly behind the left near
// the center top — the asymmetric overlap that defines the silhouette.
interface CookieSceneProps {
    isOpen: boolean;
    isAnimating: boolean;
    onCrack: () => void;
}

// Right lobe (drawn first). The top point sits a hair to the right of
// center and slightly lower than the left lobe's top — asymmetric.
const RIGHT_LOBE = "M 2 -48 Q 20 -64 42 -56 Q 64 -34 66 -4 Q 62 28 42 50 Q 22 60 4 56 Q -2 48 2 -48 Z";
// Left lobe (drawn on top). Sits slightly higher than the right and
// reaches a touch further so it tucks the right lobe behind it.
const LEFT_LOBE = "M -2 -54 Q -22 -68 -46 -58 Q -68 -34 -68 -2 Q -64 30 -44 52 Q -22 62 -2 58 Q 2 50 -2 -54 Z";
// Pinched bottom fold — the knot that joins the two lobes. Drawn after
// the lobes so it sits cleanly across the seam.
const BOTTOM_FOLD = "M -22 50 Q -10 70 0 64 Q 10 70 22 50 Q 10 56 0 58 Q -10 56 -22 50 Z";
// Curved shadow crease — the fold valley. Dips and rises like a real fold.
const CREASE = "M 0 -48 Q -6 -10 0 30 Q 4 50 8 58";
// Inner-glow curves following each lobe's outer face.
const LEFT_GLOSS = "M -22 -42 Q -42 -22 -50 0";
const RIGHT_GLOSS = "M 18 -40 Q 38 -20 48 2";

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
                    {/* More uniform orange-tan like a real fortune cookie. The
                        light source is upper-left so the gradient mostly stays
                        bright until the lower-right where it tapers darker. */}
                    <radialGradient id="ckBody" cx="0.35" cy="0.3" r="1.0">
                        <stop offset="0" stopColor="#F8CC7A" />
                        <stop offset="0.55" stopColor="#EBA94A" />
                        <stop offset="1" stopColor="#B97623" />
                    </radialGradient>
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
                        ? { x: 8, y: 3, rotate: 22 }
                        : isAnimating
                            ? { x: [0, 2, -2, 2, 0], y: [0, 1, -1, 1, 0] }
                            : { x: 0, y: 0, rotate: 0 }
                    }
                    transition={isOpen
                        ? { duration: 0.6, ease: "easeOut" }
                        : { duration: 0.35 }
                    }
                    style={{ transformOrigin: "10px 58px" }}
                >
                    <path d={RIGHT_LOBE} fill="url(#ckBody)" stroke="#7E4F18" strokeWidth="3" strokeLinejoin="round" />
                    <path d={RIGHT_GLOSS} stroke="#FFF1C8" strokeWidth="6" fill="none" strokeLinecap="round" opacity="0.45" />
                    {/* small specular highlight on the bulging outer face */}
                    <ellipse cx="30" cy="-22" rx="6" ry="3" fill="#FFF8DA" opacity="0.7" transform="rotate(30 30 -22)" />
                </motion.g>

                {/* Left lobe — on top, slightly higher; the right lobe tucks
                    behind it near the center top */}
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
                    style={{ transformOrigin: "-14px 60px" }}
                >
                    <path d={LEFT_LOBE} fill="url(#ckBody)" stroke="#7E4F18" strokeWidth="3" strokeLinejoin="round" />
                    <path d={LEFT_GLOSS} stroke="#FFF1C8" strokeWidth="6" fill="none" strokeLinecap="round" opacity="0.5" />
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

                {/* Pinched bottom fold — the knot that joins the two lobes. */}
                <path d={BOTTOM_FOLD} fill="url(#ckFold)" stroke="#5E3B0F" strokeWidth="2" strokeLinejoin="round" />
                <path d="M -12 56 Q 0 62 12 56" stroke="#FFE3A8" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.55" />

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
