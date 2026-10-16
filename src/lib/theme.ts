// Single source of truth for light/dark mode. index.html has an inline copy of
// the read logic (it runs before first paint) — keep the keys in sync.

// Bumped from "theme" so every returning visitor starts on dark again.
export const THEME_KEY = "theme-v2";

export const DARK_THEME = "business";
export const LIGHT_THEME = "corporate";

export type Mode = "dark" | "light";

export function getMode(): Mode {
    try { return localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark"; } catch { return "dark"; }
}

export function applyMode(mode: Mode) {
    document.documentElement.setAttribute("data-theme", mode === "dark" ? DARK_THEME : LIGHT_THEME);
    try { localStorage.setItem(THEME_KEY, mode); } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent<Mode>("themechange", { detail: mode }));
}


// Same as applyMode, but the new theme spreads out in a circle from `origin`
// (e.g. the toggle button) using the View Transitions API. Falls back to an
// instant switch where unsupported or under prefers-reduced-motion.
export function applyModeWithReveal(mode: Mode, origin?: { x: number; y: number }) {
    const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };
    if (!doc.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        applyMode(mode);
        return;
    }
    const x = origin?.x ?? window.innerWidth / 2;
    const y = origin?.y ?? 0;
    // Radius that reaches the farthest corner from the origin.
    const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    const t = doc.startViewTransition(() => applyMode(mode));
    t.ready.then(() => {
        document.documentElement.animate(
            { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
            { duration: 550, easing: "cubic-bezier(0.4, 0, 0.2, 1)", pseudoElement: "::view-transition-new(root)" },
        );
    }).catch(() => { /* transition skipped; theme already applied */ });
}
