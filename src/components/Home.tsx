import { Hero } from "./Hero";
// import { AboutMe } from "./AboutMe";
// import { Milestones } from "./Milestones";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { Gallery } from "./Gallery/Gallery";
import { Resume } from "./Resume";
import { Portfolio } from "./Portfolio";
import { AllocationQuiz } from "./AllocationQuiz";

export const Home = () => {
    return (
        <div className="container mx-auto w-full pt-4 overflow-x-hidden pt-18 bg-base-100 rounded-md">
            <Navbar></Navbar>
            <div className="mockup-window border bg-base-300 !border-neutral dark:border-white rounded-md">
                <div className="border-t !border-neutral dark:border-white px-4 pt-4 pb-8 rounded-md space-y-6">
                    <section>
                        <Hero />
                    </section>
                    <div className="divider divider-primary" />
                    <section id="resume" className="scroll-mt-24">
                        <Resume />
                    </section>
                    <div className="divider divider-primary" />
                    <section id="portfolio" className="scroll-mt-24">
                        <Portfolio />
                    </section>
                    <div className="divider divider-primary" />
                    <section id="gallery" className="scroll-mt-24">
                        <Gallery />
                    </section>

                </div>
            </div>
            <Footer />
        </div>
    );
};