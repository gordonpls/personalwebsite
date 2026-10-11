// Floating "where am I" pill for long pages: shows the current section and its
// position, ‹ › step to the previous/next section, and tapping the name opens
// a list of every section. Compact replacement for a row of section pills.

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export interface NavSection { id: string; label: string }

const Chevron = ({ d }: { d: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="h-4 w-4" aria-hidden="true">
        <path d={d} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

export const SectionNav = ({ sections, active, onJump }: {
    sections: NavSection[];
    active: string;
    onJump: (id: string) => void;
}) => {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLElement>(null);
    const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const triggerRef = useRef<HTMLButtonElement>(null);

    const i = Math.max(0, sections.findIndex((s) => s.id === active));
    const cur = sections[i];
    const go = (idx: number) => { setOpen(false); onJump(sections[idx].id); };

    // Close on outside click or Escape (returning focus to the trigger).
    useEffect(() => {
        if (!open) return;
        const onDown = (e: PointerEvent) => { if (!rootRef.current?.contains(e.target as Node)) setOpen(false); };
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); triggerRef.current?.focus(); } };
        document.addEventListener("pointerdown", onDown);
        document.addEventListener("keydown", onKey);
        // Start keyboard users on the current section.
        itemRefs.current[i]?.focus({ preventScroll: true });
        return () => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    // Arrow keys move through the list.
    const onMenuKey = (e: React.KeyboardEvent) => {
        const items = itemRefs.current.filter(Boolean) as HTMLButtonElement[];
        const at = items.indexOf(document.activeElement as HTMLButtonElement);
        const next = e.key === "ArrowDown" ? at + 1 : e.key === "ArrowUp" ? at - 1 : e.key === "Home" ? 0 : e.key === "End" ? items.length - 1 : null;
        if (next == null) return;
        e.preventDefault();
        items[(next + items.length) % items.length]?.focus();
    };

    const arrow = "flex h-9 w-9 items-center justify-center rounded-full text-base-content/70 transition hover:bg-base-200 hover:text-base-content disabled:pointer-events-none disabled:opacity-30";

    return (
        <nav ref={rootRef} aria-label="Dashboard sections" className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2">
            <AnimatePresence>
                {open && (
                    <motion.ul
                        role="menu"
                        aria-label="Jump to section"
                        onKeyDown={onMenuKey}
                        initial={{ opacity: 0, y: 8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                        className="absolute bottom-full left-1/2 mb-2 w-56 -translate-x-1/2 overflow-hidden rounded-2xl border border-base-300 bg-base-100/95 p-1.5 shadow-xl backdrop-blur"
                    >
                        {sections.map((s, idx) => {
                            const on = idx === i;
                            return (
                                <li key={s.id} role="none">
                                    <button
                                        ref={(el) => { itemRefs.current[idx] = el; }}
                                        type="button"
                                        role="menuitem"
                                        aria-current={on ? "true" : undefined}
                                        onClick={() => go(idx)}
                                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-primary ${on ? "bg-primary/10 font-semibold text-primary" : "text-base-content/80 hover:bg-base-200 hover:text-base-content"}`}
                                    >
                                        <span className={`w-4 text-right text-xs tabular-nums ${on ? "text-primary" : "text-base-content/60"}`}>{idx + 1}</span>
                                        {s.label}
                                    </button>
                                </li>
                            );
                        })}
                    </motion.ul>
                )}
            </AnimatePresence>

            <div className="flex items-center gap-0.5 rounded-full border border-base-300 bg-base-100/90 p-1 shadow-lg backdrop-blur">
                <button type="button" className={arrow} onClick={() => go(i - 1)} disabled={i === 0} aria-label={i > 0 ? `Previous section: ${sections[i - 1].label}` : "Previous section"}>
                    <Chevron d="M15 6l-6 6 6 6" />
                </button>
                <button
                    ref={triggerRef}
                    type="button"
                    onClick={() => setOpen((o) => !o)}
                    aria-haspopup="menu"
                    aria-expanded={open}
                    aria-label={`Current section: ${cur.label}, ${i + 1} of ${sections.length}. Show all sections`}
                    className="flex h-9 min-w-[9.5rem] items-center justify-center gap-2 rounded-full px-3 text-sm font-semibold text-base-content transition hover:bg-base-200"
                >
                    <span>{cur.label}</span>
                    <span className="text-xs font-medium tabular-nums text-base-content/60">{i + 1}/{sections.length}</span>
                    <motion.span animate={{ rotate: open ? 180 : 0 }} className="text-base-content/60"><Chevron d="M6 15l6-6 6 6" /></motion.span>
                </button>
                <button type="button" className={arrow} onClick={() => go(i + 1)} disabled={i === sections.length - 1} aria-label={i < sections.length - 1 ? `Next section: ${sections[i + 1].label}` : "Next section"}>
                    <Chevron d="M9 6l6 6-6 6" />
                </button>
            </div>
        </nav>
    );
};
