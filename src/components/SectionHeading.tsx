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
    // With a title (e.g. Projects), the description sits on its own row beneath
    // the title. Without a title (e.g. Highlights, Gallery), it rides inline on
    // the eyebrow row as a subheading.
    const inlineSub = description && !title;

    return (
        <div className={className}>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="h-px w-10 bg-primary/60" />
                <span className="text-sm uppercase tracking-[0.3em] text-primary font-semibold">
                    {eyebrow}
                </span>
                {inlineSub && (
                    <span className="text-sm text-base-content/60">{description}</span>
                )}
            </div>

            {title && (
                <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-2">
                    <h2 className="shrink-0 text-2xl md:text-3xl font-bold text-base-content">{title}</h2>
                    {description && (
                        <p className="min-w-[16rem] flex-1 text-sm text-base-content/60">{description}</p>
                    )}
                </div>
            )}
        </div>
    );
}
