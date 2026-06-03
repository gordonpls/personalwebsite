import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

interface Cmd { label: string; hint?: string; path?: string; anchor?: string; action?: () => void }

function toggleTheme() {
    const next = document.documentElement.getAttribute("data-theme") === "business" ? "corporate" : "business";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("theme", next); } catch { /* ignore */ }
}

// ⌘K / Ctrl+K command palette — jump to any section or page.
export const CommandPalette = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [active, setActive] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    const commands: Cmd[] = [
        { label: "Home", hint: "Top of page", anchor: "__top__" },
        { label: "About", hint: "A short essay", anchor: "about" },
        { label: "Résumé", anchor: "resume" },
        { label: "Gallery", anchor: "gallery" },
        { label: "Projects", hint: "Allocation, Portfolio, Stablecoin", anchor: "projects" },
        { label: "Allocation", hint: "Risk quiz & simulator", path: "/allocation" },
        { label: "Portfolio", hint: "Live holdings & performance", path: "/portfolio" },
        { label: "Stablecoin dashboard", path: "/stablecoin" },
        { label: "Daily Fortune", hint: "Crack today's fortune cookie", path: "/fortune" },
        { label: "Toggle light / dark", action: toggleTheme },
    ];

    const filtered = query.trim()
        ? commands.filter((c) => (c.label + " " + (c.hint ?? "")).toLowerCase().includes(query.toLowerCase()))
        : commands;

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((o) => !o); }
            else if (e.key === "Escape") setOpen(false);
        };
        const onToggle = () => setOpen((o) => !o);
        window.addEventListener("keydown", onKey);
        window.addEventListener("toggle-command-palette", onToggle);
        return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("toggle-command-palette", onToggle); };
    }, []);

    useEffect(() => {
        if (open) { setQuery(""); setActive(0); setTimeout(() => inputRef.current?.focus(), 0); }
    }, [open]);

    useEffect(() => { setActive(0); }, [query]);

    const run = (cmd?: Cmd) => {
        if (!cmd) return;
        setOpen(false);
        if (cmd.action) return cmd.action();
        if (cmd.path) return navigate(cmd.path);
        if (cmd.anchor === "__top__") {
            if (location.pathname !== "/") { navigate("/"); setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 220); }
            else window.scrollTo({ top: 0, behavior: "smooth" });
            return;
        }
        if (cmd.anchor) {
            const scroll = () => document.getElementById(cmd.anchor as string)?.scrollIntoView({ behavior: "smooth" });
            if (location.pathname !== "/") { navigate("/"); setTimeout(scroll, 250); } else scroll();
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 bg-base-content/40 backdrop-blur-sm" onClick={() => setOpen(false)}>
            <div className="w-full max-w-lg bg-base-100 border border-base-300 rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, filtered.length - 1)); }
                        else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
                        else if (e.key === "Enter") { e.preventDefault(); run(filtered[active]); }
                    }}
                    placeholder="Jump to…"
                    className="w-full px-5 py-4 text-base bg-transparent outline-none border-b border-base-300 text-base-content placeholder:text-base-content/40"
                />
                <ul className="max-h-72 overflow-y-auto py-2">
                    {filtered.length === 0 && <li className="px-5 py-3 text-sm text-base-content/40">No matches</li>}
                    {filtered.map((c, i) => (
                        <li key={c.label}>
                            <button
                                onMouseEnter={() => setActive(i)}
                                onClick={() => run(c)}
                                className={`w-full text-left px-5 py-2.5 flex items-center justify-between gap-3 ${i === active ? "bg-base-200" : ""}`}
                            >
                                <span className="font-medium text-base-content">{c.label}</span>
                                {c.hint && <span className="text-xs text-base-content/40 truncate">{c.hint}</span>}
                            </button>
                        </li>
                    ))}
                </ul>
                <div className="px-5 py-2 border-t border-base-300 text-[11px] text-base-content/40 flex gap-3">
                    <span>↑↓ navigate</span><span>↵ select</span><span>esc close</span>
                </div>
            </div>
        </div>
    );
};
