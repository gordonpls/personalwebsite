import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Hero } from "./Hero";
import { AboutMe } from "./AboutMe";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { Gallery } from "./Gallery/Gallery";
import { Highlights } from "./Highlights";
import { Resume } from "./Resume";
import { ResumeTimeline } from "./ResumeTimeline";
import { Projects } from "./Projects";
import { Reveal } from "./Reveal";

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
        <div className="container mx-auto w-full pt-4 overflow-x-hidden pt-18 bg-base-100 rounded-md">
            <Navbar></Navbar>
            <div className="mockup-window border bg-base-300 !border-neutral dark:border-white rounded-md !overflow-visible">
                <div className="border-t !border-neutral dark:border-white px-4 pt-4 pb-8 rounded-md space-y-6">
                    <section>
                        <Hero />
                    </section>
                    <div className="divider divider-primary" />
                    <section id="about" className="scroll-mt-24">
                        <Reveal><AboutMe /></Reveal>
                    </section>
                    <div className="divider divider-primary" />
                    <section id="resume" className="scroll-mt-24">
                        <Reveal><Resume /></Reveal>
                    </section>
                    <div className="divider divider-primary" />
                    <section id="timeline" className="scroll-mt-24">
                        <Reveal><ResumeTimeline /></Reveal>
                    </section>
                    <div className="divider divider-primary" />
                    <section id="projects" className="scroll-mt-24">
                        <Reveal><Projects /></Reveal>
                    </section>
                    <div className="divider divider-primary" />
                    <section id="highlights" className="scroll-mt-24">
                        <Reveal><Highlights /></Reveal>
                    </section>
                    <div className="divider divider-primary" />
                    <section id="gallery" className="scroll-mt-24">
                        <Reveal><Gallery /></Reveal>
                    </section>

                </div>
            </div>
            <Footer />
        </div>
    );
};