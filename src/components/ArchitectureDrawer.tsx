import { useEffect, useState } from "react";

export interface ArchitectureContent {
    title: string;
    oneLiner: string;
    stack: { label: string; items: string[] }[];
    dataFlow: string;
    diagram: string;
    decisions: { title: string; body: string }[];
    metrics: string[];
    metricsNote?: string;
}

const H3 = "text-xs font-semibold uppercase tracking-widest text-base-content/50";

// Reusable right-side "Under the hood" drawer opened by a fixed edge tab.
export const ArchitectureDrawer = ({ content }: { content: ArchitectureContent }) => {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                aria-label={`Open: ${content.title}`}
                className={`fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-primary text-primary-content py-4 px-2 rounded-l-xl shadow-lg text-sm font-semibold tracking-wide [writing-mode:vertical-rl] rotate-180 transition-all hover:px-2.5 ${open ? "opacity-0 pointer-events-none" : "opacity-100"}`}
            >
                Under the hood
            </button>

            <div
                onClick={() => setOpen(false)}
                className={`fixed inset-0 z-40 bg-base-content/40 backdrop-blur-sm transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
            />

            <aside
                className={`fixed top-0 right-0 z-50 h-full w-full max-w-xl bg-base-200 shadow-2xl flex flex-col transition-transform duration-300 ease-out ${open ? "translate-x-0" : "translate-x-full"}`}
                aria-hidden={!open}
            >
                <header className="flex items-start justify-between gap-3 p-5 border-b border-base-300 shrink-0">
                    <div>
                        <p className="text-xs uppercase tracking-widest text-primary font-semibold">Under the hood</p>
                        <h2 className="text-xl font-bold text-base-content mt-0.5">{content.title}</h2>
                    </div>
                    <button onClick={() => setOpen(false)} className="btn btn-sm btn-circle btn-ghost shrink-0" aria-label="Close">✕</button>
                </header>

                <div className="overflow-y-auto px-5 py-6 space-y-9">
                    <p className="text-base-content/70 leading-relaxed">{content.oneLiner}</p>

                    <div className="space-y-3">
                        <h3 className={H3}>Stack</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {content.stack.map((c) => (
                                <div key={c.label} className="bg-base-100 border border-base-300 rounded-xl p-4">
                                    <p className="text-sm font-semibold text-base-content mb-2">{c.label}</p>
                                    <ul className="space-y-1">
                                        {c.items.map((it) => (
                                            <li key={it} className="text-sm text-base-content/70 flex gap-2"><span className="text-primary/60">›</span>{it}</li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h3 className={H3}>Architecture</h3>
                        <p className="text-base-content/70 leading-relaxed">{content.dataFlow}</p>
                        <pre className="bg-neutral text-neutral-content/90 rounded-xl p-4 text-[10px] sm:text-xs leading-relaxed overflow-x-auto font-mono">{content.diagram}</pre>
                    </div>

                    <div className="space-y-3">
                        <h3 className={H3}>Key decisions &amp; challenges</h3>
                        <div className="space-y-3">
                            {content.decisions.map((d) => (
                                <div key={d.title} className="bg-base-100 border border-base-300 rounded-xl p-4">
                                    <p className="font-semibold text-base-content mb-1">{d.title}</p>
                                    <p className="text-sm text-base-content/70 leading-relaxed">{d.body}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h3 className={H3}>By the numbers</h3>
                        <div className="flex flex-wrap gap-2">
                            {content.metrics.map((m) => (
                                <span key={m} className="px-3 py-1.5 rounded-lg bg-base-100 border border-base-300 text-sm text-base-content/80 font-medium tabular-nums">{m}</span>
                            ))}
                        </div>
                        {content.metricsNote && <p className="text-[11px] text-base-content/40">{content.metricsNote}</p>}
                    </div>
                </div>
            </aside>
        </>
    );
};
