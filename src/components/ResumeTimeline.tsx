import { useState, useMemo } from "react";
import resumePDF from "../assets/Gordon Zhong 2026 Resume.pdf";
import { SectionHeading } from "./SectionHeading";
import { TIMELINE_ENTRIES, type TimelineEntry, type EntryType } from "../data/timelineData";

// ─── Icons ────────────────────────────────────────────────────────────────────

function BriefcaseIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M7.5 5.25a3 3 0 013-3h3a3 3 0 013 3v.205c.933.085 1.857.197 2.774.334 1.454.218 2.476 1.483 2.476 2.917v3.033c0 1.211-.734 2.352-1.936 2.752A24.726 24.726 0 0112 15.75c-2.73 0-5.357-.442-7.814-1.259-1.202-.4-1.936-1.541-1.936-2.752V8.706c0-1.434 1.022-2.7 2.476-2.917A48.814 48.814 0 017.5 5.455V5.25zm7.5 0v.09a49.488 49.488 0 00-6 0v-.09a1.5 1.5 0 011.5-1.5h3a1.5 1.5 0 011.5 1.5zm-3 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
            <path d="M3 18.4v-2.796a4.3 4.3 0 00.713.31A26.226 26.226 0 0012 17.25c2.892 0 5.68-.468 8.287-1.335.252-.084.49-.189.713-.311V18.4c0 1.452-1.047 2.728-2.523 2.923-2.12.282-4.282.427-6.477.427a49.19 49.19 0 01-6.477-.427C4.047 21.128 3 19.852 3 18.4z" />
        </svg>
    );
}

function GraduationIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
            <path d="M11.7 2.805a.75.75 0 01.6 0A60.65 60.65 0 0122.83 8.72a.75.75 0 01-.231 1.337 49.949 49.949 0 00-9.902 3.912l-.003.002-.34.18a.75.75 0 01-.707 0A50.009 50.009 0 007.5 12.174v-.224c0-.131.067-.248.172-.311a54.614 54.614 0 014.653-2.52.75.75 0 00-.65-1.352 56.129 56.129 0 00-4.78 2.589 1.858 1.858 0 00-.859 1.228 49.803 49.803 0 00-4.634-1.527.75.75 0 01-.231-1.337A60.653 60.653 0 0111.7 2.805z" />
            <path d="M13.06 15.473a48.45 48.45 0 017.666-3.282c.134 1.414.22 2.843.255 4.285a.75.75 0 01-.46.71 47.878 47.878 0 00-8.105 4.342.75.75 0 01-.832 0 47.877 47.877 0 00-8.104-4.342.75.75 0 01-.461-.71c.035-1.442.121-2.87.255-4.286A48.4 48.4 0 016 13.18v1.27a1.5 1.5 0 00-.14 2.508c-.09.38-.222.753-.397 1.11.452.213.901.434 1.346.661a6.729 6.729 0 00.551-1.608 1.5 1.5 0 00.14-2.67v-.645a48.549 48.549 0 013.44 1.668 2.25 2.25 0 002.12 0z" />
        </svg>
    );
}

function MapPinIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-2.079 3.576-4.816 3.576-8.124a6.862 6.862 0 10-13.724 0c0 3.308 1.632 6.045 3.576 8.124a19.583 19.583 0 002.682 2.282 16.975 16.975 0 001.144.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
        </svg>
    );
}

function DownloadIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
        </svg>
    );
}

// ─── Icon node for left rail ──────────────────────────────────────────────────

function IconNode({ type }: { type: EntryType }) {
    const base = "flex h-9 w-9 shrink-0 items-center justify-center rounded-full shadow-sm relative z-10";
    if (type === "role") {
        return <div className={`${base} bg-primary text-primary-content`}><BriefcaseIcon /></div>;
    }
    if (type === "education") {
        return <div className={`${base} bg-secondary text-secondary-content`}><GraduationIcon /></div>;
    }
    return <div className={`${base} bg-base-300 text-base-content/50`}><MapPinIcon /></div>;
}

// ─── Entry renderers ──────────────────────────────────────────────────────────

function RoleEntry({ entry }: { entry: TimelineEntry }) {
    return (
        <div className="pb-10 pt-1.5">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-y-0.5 sm:gap-x-6 mb-2.5">
                <div>
                    <h3 className="font-semibold text-base-content leading-snug">{entry.title}</h3>
                    <p className="text-sm font-medium text-primary mt-0.5">{entry.org}</p>
                </div>
                <div className="shrink-0 sm:text-right">
                    <p className="text-xs text-base-content/60 whitespace-nowrap">{entry.period}</p>
                    {entry.location && (
                        <p className="text-xs text-base-content/40 mt-0.5">{entry.location}</p>
                    )}
                </div>
            </div>
            {entry.bullets && (
                <ul className="space-y-2">
                    {entry.bullets.map((b, i) => (
                        <li key={i} className="flex gap-2.5 text-sm text-base-content/70 leading-snug">
                            <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-primary/50" />
                            {b}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function EducationEntry({ entry }: { entry: TimelineEntry }) {
    return (
        <div className="pb-8 pt-1.5">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-y-0.5 sm:gap-x-6">
                <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-secondary/70 font-semibold mb-1">
                        Education
                    </p>
                    <h3 className="font-semibold text-base-content/80 text-sm leading-snug">{entry.title}</h3>
                    <p className="text-xs text-base-content/55 mt-0.5">{entry.org}</p>
                </div>
                <div className="shrink-0 sm:text-right">
                    <p className="text-xs text-base-content/55 whitespace-nowrap">{entry.period}</p>
                    {entry.location && (
                        <p className="text-xs text-base-content/40 mt-0.5">{entry.location}</p>
                    )}
                    {entry.note && (
                        <p className="text-xs text-secondary/80 font-medium mt-1">{entry.note}</p>
                    )}
                </div>
            </div>
        </div>
    );
}

function BreakEntry({ entry }: { entry: TimelineEntry }) {
    return (
        <div className="pb-8 pt-1.5">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-y-0.5 sm:gap-x-6 mb-1">
                <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-base-content/35 font-semibold mb-1">
                        Career Break
                    </p>
                    <h3 className="font-medium text-base-content/55 text-sm italic">{entry.title}</h3>
                </div>
                <p className="shrink-0 text-xs text-base-content/40 whitespace-nowrap sm:text-right">
                    {entry.period}
                </p>
            </div>
            {entry.note && (
                <p className="text-sm text-base-content/45 italic leading-relaxed">{entry.note}</p>
            )}
        </div>
    );
}

// ─── Filter types ─────────────────────────────────────────────────────────────

type Filter = "all" | EntryType;

const FILTERS: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "role", label: "Work" },
    { id: "education", label: "Education" },
    { id: "break", label: "Breaks" },
];

// ─── Main component ───────────────────────────────────────────────────────────

export function ResumeTimeline() {
    const [filter, setFilter] = useState<Filter>("all");
    const [animKey, setAnimKey] = useState(0);

    const filtered = useMemo(
        () => filter === "all" ? TIMELINE_ENTRIES : TIMELINE_ENTRIES.filter(e => e.type === filter),
        [filter]
    );

    const counts: Record<Filter, number> = useMemo(() => ({
        all: TIMELINE_ENTRIES.length,
        role: TIMELINE_ENTRIES.filter(e => e.type === "role").length,
        education: TIMELINE_ENTRIES.filter(e => e.type === "education").length,
        break: TIMELINE_ENTRIES.filter(e => e.type === "break").length,
    }), []);

    function applyFilter(f: Filter) {
        if (f === filter) return;
        setFilter(f);
        setAnimKey(k => k + 1);
    }

    return (
        <div
            className="text-left bg-base-200 p-4 lg:p-8 lg:w-full mx-auto rounded-md border-2 border-secondary scroll-mt-24"
            id="resume"
        >
            {/* Breadcrumbs + download: side-by-side on sm+, stacked below on mobile */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <div className="breadcrumbs max-w-fit">
                    <ul>
                        <li className="pointer-events-none">
                            <span className="inline-flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="h-4 w-4 stroke-current">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                </svg>
                                <span>Home</span>
                            </span>
                        </li>
                        <li className="pointer-events-none">
                            <span className="inline-flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="h-4 w-4 stroke-current">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                </svg>
                                <span>Resume</span>
                            </span>
                        </li>
                        <li className="pointer-events-none">
                            <span className="inline-flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="h-4 w-4 stroke-current">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
                                </svg>
                                <span>Career Timeline</span>
                            </span>
                        </li>
                    </ul>
                </div>

                {/* Ping ring wraps the button for a visible pulse effect */}
                <div className="relative inline-flex shrink-0 sm:ml-4">
                    <span className="absolute inset-0 rounded animate-ping bg-primary/40" />
                    <a
                        href={resumePDF}
                        download
                        className="btn btn-primary btn-sm gap-2 relative shadow-md shadow-primary/30"
                    >
                        <DownloadIcon />
                        Download Resume
                    </a>
                </div>
            </div>

            <SectionHeading eyebrow="Experience" title="Career Timeline" className="mb-6" />

            {/* Filter tabs — the interactive flashy feature */}
            <div className="join mb-8">
                {FILTERS.map(f => (
                    <button
                        key={f.id}
                        onClick={() => applyFilter(f.id)}
                        className={`join-item btn btn-sm gap-1.5 transition-colors ${
                            filter === f.id ? "btn-primary" : "btn-ghost"
                        }`}
                    >
                        {f.label}
                        <span
                            className={`badge badge-sm tabular-nums ${
                                filter === f.id
                                    ? "bg-primary-content/20 text-primary-content border-transparent"
                                    : "badge-ghost"
                            }`}
                        >
                            {counts[f.id]}
                        </span>
                    </button>
                ))}
            </div>

            {/* Timeline */}
            <div className="relative">
                {/* Animated spine — draws itself top-to-bottom on mount */}
                <div className="absolute left-[18px] top-0 bottom-10 w-px bg-gradient-to-b from-primary/70 via-secondary/30 to-transparent timeline-spine" />

                <ul key={animKey} className="space-y-0">
                    {filtered.map((entry, i) => (
                        <li
                            key={`${entry.org}-${i}`}
                            className="grid grid-cols-[36px_1fr] gap-x-4 items-start"
                            style={{ animation: `timeline-entry-in 0.35s ease-out ${i * 0.07}s both` }}
                        >
                            <IconNode type={entry.type} />
                            <div>
                                {entry.type === "role" && <RoleEntry entry={entry} />}
                                {entry.type === "education" && <EducationEntry entry={entry} />}
                                {entry.type === "break" && <BreakEntry entry={entry} />}
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
