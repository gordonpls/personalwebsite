// Each gallery image is loaded twice via vite-imagetools:
//  - `srcset`: small responsive thumbnails (200/400/600w webp) for the grid,
//    so a tile downloads ~15-30KB instead of the full 400-600KB original.
//  - `src`: the untouched full-resolution original, used only by the lightbox.
// The browser picks the right thumbnail from `srcset` using the grid's `sizes`.

export type GalleryImage = {
    id: string;
    category: string;
    src: string;     // full-res original (lightbox)
    srcset: string;  // responsive thumbnails (grid)
    alt: string;
};

type GlobMap = Record<string, unknown>;

// Fisher–Yates shuffle (returns a new array).
function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function build(city: string, thumbs: GlobMap, full: GlobMap): GalleryImage[] {
    return Object.keys(full)
        .sort()
        .map((path, i) => ({
            id: `${city}-${i}`,
            category: city,
            src: full[path] as string,
            srcset: thumbs[path] as string,
            alt: (path.split("/").pop() || "").replace(".webp", "").replace(/-/g, " "),
        }));
}

// NOTE: import.meta.glob requires literal patterns AND literal options objects
// (Vite analyzes them statically), so the options can't be hoisted into a const.
const ALL: GalleryImage[] = [
    ...build(
        "Denver",
        import.meta.glob("../../assets/gallery/denver/*.webp", { query: { w: "200;400;600", format: "webp", as: "srcset" }, import: "default", eager: true }),
        import.meta.glob("../../assets/gallery/denver/*.webp", { import: "default", eager: true }),
    ),
    ...build(
        "Thailand",
        import.meta.glob("../../assets/gallery/thailand/*.webp", { query: { w: "200;400;600", format: "webp", as: "srcset" }, import: "default", eager: true }),
        import.meta.glob("../../assets/gallery/thailand/*.webp", { import: "default", eager: true }),
    ),
    ...build(
        "Vegas",
        import.meta.glob("../../assets/gallery/vegas/*.webp", { query: { w: "200;400;600", format: "webp", as: "srcset" }, import: "default", eager: true }),
        import.meta.glob("../../assets/gallery/vegas/*.webp", { import: "default", eager: true }),
    ),
    ...build(
        "New York",
        import.meta.glob("../../assets/gallery/newyork/*.webp", { query: { w: "200;400;600", format: "webp", as: "srcset" }, import: "default", eager: true }),
        import.meta.glob("../../assets/gallery/newyork/*.webp", { import: "default", eager: true }),
    ),
];

// Shuffle once per page load so each session sees a fresh order. Stable across
// re-renders, filtering, and pagination within the session.
export const IMAGES: GalleryImage[] = shuffle(ALL);
