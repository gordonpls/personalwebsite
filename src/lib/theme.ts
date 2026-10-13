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

