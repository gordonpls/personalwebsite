import { useEffect, useMemo, useState } from "react";
import { ALBUM_NAMES, IMAGES, type GalleryImage } from "./GalleryImages";
import { SectionHeading } from "../SectionHeading";

// ─── Config ───────────────────────────────────────────────────────────────────
// Grid tile rendered width per breakpoint (cols: 2 / 3 / 4 / 5), so the browser
// can pick the smallest adequate thumbnail from srcset.
const GRID_SIZES = "(min-width:1280px) 20vw, (min-width:1024px) 25vw, (min-width:640px) 33vw, 50vw";

const CATEGORIES = ["All", ...ALBUM_NAMES];
const POPULATED = [...new Set(IMAGES.map((i) => i.category))]; // albums that have photos
const PREVIEW_N = 12; // photos shown inline before "View full gallery"

// Interleave one photo per album in turn so the "All" preview shows a spread
// across locations instead of whatever the shuffle happened to front-load.
function spreadAcrossAlbums(images: GalleryImage[], n: number): GalleryImage[] {
    const buckets = new Map<string, GalleryImage[]>();
    for (const img of images) {
        const b = buckets.get(img.category) ?? [];
        b.push(img);
        buckets.set(img.category, b);
    }
    const queues = [...buckets.values()];
    const out: GalleryImage[] = [];
    let i = 0;
    while (out.length < n && queues.some((q) => q.length)) {
        const q = queues[i % queues.length];
        if (q.length) out.push(q.shift()!);
        i++;
    }
    return out;
}

// Responsive column count for the fixed-column masonry (matches 2 / 3 / 4 / 5).
function useColumnCount(): number {
    const get = (w: number) => (w >= 1280 ? 5 : w >= 1024 ? 4 : w >= 640 ? 3 : 2);
    const [n, setN] = useState(() => (typeof window !== "undefined" ? get(window.innerWidth) : 4));
    useEffect(() => {
        const onResize = () => setN(get(window.innerWidth));
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);
    return n;
}

// ─── Album pill ─────────────────────────────────────────────────────────────
// Small bottom-right indicator of which album a photo came from. Shown only on
// the "All" view (redundant once filtered to a single album).
function AlbumPill({ category }: { category: string }) {
    return (
        <span className="pointer-events-none absolute bottom-2 right-2 z-10 rounded-full bg-black/65 px-2.5 py-0.5 text-xs font-medium text-white shadow backdrop-blur-sm">
            {category}
        </span>
    );
}

// ─── Masonry grid ─────────────────────────────────────────────────────────────
// Fixed-column layout: images are distributed into N columns (shortest-column
// first, using known aspect ratios) and each tile reserves its aspect ratio
// up-front, so nothing reflows as images lazy-load.
type OpenFn = (list: GalleryImage[], index: number) => void;

function MasonryGrid({
    images,
    showAlbum,
    onOpen,
}: {
    images: GalleryImage[];
    showAlbum: boolean;
    onOpen: OpenFn;
}) {
    const columnCount = useColumnCount();
    const columns = useMemo(() => {
        const cols: { img: GalleryImage; index: number }[][] = Array.from(
            { length: columnCount },
            () => [],
        );
        const heights = new Array(columnCount).fill(0);
        images.forEach((img, index) => {
            const relHeight = img.aspect ? 1 / img.aspect : 1; // height for unit width
            let target = 0;
            for (let c = 1; c < columnCount; c++) if (heights[c] < heights[target]) target = c;
            cols[target].push({ img, index });
            heights[target] += relHeight;
        });
        return cols;
    }, [images, columnCount]);

    return (
        <div className="flex gap-3 sm:gap-4">
            {columns.map((col, ci) => (
                <div key={ci} className="flex min-w-0 flex-1 flex-col gap-3 sm:gap-4">
                    {col.map(({ img, index }) => (
                        <button
                            key={img.id}
                            type="button"
                            aria-label={`View ${img.alt} from ${img.category}`}
                            onClick={() => onOpen(images, index)}
                            style={{ aspectRatio: img.aspect ?? 1 }}
                            className="group relative block w-full overflow-hidden rounded-xl border border-base-300 bg-base-100 p-0 shadow-sm transition-all duration-300 hover:border-primary/50 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                            <img
                                src={img.src}
                                srcSet={img.srcset}
                                sizes={GRID_SIZES}
                                alt={img.alt}
                                loading="lazy"
                                decoding="async"
                                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                            />
                            {showAlbum && <AlbumPill category={img.category} />}
                        </button>
                    ))}
                </div>
            ))}
        </div>
    );
}

// ─── Coming Soon (empty album) ───────────────────────────────────────────────
const SKELETON_ASPECTS = [1, 0.75, 1.3, 0.66, 1, 1.5, 0.8, 1.1, 0.7, 1.25, 0.9, 1];
function ComingSoon({ album }: { album: string }) {
    return (
        <div className="relative">
            <div className="flex gap-3 sm:gap-4" aria-hidden="true">
                {[0, 1, 2, 3].map((col) => (
                    <div key={col} className="flex flex-1 flex-col gap-3 sm:gap-4">
                        {SKELETON_ASPECTS.filter((_, i) => i % 4 === col).map((ar, i) => (
                            <div key={i} className="skeleton w-full rounded-xl" style={{ aspectRatio: ar }} />
                        ))}
                    </div>
                ))}
            </div>
            <div className="absolute inset-0 bg-base-200/55" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-base-100 shadow-md ring-1 ring-base-300">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-8 w-8 text-primary"
                    >
                        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
                        <circle cx="12" cy="13" r="3.5" />
                    </svg>
                </div>
                <h3 className="text-2xl font-bold">Coming Soon</h3>
                <p className="max-w-xs text-sm text-base-content/70">
                    Photos from <span className="font-semibold text-base-content">{album}</span> are on
                    the way — check back soon.
                </p>
            </div>
        </div>
    );
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────
function Lightbox({
    image,
    onClose,
    onPrev,
    onNext,
}: {
    image: GalleryImage | null;
    onClose: () => void;
    onPrev: () => void;
    onNext: () => void;
}) {
    if (!image) return null;
    return (
        // z above the full-gallery modal (DaisyUI .modal is z-index:999).
        <dialog className="modal modal-open z-[1000]">
            <div className="modal-box h-fit max-h-none w-fit max-w-none overflow-visible bg-transparent p-0 shadow-none">
                <div className="relative inline-block">
                    <img
                        src={image.src}
                        alt={image.alt}
                        decoding="async"
                        className="block max-h-[85vh] max-w-[90vw] rounded-lg object-contain"
                    />
                    <button
                        className="btn btn-circle btn-sm absolute right-2 top-2 z-10 border-none bg-base-100/80 shadow hover:bg-base-100"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        ✕
                    </button>
                    <div className="pointer-events-none absolute inset-y-0 left-2 z-10 flex items-center">
                        <button
                            className="btn btn-circle pointer-events-auto border-none bg-base-100/80 shadow hover:bg-base-100"
                            onClick={onPrev}
                            aria-label="Previous"
                        >
                            ‹
                        </button>
                    </div>
                    <div className="pointer-events-none absolute inset-y-0 right-2 z-10 flex items-center">
                        <button
                            className="btn btn-circle pointer-events-auto border-none bg-base-100/80 shadow hover:bg-base-100"
                            onClick={onNext}
                            aria-label="Next"
                        >
                            ›
                        </button>
                    </div>
                </div>
            </div>
            <form method="dialog" className="modal-backdrop">
                <button onClick={onClose}>close</button>
            </form>
        </dialog>
    );
}

// ─── Location filter ──────────────────────────────────────────────────────────
function LocationFilter({
    active,
    onChange,
    size,
}: {
    active: string;
    onChange: (cat: string) => void;
    size: string;
}) {
    return (
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
            {CATEGORIES.map((cat) => (
                <button
                    key={cat}
                    type="button"
                    onClick={() => onChange(cat)}
                    className={`btn ${size} rounded-full ${
                        active === cat ? "btn-primary" : "btn-outline btn-ghost"
                    }`}
                >
                    {cat}
                </button>
            ))}
        </div>
    );
}

// ─── Gallery ──────────────────────────────────────────────────────────────────
export const Gallery = () => {
    const [active, setActive] = useState("All");
    const [modalOpen, setModalOpen] = useState(false);
    // Lightbox tracks the list it's navigating + the active index.
    const [lb, setLb] = useState<{ list: GalleryImage[]; index: number } | null>(null);

    const full = useMemo(
        () => (active === "All" ? IMAGES : IMAGES.filter((i) => i.category === active)),
        [active],
    );
    const preview = useMemo(
        () => (active === "All" ? spreadAcrossAlbums(full, PREVIEW_N) : full.slice(0, PREVIEW_N)),
        [active, full],
    );
    const truncated = full.length > preview.length;
    const isEmpty = full.length === 0;
    const showAlbum = active === "All";

    const open: OpenFn = (list, index) => setLb({ list, index });
    const close = () => setLb(null);
    const prev = () =>
        setLb((s) => (s ? { ...s, index: (s.index - 1 + s.list.length) % s.list.length } : s));
    const next = () => setLb((s) => (s ? { ...s, index: (s.index + 1) % s.list.length } : s));
    // Preview clicks navigate the full set (preview order ≠ full order once spread).
    const openFromPreview: OpenFn = (list, i) => open(full, full.indexOf(list[i]));

    // Single keyboard handler with clear Escape priority: an open lightbox closes
    // first (leaving the modal underneath); only then does Escape close the modal.
    useEffect(() => {
        if (!lb && !modalOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                if (lb) close();
                else if (modalOpen) setModalOpen(false);
            } else if (lb && e.key === "ArrowLeft") prev();
            else if (lb && e.key === "ArrowRight") next();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [lb, modalOpen]);

    // Lock background scroll while the full-gallery modal is open.
    useEffect(() => {
        if (!modalOpen) return;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prevOverflow;
        };
    }, [modalOpen]);

    const changeCategory = (cat: string) => {
        setActive(cat);
        close();
    };

    return (
        <section className="p-6 md:p-10 bg-base-200 border-2 border-secondary rounded-md">
            <SectionHeading eyebrow="Gallery" description="the camera eats first!" />

            {/* ── Location filter ── */}
            <div className="py-4 md:py-8">
                <LocationFilter active={active} onChange={changeCategory} size="btn-sm md:btn-md" />
            </div>

            {/* ── Preview ── */}
            {isEmpty ? (
                <ComingSoon album={active === "All" ? "this album" : active} />
            ) : truncated ? (
                <div className="relative">
                    <div className="max-h-[58vh] overflow-hidden">
                        <MasonryGrid images={preview} showAlbum={showAlbum} onOpen={openFromPreview} />
                    </div>
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-base-200 via-base-200/80 to-transparent" />
                    <div className="absolute inset-x-0 bottom-5 flex justify-center">
                        <button
                            type="button"
                            className="btn btn-primary gap-2 shadow-lg"
                            onClick={() => setModalOpen(true)}
                        >
                            View full gallery
                            <span className="badge badge-sm badge-ghost">{full.length}</span>
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    <MasonryGrid images={preview} showAlbum={showAlbum} onOpen={openFromPreview} />
                    <div className="mt-5 flex justify-center">
                        <button
                            type="button"
                            className="btn btn-outline gap-2"
                            onClick={() => setModalOpen(true)}
                        >
                            Open in full view
                            <span className="badge badge-sm badge-ghost">{full.length}</span>
                        </button>
                    </div>
                </>
            )}

            {/* ── Full gallery modal — scrollable, filterable ── */}
            {modalOpen && (
                <dialog className="modal modal-open">
                    <div className="modal-box max-h-[90vh] w-11/12 max-w-6xl p-0">
                        <div className="sticky top-0 z-10 border-b border-base-300 bg-base-100/95 px-4 py-3 backdrop-blur">
                            <div className="mb-2 flex items-start justify-between gap-3">
                                <div>
                                    <h3 className="font-bold">Photo gallery</h3>
                                    <p className="text-xs text-base-content/60">
                                        {full.length} photos
                                        {active !== "All" ? ` · ${active}` : ` · ${POPULATED.length} albums`}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    className="btn btn-circle btn-sm btn-ghost"
                                    onClick={() => setModalOpen(false)}
                                    aria-label="Close"
                                >
                                    ✕
                                </button>
                            </div>
                            <LocationFilter active={active} onChange={changeCategory} size="btn-xs" />
                        </div>
                        <div className="p-4">
                            {isEmpty ? (
                                <ComingSoon album={active === "All" ? "this album" : active} />
                            ) : (
                                <MasonryGrid images={full} showAlbum={showAlbum} onOpen={open} />
                            )}
                        </div>
                    </div>
                    <form method="dialog" className="modal-backdrop">
                        <button onClick={() => setModalOpen(false)}>close</button>
                    </form>
                </dialog>
            )}

            {/* ── Lightbox ── */}
            <Lightbox
                image={lb ? lb.list[lb.index] : null}
                onClose={close}
                onPrev={prev}
                onNext={next}
            />
        </section>
    );
};
