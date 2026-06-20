import resumePDF from "../assets/Gordon Zhong 2026 Resume.pdf";
import { SectionHeading } from "./SectionHeading";
import { TIMELINE_ENTRIES, type TimelineEntry } from "../data/timelineData";

// Design A — custom left-rail dot style, no card boxes, typography-first

function Node({ type }: { type: TimelineEntry["type"] }) {
    if (type === "role") {
        return (
            <span className="flex h-3 w-3 shrink-0 rounded-full bg-primary ring-4 ring-base-200" />
        );
    }
    if (type === "education") {
        return (
            <span className="flex h-3 w-3 shrink-0 rounded-full border-2 border-secondary bg-base-200 ring-4 ring-base-200" />
        );
    }
    // break: diamond
    return (
        <span className="flex h-2.5 w-2.5 shrink-0 rotate-45 bg-base-content/25 ring-4 ring-base-200 mt-0.5" />
    );
}

function RoleEntry({ entry }: { entry: TimelineEntry }) {
    return (
        <div className="pb-10">
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
        <div className="pb-8">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-y-0.5 sm:gap-x-6">
                <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-secondary/70 font-semibold mb-1">
                        Education
                    </p>
                    <h3 className="font-semibold text-base-content/80 text-sm leading-snug">
                        {entry.title}
                    </h3>
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
        <div className="pb-8">
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

export function ResumeTimeline() {
    return (
        <div
            className="text-left bg-base-200 p-4 lg:p-8 lg:w-full mx-auto rounded-md border-2 border-secondary scroll-mt-24"
            id="timeline"
        >
            <div className="flex flex-wrap items-start justify-between gap-4 mb-10">
                <SectionHeading
                    eyebrow="Experience"
                    title="Career Timeline"
                    description="Professional history and education"
                />
                <a
                    href={resumePDF}
                    download
                    className="btn btn-sm btn-outline btn-info shrink-0 self-start gap-2"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        className="h-4 w-4 stroke-current"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                    </svg>
                    Download Resume
                </a>
            </div>

            <div className="relative">
                {/* Gradient vertical spine */}
                <div className="absolute left-[5px] top-3 bottom-10 w-px bg-gradient-to-b from-primary/70 via-secondary/30 to-transparent" />

                <ul className="pl-7">
                    {TIMELINE_ENTRIES.map((entry, i) => (
                        <li key={i} className="relative">
                            <div className="absolute -left-[1.375rem] top-[5px]">
                                <Node type={entry.type} />
                            </div>
                            {entry.type === "role" && <RoleEntry entry={entry} />}
                            {entry.type === "education" && <EducationEntry entry={entry} />}
                            {entry.type === "break" && <BreakEntry entry={entry} />}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
