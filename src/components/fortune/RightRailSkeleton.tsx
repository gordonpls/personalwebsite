// Placeholder for the right column before the user cracks the cookie. Mirrors
// the real layout so the page doesn't shift when content arrives.
export const RightRailSkeleton = () => (
    <div className="space-y-6" aria-hidden="true">
        {/* Lucky numbers row */}
        <div className="flex flex-col items-center">
            <div className="h-3 w-28 bg-base-200 rounded animate-pulse mb-3" />
            <div className="flex items-center gap-2 flex-wrap justify-center">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="w-10 h-10 rounded-full bg-base-200 border-2 border-base-200 animate-pulse" />
                ))}
                <span className="text-base-content/20 text-lg px-1">·</span>
                <div className="w-10 h-10 rounded-full bg-base-200 animate-pulse" />
            </div>
        </div>

        {/* Color / element pills */}
        <div className="flex items-center gap-4 flex-wrap justify-center">
            <div className="h-10 w-32 rounded-full bg-base-200 animate-pulse" />
            <div className="h-10 w-32 rounded-full bg-base-200 animate-pulse" />
        </div>

        {/* Phrase card */}
        <div className="bg-base-100 border border-base-300 rounded-2xl p-5 text-center space-y-3">
            <div className="h-3 w-32 mx-auto bg-base-200 rounded animate-pulse" />
            <div className="h-10 w-56 mx-auto bg-base-200 rounded animate-pulse" />
            <div className="h-4 w-40 mx-auto bg-base-200 rounded animate-pulse" />
            <div className="h-4 w-64 mx-auto bg-base-200 rounded animate-pulse" />
        </div>

        {/* Share button */}
        <div className="flex justify-center pt-1">
            <div className="h-8 w-36 rounded-md bg-base-200 animate-pulse" />
        </div>
    </div>
);
