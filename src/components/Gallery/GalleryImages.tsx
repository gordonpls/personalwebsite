// Each gallery image is loaded three ways via vite-imagetools:
//  - `srcset`: small responsive thumbnails (200/400/600w webp) for the grid,
//    so a tile downloads ~15-30KB instead of the full 400-600KB original.
//  - `src`: the untouched full-resolution original, used only by the lightbox.
//  - `metadata`: intrinsic width/height, so layouts that need the real aspect
//    ratio (e.g. masonry) can reserve space up-front and avoid load-time reflow.
// The browser picks the right thumbnail from `srcset` using the grid's `sizes`.

export type GalleryImage = {
    id: string;
    category: string;
    src: string;     // full-res original (lightbox)
    srcset: string;  // responsive thumbnails (grid)
    alt: string;
    width?: number;  // intrinsic pixel width
    height?: number; // intrinsic pixel height
    aspect?: number; // width / height (undefined if metadata missing)
};

type GlobMap = Record<string, unknown>;
type ImageMeta = { width?: number; height?: number };

// Canonical album list + display order. An album can appear here with no photos
// yet (e.g. a new trip) — consumers should render a "Coming Soon" state for it
// rather than hiding it. Names must match the build() city argument below.
export const ALBUM_NAMES = ["Denver", "Thailand", "Vegas", "New York", "Japan"];

// Fisher–Yates shuffle (returns a new array).
function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function build(city: string, thumbs: GlobMap, full: GlobMap, meta: GlobMap): GalleryImage[] {
    return Object.keys(full)
        .sort()
        .map((path, i) => {
            const m = meta[path] as ImageMeta | undefined;
            const width = m?.width;
            const height = m?.height;
            return {
                id: `${city}-${i}`,
                category: city,
                src: full[path] as string,
                srcset: thumbs[path] as string,
                alt: (path.split("/").pop() || "").replace(".webp", "").replace(/-/g, " "),
                width,
                height,
                aspect: width && height ? width / height : undefined,
            };
        });
}

// NOTE: import.meta.glob requires literal patterns AND literal options objects
// (Vite analyzes them statically), so the options can't be hoisted into a const.
const ALL: GalleryImage[] = [
    ...build(
        "Denver",
        import.meta.glob("../../assets/gallery/denver/*.webp", { query: { w: "200;400;600", format: "webp", as: "srcset" }, import: "default", eager: true }),
        import.meta.glob("../../assets/gallery/denver/*.webp", { import: "default", eager: true }),
        import.meta.glob("../../assets/gallery/denver/*.webp", { query: { as: "metadata" }, import: "default", eager: true }),
    ),
    ...build(
        "Thailand",
        import.meta.glob("../../assets/gallery/thailand/*.webp", { query: { w: "200;400;600", format: "webp", as: "srcset" }, import: "default", eager: true }),
        import.meta.glob("../../assets/gallery/thailand/*.webp", { import: "default", eager: true }),
        import.meta.glob("../../assets/gallery/thailand/*.webp", { query: { as: "metadata" }, import: "default", eager: true }),
    ),
    ...build(
        "Vegas",
        import.meta.glob("../../assets/gallery/vegas/*.webp", { query: { w: "200;400;600", format: "webp", as: "srcset" }, import: "default", eager: true }),
        import.meta.glob("../../assets/gallery/vegas/*.webp", { import: "default", eager: true }),
        import.meta.glob("../../assets/gallery/vegas/*.webp", { query: { as: "metadata" }, import: "default", eager: true }),
    ),
    ...build(
        "New York",
        import.meta.glob("../../assets/gallery/newyork/*.webp", { query: { w: "200;400;600", format: "webp", as: "srcset" }, import: "default", eager: true }),
        import.meta.glob("../../assets/gallery/newyork/*.webp", { import: "default", eager: true }),
        import.meta.glob("../../assets/gallery/newyork/*.webp", { query: { as: "metadata" }, import: "default", eager: true }),
    ),
    ...build(
        "Japan",
        import.meta.glob("../../assets/gallery/japan/*.webp", { query: { w: "200;400;600", format: "webp", as: "srcset" }, import: "default", eager: true }),
        import.meta.glob("../../assets/gallery/japan/*.webp", { import: "default", eager: true }),
        import.meta.glob("../../assets/gallery/japan/*.webp", { query: { as: "metadata" }, import: "default", eager: true }),
    ),
];

// Shuffle once per page load so each session sees a fresh order. Stable across
// re-renders, filtering, and pagination within the session.
export const IMAGES: GalleryImage[] = shuffle(ALL);
