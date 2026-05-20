import { useState } from "react";
import { ThailandImages, VegasImages, DenverImages } from "./GalleryImages";

// ─── Data ─────────────────────────────────────────────────────────────────────
// Convert each city's { filename: url } object into a flat array of image items
const toImageList = (obj, city) =>
  Object.entries(obj).map(([name, src], i) => ({
    id: `${city}-${i}`,
    category: city,
    src,
    alt: name.replace(/-/g, " "),
  }));

const IMAGES = [
  ...toImageList(DenverImages,   "Denver"),
  ...toImageList(ThailandImages, "Thailand"),
  ...toImageList(VegasImages,    "Vegas"),
];

const CATEGORIES = ["All", "Denver", "Thailand", "Vegas"];

// ─── Lightbox modal (uses DaisyUI modal) ─────────────────────────────────────
function Lightbox({ image, onClose, onPrev, onNext }) {
  if (!image) return null;
  return (
    <dialog id="gallery_lightbox" className="modal modal-open">
      <div className="modal-box max-w-3xl p-0 bg-base-100 overflow-hidden relative">
        {/* Close */}
        <button
          className="btn btn-sm btn-circle btn-ghost absolute top-3 right-3 z-10"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>
        {/* Prev */}
        <button
          className="btn btn-sm btn-circle btn-ghost absolute left-3 top-1/2 -translate-y-1/2 z-10"
          onClick={onPrev}
          aria-label="Previous"
        >
          ‹
        </button>
        <img
          src={image.src}
          alt={image.alt}
          className="w-full h-auto object-contain max-h-[80vh]"
        />
        {/* Next */}
        <button
          className="btn btn-sm btn-circle btn-ghost absolute right-3 top-1/2 -translate-y-1/2 z-10"
          onClick={onNext}
          aria-label="Next"
        >
          ›
        </button>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}

// ─── Gallery ──────────────────────────────────────────────────────────────────
export const Gallery = () => {
  const [active, setActive]   = useState("All");
  const [lightbox, setLightbox] = useState(null); // index into filtered

  const filtered = active === "All"
    ? IMAGES
    : IMAGES.filter((img) => img.category === active);

  const open  = (i) => setLightbox(i);
  const close = ()  => setLightbox(null);
  const prev  = ()  => setLightbox((i) => (i - 1 + filtered.length) % filtered.length);
  const next  = ()  => setLightbox((i) => (i + 1) % filtered.length);

  return (
    <section className="p-6 md:p-10">

      {/* ── Category filter ── */}
      <div className="flex items-center justify-center py-4 md:py-8 flex-wrap gap-y-3">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => { setActive(cat); setLightbox(null); }}
            className={[
              "btn btn-sm md:btn-md rounded-full me-3 mb-1",
              active === cat
                ? "btn-primary"          // DaisyUI primary = active state
                : "btn-outline btn-ghost" // subtle outlined for inactive
            ].join(" ")}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* ── Image grid ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {filtered.map((img, i) => (
          <div
            key={img.id}
            className="overflow-hidden rounded-box cursor-pointer group relative"
            onClick={() => open(i)}
          >
            <img
              src={img.src}
              alt={img.alt}
              loading="lazy"
              className="h-auto max-w-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {/* hover overlay */}
            <div className="absolute inset-0 bg-base-content/0 group-hover:bg-base-content/15 transition-colors duration-300 rounded-box" />
          </div>
        ))}
      </div>

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
}
