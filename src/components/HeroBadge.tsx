// Hero badges with an easter egg: the badge itself stays as-is, but hovering
// (or tapping / focusing) it floats a frosted card up above it: the school
// logo (white background blended away) plus what the degree acronym stands
// for, a personality-type readout, or a slot machine that spins through gallery photos.

import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import cuDenverLogo from "../assets/badge-hover-photos/cudenver.webp";
import uncoLogo from "../assets/badge-hover-photos/unco.png";
import buLogo from "../assets/badge-hover-photos/bu-cropped.png";

// Shared card body: a fixed-size media box with a two-line caption under it,
// so every popover has the same footprint whatever its logo's shape.
const Caption = ({ children }: { children: ReactNode }) => (
    <p className="mt-3 flex min-h-[2.5rem] w-44 items-center justify-center text-balance text-center text-xs font-semibold leading-snug text-slate-800">{children}</p>
);

// School logo with the degree spelled out beneath it. Logos are fit inside
// the same box (stacked, wide, or boxed alike) and centered in it.
const Degree = ({ src, school, name }: { src: string; school: string; name: string }) => (
    <div className="flex flex-col items-center">
        <div className="flex h-16 w-44 items-center justify-center">
            <img src={src} alt={school} className="max-h-full max-w-full object-contain mix-blend-multiply" />
        </div>
        <Caption>{name}</Caption>
    </div>
);

// Foodie: a one-reel slot machine. The reel is a strip of random gallery
// photos that spins down, blurring as it goes, and lands on the last one with
// a small overshoot. A fresh spin (and photo) every time the card opens.
// Gallery data is imported on demand so it stays out of the home bundle.
const REEL_LEN = 12;
const CELL_H = 112; // px; matches h-28
const FoodSlot = () => {
    const reduce = useReducedMotion();
    const [reel, setReel] = useState<{ id: string; srcset: string; alt: string }[] | null>(null);
    useEffect(() => {
        let cancelled = false;
        import("./Gallery/GalleryImages").then(({ IMAGES }) => {
            if (cancelled || !IMAGES.length) return;
            const start = Math.floor(Math.random() * IMAGES.length);
            setReel(Array.from({ length: Math.min(REEL_LEN, IMAGES.length) }, (_, i) => IMAGES[(start + i) % IMAGES.length]));
        });
        return () => { cancelled = true; };
    }, []);
    const end = reel ? -(reel.length - 1) * CELL_H : 0;

    return (
        <div className="flex flex-col items-center">
            <div className="relative h-28 w-44 overflow-hidden rounded-xl bg-slate-200 ring-2 ring-white shadow-inner">
                {reel && (
                    <motion.div
                        initial={reduce ? { y: end } : { y: 0, filter: "blur(0px)" }}
                        animate={reduce ? { y: end } : { y: [0, end - 10, end], filter: ["blur(0px)", "blur(2px)", "blur(0px)"] }}
                        transition={{
                            y: { duration: 1.8, times: [0, 0.88, 1], ease: [[0.3, 0.1, 0.2, 1], "easeInOut"] },
                            filter: { duration: 1.5, times: [0, 0.25, 1] },
                        }}
                    >
                        {reel.map((img) => (
                            <img key={img.id} srcSet={img.srcset} sizes="176px" alt={img.alt} className="h-28 w-44 object-cover" decoding="async" />
                        ))}
                    </motion.div>
                )}
                {/* Payline glints: a faint shade at the top and bottom of the window. */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/15" />
            </div>
            <Caption>Will travel for food</Caption>
        </div>
    );
};

// MBTI readout: one meter per trait pair, the marker sitting toward the
// winning side by its percentage (e.g. Introverted 51% → just right of center).
// The winning letter is bold in the meter's color; the other is muted.
const TRAITS = [
    { left: "E", right: "I", pct: 51, wins: "right", name: "Introverted", color: "#4298B4" },
    { left: "N", right: "S", pct: 63, wins: "left", name: "Intuitive", color: "#E4AE3A" },
    { left: "T", right: "F", pct: 67, wins: "left", name: "Thinking", color: "#33A474" },
    { left: "J", right: "P", pct: 81, wins: "left", name: "Judging", color: "#88619A" },
    { left: "A", right: "T", pct: 78, wins: "left", name: "Assertive", color: "#F25E62" },
] as const;
const MBTI_DETAIL = TRAITS.map((t) => `${t.pct}% ${t.name}`).join(", ");

const TypeMeters = () => (
    <div className="flex flex-col items-center">
        <div className="flex w-44 flex-col gap-1.5 py-1">
            {TRAITS.map((t, i) => {
                const pos = t.wins === "left" ? 100 - t.pct : t.pct;
                const letter = (side: "left" | "right") => (
                    <span
                        className={`w-2.5 text-center text-[10px] font-bold ${t.wins === side ? "" : "text-slate-400"}`}
                        style={t.wins === side ? { color: t.color } : undefined}
                    >
                        {t[side]}
                    </span>
                );
                return (
                    <div key={t.name} className="flex items-center gap-1.5" title={`${t.pct}% ${t.name}`}>
                        {letter("left")}
                        <div className="relative h-1.5 flex-1 rounded-full" style={{ backgroundColor: t.color }}>
                            <motion.div
                                className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow"
                                style={{ boxShadow: `0 0 0 2px ${t.color}` }}
                                initial={{ left: "50%" }}
                                animate={{ left: `${pos}%` }}
                                transition={{ type: "spring", stiffness: 140, damping: 14, delay: 0.1 + i * 0.05 }}
                            />
                        </div>
                        {letter("right")}
                    </div>
                );
            })}
        </div>
        <Caption>INTJ-A · The Architect</Caption>
    </div>
);

export interface Badge {
    label: string;
    detail: string;   // spoken by screen readers alongside the label
    overlay: ReactNode;
}

export const BADGES: Badge[] = [
    {
        label: "BSCS", detail: "Bachelor of Science in Computer Science, University of Colorado Denver",
        overlay: <Degree src={cuDenverLogo} school="University of Colorado Denver" name="Bachelor of Science in Computer Science" />,
    },
    {
        label: "MBA", detail: "Master of Business Administration, University of Northern Colorado",
        overlay: <Degree src={uncoLogo} school="University of Northern Colorado" name="Master of Business Administration" />,
    },
    {
        label: "MSF", detail: "Master of Science in Finance, Boston University",
        overlay: <Degree src={buLogo} school="Boston University" name="Master of Science in Finance" />,
    },
    { label: "INTJ-A", detail: `The Architect: ${MBTI_DETAIL}`, overlay: <TypeMeters /> },
    { label: "Foodie", detail: "Will travel for food", overlay: <FoodSlot /> },
];

const GLASS = "rounded-full bg-white/55 text-slate-800 ring-1 ring-white/70 shadow-sm backdrop-blur-md";

export const HeroBadge = ({ badge }: { badge: Badge }) => {
    const reduce = useReducedMotion();
    const [open, setOpen] = useState(false);

    return (
        <li
            tabIndex={0}
            aria-label={`${badge.label}: ${badge.detail}`}
            onPointerEnter={(e) => e.pointerType === "mouse" && setOpen(true)}
            onPointerLeave={(e) => e.pointerType === "mouse" && setOpen(false)}
            onClick={() => setOpen((o) => !o)}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            className={`${GLASS} relative cursor-default select-none px-3.5 py-1 text-sm font-semibold tracking-wide outline-none transition-transform duration-200 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-primary ${open ? "z-20" : ""}`}
        >
            {badge.label}

            {/* Floating frosted card above the badge. */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={reduce ? false : { opacity: 0, y: 8, scale: 0.92 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={reduce ? undefined : { opacity: 0, y: 4, scale: 0.96 }}
                        transition={{ type: "spring", stiffness: 420, damping: 30 }}
                        className="pointer-events-none absolute bottom-full left-1/2 mb-2.5 -translate-x-1/2"
                        aria-hidden="true"
                    >
                        <div className="grid place-items-center rounded-2xl bg-white/75 px-4 py-3 shadow-xl ring-1 ring-white/80 backdrop-blur-md">
                            {badge.overlay}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </li>
    );
};
