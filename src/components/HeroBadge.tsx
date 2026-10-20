// Hero badges with an easter egg: hovering (or tapping / focusing) a badge
// flips its label up to reveal what's behind it, painted in that school's (or
// thing's) colors, while the pill smoothly resizes to fit.

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

export interface Badge {
    label: string;
    reveal: string;
    bg: string;   // revealed pill color
    fg: string;   // revealed text color
}

export const BADGES: Badge[] = [
    { label: "BSCS", reveal: "CU Denver", bg: "#000000", fg: "#CFB87C" },               // CU black & gold
    { label: "MBA", reveal: "Univ. of Northern Colorado", bg: "#013C65", fg: "#F6B000" }, // UNC navy & gold
    { label: "MSF", reveal: "Boston University", bg: "#CC0000", fg: "#FFFFFF" },        // BU scarlet
    { label: "ESTJ-A", reveal: "Assertive Executive", bg: "#4298B4", fg: "#FFFFFF" },   // Sentinel teal
    { label: "Foodie", reveal: "Will travel for 🍜", bg: "#FFF1D6", fg: "#9A4A12" },
];

// Resting look matches the Hero's frosted-glass chips.
const GLASS_BG = "rgba(255,255,255,0.55)";
const GLASS_FG = "#1e293b";

export const HeroBadge = ({ badge }: { badge: Badge }) => {
    const reduce = useReducedMotion();
    const [open, setOpen] = useState(false);
    const text = open ? badge.reveal : badge.label;

    return (
        <motion.li
            layout={!reduce}
            tabIndex={0}
            aria-label={`${badge.label}: ${badge.reveal}`}
            onPointerEnter={(e) => e.pointerType === "mouse" && setOpen(true)}
            onPointerLeave={(e) => e.pointerType === "mouse" && setOpen(false)}
            onClick={() => setOpen((o) => !o)}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            animate={{ backgroundColor: open ? badge.bg : GLASS_BG, color: open ? badge.fg : GLASS_FG }}
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
            style={{ borderRadius: 9999 }}
            className="relative cursor-default select-none overflow-hidden px-3.5 py-1 text-sm font-semibold tracking-wide ring-1 ring-white/70 shadow-sm backdrop-blur-md outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
            {/* The label rolls up and out as the reveal rolls in from below. */}
            <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                    key={text}
                    layout={!reduce ? "position" : false}
                    initial={reduce ? false : { y: "110%", opacity: 0 }}
                    animate={{ y: "0%", opacity: 1 }}
                    exit={reduce ? undefined : { y: "-110%", opacity: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 34 }}
                    className="block whitespace-nowrap"
                    aria-hidden="true"
                >
                    {text}
                </motion.span>
            </AnimatePresence>
        </motion.li>
    );
};
