// Shared section header so every section opens the same way: a primary "eyebrow"
// (short rule + uppercase tracked label), with an optional title + supporting
// description beneath. About Me uses the eyebrow alone; Projects adds a title
// and blurb. Keeping this in one place guarantees the headings stay consistent.

export function SectionHeading({
    eyebrow,
    title,
    description,
    className = "",
}: {
    eyebrow: string;
    title?: string;
    description?: string;
    className?: string;
}) {
    return (
        <div className={className}>
            <div className="flex items-center gap-3">
                <span className="h-px w-10 bg-primary/60" />
                <span className="text-[11px] uppercase tracking-[0.3em] text-primary font-semibold">
                    {eyebrow}
                </span>
            </div>

            {(title || description) && (
                <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-2">
                    {title && (
                        <h2 className="shrink-0 text-2xl md:text-3xl font-bold text-base-content">
                            {title}
                        </h2>
                    )}
                    {description && (
                        <p className="min-w-[16rem] flex-1 text-sm text-base-content/60">{description}</p>
                    )}
                </div>
            )}
        </div>
    );
}
