import resumePDF from "../assets/Gordon Zhong 2026 Resume.pdf";
import { SectionHeading } from "./SectionHeading";
import { TIMELINE_ENTRIES, type TimelineEntry } from "../data/timelineData";

// Design B — DaisyUI native timeline component with center spine,
// dated left column, icon nodes, and timeline-box cards on the right.

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

function IconNode({ type }: { type: TimelineEntry["type"] }) {
    if (type === "role") {
        return (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-content shadow-sm ring-4 ring-base-200">
                <BriefcaseIcon />
            </div>
        );
    }
    if (type === "education") {
        return (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-secondary-content shadow-sm ring-4 ring-base-200">
                <GraduationIcon />
            </div>
        );
    }
    return (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-base-300 text-base-content/50 shadow-sm ring-4 ring-base-200">
            <MapPinIcon />
        </div>
    );
}

function RoleBox({ entry }: { entry: TimelineEntry }) {
    return (
        <>
            <div className="mb-2">
                <h3 className="font-semibold text-base-content leading-snug">{entry.title}</h3>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-sm font-medium text-primary">{entry.org}</span>
                    {entry.location && (
                        <span className="text-xs text-base-content/50">{entry.location}</span>
                    )}
                </div>
            </div>
            {entry.bullets && (
                <ul className="space-y-1.5 mt-3">
                    {entry.bullets.map((b, i) => (
                        <li key={i} className="flex gap-2 text-sm text-base-content/70 leading-snug">
                            <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-primary/60" />
                            {b}
                        </li>
                    ))}
                </ul>
            )}
        </>
    );
}

function EducationBox({ entry }: { entry: TimelineEntry }) {
    return (
        <>
            <div className="flex items-center gap-2 mb-2">
                <span className="badge badge-secondary badge-sm font-medium">Education</span>
            </div>
            <h3 className="font-semibold text-base-content text-sm leading-snug">{entry.title}</h3>
            <p className="text-xs text-base-content/60 mt-0.5">{entry.org}</p>
            {entry.location && (
                <p className="text-xs text-base-content/45 mt-0.5">{entry.location}</p>
            )}
            {entry.note && (
                <p className="text-xs font-semibold text-secondary mt-2">{entry.note}</p>
            )}
        </>
    );
}

function BreakBox({ entry }: { entry: TimelineEntry }) {
    return (
        <>
            <div className="flex items-center gap-2 mb-2">
                <span className="badge badge-ghost badge-sm text-base-content/50">Career Break</span>
            </div>
            <h3 className="font-medium text-base-content/60 text-sm italic">{entry.title}</h3>
            {entry.note && (
                <p className="text-xs text-base-content/50 italic mt-1.5 leading-relaxed">{entry.note}</p>
            )}
        </>
    );
}

function hrColor(type: TimelineEntry["type"]) {
    if (type === "role") return "bg-primary/40";
    if (type === "education") return "bg-secondary/40";
    return "bg-base-content/15";
}

export function ResumeTimelineDaisy() {
    return (
        <div
            className="text-left bg-base-200 p-4 lg:p-8 lg:w-full mx-auto rounded-md border-2 border-secondary scroll-mt-24"
            id="timeline-daisy"
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

            {/* Legend */}
            <div className="flex flex-wrap gap-4 mb-8">
                <div className="flex items-center gap-1.5 text-xs text-base-content/60">
                    <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                    Work
                </div>
                <div className="flex items-center gap-1.5 text-xs text-base-content/60">
                    <span className="h-2.5 w-2.5 rounded-full bg-secondary" />
                    Education
                </div>
                <div className="flex items-center gap-1.5 text-xs text-base-content/60">
                    <span className="h-2.5 w-2.5 rounded-full bg-base-content/25" />
                    Career Break
                </div>
            </div>

            <ul className="timeline timeline-vertical">
                {TIMELINE_ENTRIES.map((entry, i) => {
                    const isFirst = i === 0;
                    const isLast = i === TIMELINE_ENTRIES.length - 1;
                    const lineClass = hrColor(entry.type);

                    return (
                        <li key={i}>
                            {!isFirst && <hr className={lineClass} />}
                            <div className="timeline-start me-4 text-end">
                                <time className="text-xs font-medium text-base-content/55 whitespace-pre-line leading-relaxed">
                                    {entry.period.replace(" · ", "\n")}
                                </time>
                            </div>
                            <div className="timeline-middle">
                                <IconNode type={entry.type} />
                            </div>
                            <div className="timeline-end timeline-box ms-4 mb-8 bg-base-100">
                                {entry.type === "role" && <RoleBox entry={entry} />}
                                {entry.type === "education" && <EducationBox entry={entry} />}
                                {entry.type === "break" && <BreakBox entry={entry} />}
                            </div>
                            {!isLast && <hr className={lineClass} />}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
