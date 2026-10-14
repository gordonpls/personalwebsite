import { lazy, Suspense, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Hero } from "./Hero";
import { AboutMe } from "./AboutMe";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { ResumeTimeline } from "./ResumeTimeline";
import { Projects } from "./Projects";
import { Reveal } from "./Reveal";

// Heavy, below-the-fold sections kept off the initial critical path. The gallery
// alone eager-imports ~600 image modules (204 photos × srcset/full/metadata);
// importing it synchronously blocks first paint (long white screen) until all of
// them resolve. Lazy-loading lets the page render immediately and these stream
// in afterward — and code-splits them out of the initial bundle in production.
const Highlights = lazy(() => import("./Highlights").then((m) => ({ default: m.Highlights })));
const Gallery = lazy(() => import("./Gallery/Gallery").then((m) => ({ default: m.Gallery })));

const SectionLoading = () => (
    <div className="flex min-h-[40vh] items-center justify-center rounded-md border-2 border-secondary bg-base-200">
        <span className="loading loading-spinner loading-lg text-primary" />
    </div>
);

export const Home = () => {
    const location = useLocation();

    // The /about, /resume, etc. routes redirect to "/#about", "/#resume" (see
    // App.tsx). React Router updates the hash but never scrolls, so do it here.
    // Plain scrollIntoView() inherits `scroll-behavior: smooth` from CSS, which
    // matches a native anchor click and respects prefers-reduced-motion.
    useEffect(() => {
        if (!location.hash) return;
        const el = document.getElementById(location.hash.slice(1));
        if (el) requestAnimationFrame(() => el.scrollIntoView());
    }, [location.hash]);

    return (
        // overflow-x-clip (not hidden) so the sticky title-bar navbar still sticks.
        <div className="container mx-auto w-full pt-4 overflow-x-clip bg-base-100 rounded-md">
            <div className="mockup-window border bg-base-300 !border-neutral dark:border-white rounded-md !overflow-visible !pt-0 before:!hidden">
                <Navbar embedded />
                <div className="px-4 pt-2 pb-8 space-y-6">
                    <section>
                        <Hero />
                    </section>
                    <div className="divider divider-quiet" />
                    <section id="about" className="scroll-mt-20">
                        <Reveal><AboutMe /></Reveal>
                    </section>
                    <div className="divider divider-quiet" />
                    <section id="resume" className="scroll-mt-20">
                        <Reveal><ResumeTimeline /></Reveal>
                    </section>
                    <div className="divider divider-quiet" />
                    <section id="projects" className="scroll-mt-20">
                        <Reveal><Projects /></Reveal>
                    </section>
                    <div className="divider divider-quiet" />
                    <section id="highlights" className="scroll-mt-20">
                        <Reveal>
                            <Suspense fallback={<SectionLoading />}>
                                <Highlights />
                            </Suspense>
                        </Reveal>
                    </section>
                    <div className="divider divider-quiet" />
                    <section id="gallery" className="scroll-mt-20">
                        <Reveal>
                            <Suspense fallback={<SectionLoading />}>
                                <Gallery />
                            </Suspense>
                        </Reveal>
                    </section>

                </div>
            </div>
            <Footer />
        </div>
    );
};