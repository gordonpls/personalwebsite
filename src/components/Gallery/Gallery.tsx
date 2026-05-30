import { useEffect, useMemo, useState } from "react";
import { IMAGES } from "./GalleryImages";

// ─── Config ───────────────────────────────────────────────────────────────────
// Grid tile rendered width per breakpoint (cols: 2 / 3 / 4 / 5), so the browser
// can pick the smallest adequate thumbnail from srcset.
const GRID_SIZES = "(min-width:1280px) 20vw, (min-width:1024px) 25vw, (min-width:640px) 33vw, 50vw";

const CATEGORIES = ["All", "Denver", "Thailand", "Vegas", "New York"];

// Page size per breakpoint: kept a multiple of that breakpoint's column count so
// every row stays full (no lonely thumbnail), and smaller on mobile so the
// gallery isn't so tall. Matches the grid's 2 / 3 / 4 / 5 columns.
function pageSizeFor(width: number): number {
    if (width >= 1280) return 15; // 5 cols × 3 rows
    if (width >= 640) return 12;  // 3–4 cols × 3–4 rows
    return 8;                     // 2 cols × 4 rows
}
function usePageSize(): number {
    const [n, setN] = useState(() => (typeof window !== "undefined" ? pageSizeFor(window.innerWidth) : 15));
    useEffect(() => {
        const onResize = () => setN(pageSizeFor(window.innerWidth));
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);
    return n;
}

// Compact page list with ellipses (e.g. 1 … 5 6 7 … 13). The block containing
// the current page always shows at least 3 numbers — so on page 1 you get
// "1 2 3 … 14", not "1 2 … 14".
function getPageItems(current: number, total: number): (number | "…")[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    let start = Math.max(1, current - 1);
    let end = Math.min(total, current + 1);
    if (start === 1) end = Math.max(end, 3);             // extend at the start
    if (end === total) start = Math.min(start, total - 2); // extend at the end
    const items: (number | "…")[] = [1];
    if (start > 2) items.push("…");
    for (let p = Math.max(2, start); p <= Math.min(total - 1, end); p++) items.push(p);
    if (end < total - 1) items.push("…");
    items.push(total);
    return items;
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────
function Lightbox({ image, onClose, onPrev, onNext }) {
    if (!image) return null;
    return (
        <dialog className="modal modal-open">
            {/* Transparent stage centered in the viewport; the inner wrapper shrinks
                to the image so the controls hug the photo (no grey panels, no empty
                floating space) for any aspect ratio. */}
            <div className="modal-box bg-transparent shadow-none p-0 w-fit max-w-none h-fit max-h-none overflow-visible">
                <div className="relative inline-block">
                    <img
                        src={image.src}
                        alt={image.alt}
                        decoding="async"
                        className="block max-h-[85vh] max-w-[90vw] object-contain rounded-lg"
                    />

                    {/* Arrows are vertically centered by a flex wrapper (NOT a transform),
                        so DaisyUI's :active press transform can't shift their position. */}
                    <button
                        className="btn btn-sm btn-circle bg-base-100/80 hover:bg-base-100 border-none shadow absolute top-2 right-2 z-10"
                        onClick={onClose}
                        aria-label="Close"
                    >✕</button>
                    <div className="absolute inset-y-0 left-2 z-10 flex items-center pointer-events-none">
                        <button
                            className="btn btn-circle bg-base-100/80 hover:bg-base-100 border-none shadow pointer-events-auto"
                            onClick={onPrev}
                            aria-label="Previous"
                        >‹</button>
                    </div>
                    <div className="absolute inset-y-0 right-2 z-10 flex items-center pointer-events-none">
                        <button
                            className="btn btn-circle bg-base-100/80 hover:bg-base-100 border-none shadow pointer-events-auto"
                            onClick={onNext}
                            aria-label="Next"
                        >›</button>
                    </div>
                </div>
            </div>

            <form method="dialog" className="modal-backdrop">
                <button onClick={onClose}>close</button>
            </form>
        </dialog>
    );
}

// ─── Gallery ──────────────────────────────────────────────────────────────────
export const Gallery = () => {
    const [active, setActive] = useState("All");
    const [lightbox, setLightbox] = useState<number | null>(null)
    const [page, setPage] = useState(1);
    const perPage = usePageSize();

    const filtered = useMemo(
        () => (active === "All" ? IMAGES : IMAGES.filter((img) => img.category === active)),
        [active],
    );

    const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
    const paginated = useMemo(
        () => filtered.slice((page - 1) * perPage, page * perPage),
        [filtered, page, perPage],
    );

    // Keep the current page valid when the page size shrinks (e.g. on resize).
    useEffect(() => {
        if (page > totalPages) setPage(totalPages);
    }, [page, totalPages]);

    // Preload the neighbouring full-res images so lightbox arrow navigation is instant.
    useEffect(() => {
        if (lightbox === null) return;
        for (const j of [lightbox - 1, lightbox + 1]) {
            const neighbor = filtered[(j + filtered.length) % filtered.length];
            if (neighbor) new Image().src = neighbor.src;
        }
    }, [lightbox, filtered]);

    // Keyboard controls while the lightbox is open: Esc closes, arrows navigate.
    useEffect(() => {
        if (lightbox === null) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setLightbox(null);
            else if (e.key === "ArrowLeft") setLightbox((i) => i !== null ? (i - 1 + filtered.length) % filtered.length : 0);
            else if (e.key === "ArrowRight") setLightbox((i) => i !== null ? (i + 1) % filtered.length : 0);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [lightbox, filtered.length]);

    const open = (i) => setLightbox((page - 1) * perPage + i); // global index
    const close = () => setLightbox(null);
    const prev = () => setLightbox((i) => i !== null ? (i - 1 + filtered.length) % filtered.length : 0);
    const next = () => setLightbox((i) => i !== null ? (i + 1) % filtered.length : 0);

    const changeCategory = (cat) => {
        setActive(cat);
        setPage(1);
        setLightbox(null);
    };

    const goToPage = (p) => {
        setPage(p);
        setLightbox(null);
    };

    return (
        <section className="p-6 md:p-10 bg-base-200 border-2 border-secondary rounded-md">

            {/* ── Category filter ── */}
            <div className="flex items-center justify-center py-4 md:py-8 flex-wrap gap-y-3" id="gallery">
                {CATEGORIES.map((cat) => (
                    <button
                        key={cat}
                        type="button"
                        onClick={() => changeCategory(cat)}
                        className={[
                            "btn btn-sm md:btn-md rounded-full me-3 mb-1",
                            active === cat ? "btn-primary" : "btn-outline btn-ghost",
                        ].join(" ")}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* ── Image grid ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                {paginated.map((img, i) => (
                    <button
                        key={img.id}
                        type="button"
                        aria-label={`View ${img.alt}`}
                        className="group relative p-0 overflow-hidden rounded-xl border border-base-300 bg-base-100 shadow-sm cursor-pointer transition-all duration-300 hover:shadow-lg hover:border-primary/50 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        onClick={() => open(i)}
                    >
                        <img
                            src={img.src}
                            srcSet={img.srcset}
                            sizes={GRID_SIZES}
                            alt={img.alt}
                            loading="lazy"
                            decoding="async"
                            className="aspect-square w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                        />
                        {/* hover overlay + expand affordance */}
                        <div className="absolute inset-0 flex items-center justify-center bg-base-content/0 group-hover:bg-base-content/25 transition-colors duration-300">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="w-7 h-7 text-white drop-shadow opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300"
                            >
                                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                            </svg>
                        </div>
                    </button>
                ))}
            </div>

            {/* ── Pagination (windowed, stays compact on mobile) ── */}
            {totalPages > 1 && (
                <div className="flex justify-center mt-8">
                    <div className="join">
                        <button
                            className="join-item btn btn-sm"
                            onClick={() => goToPage(page - 1)}
                            disabled={page === 1}
                            aria-label="Previous page"
                        >«</button>

                        {getPageItems(page, totalPages).map((p, idx) =>
                            p === "…" ? (
                                <button key={`gap-${idx}`} className="join-item btn btn-sm btn-disabled pointer-events-none" tabIndex={-1}>…</button>
                            ) : (
                                <button
                                    key={p}
                                    className={`join-item btn btn-sm ${p === page ? "btn-primary" : ""}`}
                                    onClick={() => goToPage(p)}
                                    aria-current={p === page ? "page" : undefined}
                                >
                                    {p}
                                </button>
                            ),
                        )}

                        <button
                            className="join-item btn btn-sm"
                            onClick={() => goToPage(page + 1)}
                            disabled={page === totalPages}
                            aria-label="Next page"
                        >»</button>
                    </div>
                </div>
            )}

            {/* ── Lightbox ── */}
            {lightbox !== null && (
                <Lightbox
                    image={filtered[lightbox]}
                    onClose={close}
                    onPrev={prev}
                    onNext={next}
                />
            )}
        </section>
    );
};
