import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { NowPlaying } from "./NowPlaying";

// A lightweight /now page (nownownow.com style) — a snapshot of the present.
const CURRENTLY = [
    "Building out this site — finance dashboards, data pipelines, and small interactive touches.",
    "Investing through Vanguard & Robinhood; the Portfolio page is my real, live book.",
    "Exploring stablecoin infrastructure (see the Stablecoin dashboard).",
];

export default function Now() {
    return (
        <div className="container mx-auto w-full pt-4 overflow-x-hidden pt-18 bg-base-100 rounded-md">
            <Navbar />
            <div className="mockup-window border bg-base-300 !border-neutral dark:border-white rounded-md !overflow-visible">
                <div className="border-t !border-neutral dark:border-white px-4 pt-4 pb-8 rounded-md space-y-6">
                    <section className="max-w-2xl">
                        <h1 className="text-2xl font-bold text-base-content">Now</h1>
                        <p className="text-sm text-base-content/60 mt-1 mb-6">A snapshot of what I'm focused on at the moment.</p>

                        <NowPlaying />

                        <div className="bg-base-100 border border-base-300 rounded-2xl p-5 mt-4">
                            <p className="text-xs uppercase tracking-widest text-base-content/40 font-medium mb-3">Currently</p>
                            <ul className="space-y-2">
                                {CURRENTLY.map((c) => (
                                    <li key={c} className="flex gap-2.5 text-sm text-base-content/80">
                                        <span className="text-primary mt-0.5">▹</span>{c}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </section>
                </div>
            </div>
            <Footer />
        </div>
    );
}
