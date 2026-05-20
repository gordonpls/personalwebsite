import { useState } from "react";
import { ThailandImages, VegasImages, DenverImages } from "./GalleryImages";

// ─── Config ───────────────────────────────────────────────────────────────────
const PER_PAGE = 12;

// ─── Build image list from city image maps ────────────────────────────────────
type GalleryImage = {
    id: string;
    category: string;
    src: string;
    alt: string;
}

const toImageList = (obj: Record<string, string>, city: string): GalleryImage[] =>
    Object.entries(obj).map(([name, src], i) => ({
        id: `${city}-${i}`,
        category: city,
        src,
        alt: name.replace(/-/g, " "),
    }));
const IMAGES = [
    ...toImageList(DenverImages, "Denver"),
    ...toImageList(ThailandImages, "Thailand"),
    ...toImageList(VegasImages, "Vegas"),
];

const CATEGORIES = ["All", "Denver", "Thailand", "Vegas"];

// ─── Lightbox ─────────────────────────────────────────────────────────────────
function Lightbox({ image, onClose, onPrev, onNext }) {
    if (!image) return null;
    return (
        <dialog className="modal modal-open">
            <div className="modal-box max-w-3xl p-0 bg-base-100 overflow-hidden relative">
                <button
                    className="btn btn-sm btn-circle btn-ghost absolute top-3 right-3 z-10"
                    onClick={onClose}
                    aria-label="Close"
                >✕</button>
                <button
                    className="btn btn-sm btn-circle btn-ghost absolute left-3 top-1/2 -translate-y-1/2 z-10"
                    onClick={onPrev}
                    aria-label="Previous"
                >‹</button>
                <img
                    src={image.src}
                    alt={image.alt}
                    className="w-full h-auto object-contain max-h-[80vh]"
                />
                <button
                    className="btn btn-sm btn-circle btn-ghost absolute right-3 top-1/2 -translate-y-1/2 z-10"
                    onClick={onNext}
                    aria-label="Next"
                >›</button>
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

    const filtered = active === "All"
        ? IMAGES
        : IMAGES.filter((img) => img.category === active);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
    const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

    const open = (i) => setLightbox((page - 1) * PER_PAGE + i); // global index
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
        <section className="p-6 md:p-10 bg-base-200 border-2 border-secondary rounded-md p-4 overflow-hidden">

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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 lg:gap-2">
                {paginated.map((img, i) => (
                    <div
                        key={img.id}
                        className="overflow-hidden rounded-box cursor-pointer group relative"
                        onClick={() => open(i)}
                    >
                        <img
                            src={img.src}
                            alt={img.alt}
                            loading="lazy"
                            className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        {/* hover overlay */}
                        <div className="absolute inset-0 bg-base-content/0 group-hover:bg-base-content/15 transition-colors duration-300 rounded-box" />
                    </div>
                ))}
            </div>

            {/* ── Pagination ── */}
            {totalPages > 1 && (
                <div className="flex justify-center mt-8">
                    <div className="join">
                        <button
                            className="join-item btn btn-sm"
                            onClick={() => goToPage(page - 1)}
                            disabled={page === 1}
                        >«</button>

                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                            <button
                                key={p}
                                className={`join-item btn btn-sm ${p === page ? "btn-primary" : ""}`}
                                onClick={() => goToPage(p)}
                            >
                                {p}
                            </button>
                        ))}

                        <button
                            className="join-item btn btn-sm"
                            onClick={() => goToPage(page + 1)}
                            disabled={page === totalPages}
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
