// Single source of truth for light/dark mode. index.html has an inline copy of
// the read logic (it runs before first paint) — keep the keys in sync.

// Bumped from "theme" so every returning visitor starts on dark again.
export const THEME_KEY = "theme-v2";
// Session-only override for which DaisyUI theme "dark" resolves to, set from
// /theme-demo so candidate palettes can be tried across the whole site.
export const PREVIEW_KEY = "theme-preview";

export const DARK_THEME = "business";
export const LIGHT_THEME = "corporate";

export type Mode = "dark" | "light";

export function getMode(): Mode {
    try { return localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark"; } catch { return "dark"; }
}

export function getDarkTheme(): string {
    try { return sessionStorage.getItem(PREVIEW_KEY) || DARK_THEME; } catch { return DARK_THEME; }
}

export function applyMode(mode: Mode) {
    document.documentElement.setAttribute("data-theme", mode === "dark" ? getDarkTheme() : LIGHT_THEME);
    try { localStorage.setItem(THEME_KEY, mode); } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent<Mode>("themechange", { detail: mode }));
}

// Pass null to drop the preview and go back to the real dark theme.
export function setDarkPreview(theme: string | null) {
    try {
        if (theme) sessionStorage.setItem(PREVIEW_KEY, theme);
        else sessionStorage.removeItem(PREVIEW_KEY);
    } catch { /* ignore */ }
    applyMode("dark");
}
