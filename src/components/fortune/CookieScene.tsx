import { motion, AnimatePresence } from "framer-motion";

// The visual centerpiece. Two cookie halves drawn as gradient-filled paths
// share a seam. On crack, each half rotates + translates outward while a
// paper slip slides up from the gap. Everything is SVG so it scales cleanly
// on any device and theme.
interface CookieSceneProps {
    isOpen: boolean;
    isAnimating: boolean;
    onCrack: () => void;
    fortune?: string | null;
}

export const CookieScene = ({ isOpen, isAnimating, onCrack, fortune }: CookieSceneProps) => {
    return (
        <div className="relative w-full max-w-md mx-auto aspect-square select-none">
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
                    <linearGradient id="cookieGold" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#F0C97A" />
                        <stop offset="0.5" stopColor="#D89A3C" />
                        <stop offset="1" stopColor="#9B6822" />
                    </linearGradient>
                    <linearGradient id="cookieGoldBottom" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#9B6822" />
                        <stop offset="0.5" stopColor="#D89A3C" />
                        <stop offset="1" stopColor="#F0C97A" />
                    </linearGradient>
                    <radialGradient id="slipShade" cx="50%" cy="0%" r="70%">
                        <stop offset="0" stopColor="#fffdf6" />
                        <stop offset="1" stopColor="#f0ead7" />
                    </radialGradient>
                </defs>

                {/* Paper slip — emerges from between the halves */}
                <AnimatePresence>
                    {isOpen && (
                        <motion.g
                            initial={{ y: 10, opacity: 0, scaleY: 0.1 }}
                            animate={{ y: -20, opacity: 1, scaleY: 1 }}
                            exit={{ y: 10, opacity: 0, scaleY: 0.1 }}
                            transition={{ duration: 0.55, delay: 0.35, ease: "easeOut" }}
                            style={{ transformOrigin: "0 0" }}
                        >
                            <rect
                                x="-70" y="-15" width="140" height="50" rx="4"
                                fill="url(#slipShade)"
                                stroke="#c9b88a" strokeWidth="0.6"
                            />
                            <foreignObject x="-65" y="-12" width="130" height="44">
                                <div
                                    style={{
                                        fontFamily: '"Iowan Old Style", Georgia, serif',
                                        fontSize: "7px",
                                        lineHeight: 1.25,
                                        color: "#3a2a18",
                                        height: "100%",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        textAlign: "center",
                                        padding: "0 4px",
                                    }}
                                >
                                    {fortune ?? "…"}
                                </div>
                            </foreignObject>
                        </motion.g>
                    )}
                </AnimatePresence>

                {/* Top half */}
                <motion.g
                    initial={false}
                    animate={isOpen
                        ? { x: -22, y: -10, rotate: -28 }
                        : isAnimating
                            ? { x: [0, -2, 2, -2, 0], y: [0, -1, 1, -1, 0] }
                            : { x: 0, y: 0, rotate: 0 }
                    }
                    transition={isOpen
                        ? { duration: 0.5, ease: "easeOut" }
                        : { duration: 0.35 }
                    }
                    style={{ transformOrigin: "0 0" }}
                >
                    <path
                        d="M -75 0 Q -75 -85 0 -85 Q 75 -85 75 0 L 65 0 Q 0 -8 -65 0 Z"
                        fill="url(#cookieGold)"
                        stroke="#6e4814"
                        strokeWidth="1.2"
                    />
                    {/* surface highlight */}
                    <path
                        d="M -55 -60 Q -25 -78 5 -75"
                        stroke="#ffe3a8"
                        strokeWidth="2"
                        fill="none"
                        strokeLinecap="round"
                        opacity="0.7"
                    />
                </motion.g>

                {/* Bottom half */}
                <motion.g
                    initial={false}
                    animate={isOpen
                        ? { x: 22, y: 14, rotate: 28 }
                        : isAnimating
                            ? { x: [0, 2, -2, 2, 0], y: [0, 1, -1, 1, 0] }
                            : { x: 0, y: 0, rotate: 0 }
                    }
                    transition={isOpen
                        ? { duration: 0.5, ease: "easeOut" }
                        : { duration: 0.35 }
                    }
                    style={{ transformOrigin: "0 0" }}
                >
                    <path
                        d="M -75 0 Q -75 85 0 85 Q 75 85 75 0 L 65 0 Q 0 8 -65 0 Z"
                        fill="url(#cookieGoldBottom)"
                        stroke="#6e4814"
                        strokeWidth="1.2"
                    />
                    {/* lower highlight */}
                    <path
                        d="M -50 55 Q 0 72 50 55"
                        stroke="#7a5520"
                        strokeWidth="1.2"
                        fill="none"
                        opacity="0.5"
                    />
                </motion.g>

                {/* Particle debris on crack */}
                <AnimatePresence>
                    {isOpen && (
                        <>
                            {[0, 1, 2, 3, 4, 5].map((i) => {
                                const angle = (i / 6) * Math.PI * 2;
                                const dist = 70 + (i % 2) * 10;
                                return (
                                    <motion.circle
                                        key={i}
                                        cx={Math.cos(angle) * 20}
                                        cy={Math.sin(angle) * 20}
                                        r={1.5 + (i % 3) * 0.6}
                                        fill="#a8741f"
                                        initial={{ opacity: 1, x: 0, y: 0 }}
                                        animate={{
                                            opacity: 0,
                                            x: Math.cos(angle) * dist,
                                            y: Math.sin(angle) * dist,
                                        }}
                                        transition={{ duration: 0.8, ease: "easeOut" }}
                                    />
                                );
                            })}
                        </>
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
