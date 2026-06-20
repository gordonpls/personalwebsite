import { useState } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { ResumeTimeline } from "./ResumeTimeline";
import { ResumeTimelineDaisy } from "./ResumeTimelineDaisy";

type Design = "A" | "B";

const DESIGNS: { id: Design; label: string; description: string }[] = [
    {
        id: "A",
        label: "Design A — Custom",
        description: "Left-rail dot spine · open content · typography-first",
    },
    {
        id: "B",
        label: "Design B — DaisyUI",
        description: "Centered spine · icon nodes · timeline-box cards",
    },
];

export default function TimelineCompare() {
    const [active, setActive] = useState<Design>("A");

    return (
        <div className="container mx-auto w-full overflow-x-hidden pt-18 bg-base-100 rounded-md">
            <Navbar />
            <div className="mockup-window border bg-base-300 !border-neutral dark:border-white rounded-md !overflow-visible">
                <div className="border-t !border-neutral dark:border-white px-4 pt-6 pb-8 rounded-md space-y-6">

                    {/* Header */}
                    <div className="text-center max-w-lg mx-auto">
                        <p className="text-xs uppercase tracking-[0.3em] text-primary font-semibold mb-2">
                            Compare
                        </p>
                        <h1 className="text-2xl md:text-3xl font-bold text-base-content mb-2">
                            Timeline Designs
                        </h1>
                        <p className="text-sm text-base-content/60">
                            Same content, two visual approaches. Toggle between them to compare.
                        </p>
                    </div>

                    {/* Toggle */}
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        {DESIGNS.map((d) => (
                            <button
                                key={d.id}
                                onClick={() => setActive(d.id)}
                                className={`flex flex-col items-start sm:items-center gap-0.5 px-5 py-3 rounded-lg border-2 transition-colors text-left sm:text-center ${
                                    active === d.id
                                        ? "border-primary bg-primary/10 text-base-content"
                                        : "border-base-content/15 bg-base-100 text-base-content/60 hover:border-base-content/30"
                                }`}
                            >
                                <span className="font-semibold text-sm">{d.label}</span>
                                <span className="text-xs opacity-70">{d.description}</span>
                            </button>
                        ))}
                    </div>

                    {/* Active design */}
                    <div>
                        {active === "A" ? <ResumeTimeline /> : <ResumeTimelineDaisy />}
                    </div>

                </div>
            </div>
            <Footer />
        </div>
    );
}
