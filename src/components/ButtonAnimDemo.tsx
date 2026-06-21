import resumePDF from "../assets/Gordon Zhong 2026 Resume.pdf";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

function DownloadIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
        </svg>
    );
}

const DEMOS = [
    {
        id: "glint",
        label: "1 — Shimmer / Glint Sweep",
        description: "A diagonal highlight slides across the surface then pauses. De-facto standard on app store and SaaS download CTAs.",
        button: (
            <a href={resumePDF} download className="btn-anim-glint btn btn-primary btn-sm gap-2">
                <DownloadIcon /> Download Resume
            </a>
        ),
    },
    {
        id: "glow",
        label: "2 — Glow Pulse",
        description: "The box-shadow breathes in and out using the primary brand color. No movement — just light intensity. Feels premium.",
        button: (
            <a href={resumePDF} download className="btn-anim-glow btn btn-primary btn-sm gap-2">
                <DownloadIcon /> Download Resume
            </a>
        ),
    },
    {
        id: "border",
        label: "3 — Rotating Border",
        description: "A conic-gradient arc sweeps around the button perimeter like a scanner ring. Common in AI product UIs.",
        button: (
            <div className="btn-anim-border-wrap">
                <a href={resumePDF} download className="btn btn-primary btn-sm gap-2">
                    <DownloadIcon /> Download Resume
                </a>
            </div>
        ),
    },
    {
        id: "throb",
        label: "4 — Soft Scale Throb",
        description: "The whole button gently swells on a slow loop — almost subliminal at rest, but catches peripheral vision.",
        button: (
            <a href={resumePDF} download className="btn-anim-throb btn btn-primary btn-sm gap-2">
                <DownloadIcon /> Download Resume
            </a>
        ),
    },
    {
        id: "icon",
        label: "5 — Icon Nudge",
        description: "The button is completely still. Only the download arrow slides down periodically — minimal, readable, unmistakably a download.",
        button: (
            <a href={resumePDF} download className="btn btn-primary btn-sm gap-2">
                <span className="btn-anim-icon-nudge"><DownloadIcon /></span>
                Download Resume
            </a>
        ),
    },
];

export default function ButtonAnimDemo() {
    return (
        <div className="container mx-auto w-full overflow-x-hidden pt-18 bg-base-100 rounded-md">
            <Navbar />
            <div className="mockup-window border bg-base-300 !border-neutral dark:border-white rounded-md !overflow-visible">
                <div className="border-t !border-neutral dark:border-white px-4 pt-8 pb-12 rounded-md">
                    <div className="max-w-2xl mx-auto">
                        <p className="text-xs uppercase tracking-[0.3em] text-primary font-semibold mb-2">
                            Design Preview
                        </p>
                        <h1 className="text-2xl font-bold text-base-content mb-1">
                            Button Animations
                        </h1>
                        <p className="text-sm text-base-content/60 mb-10">
                            All five options running live. Pick one and I'll apply it.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            {DEMOS.map((d) => (
                                <div
                                    key={d.id}
                                    className="bg-base-200 border border-base-content/10 rounded-md p-6 flex flex-col gap-5"
                                >
                                    <div className="flex items-center justify-center min-h-[60px]">
                                        {d.button}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-sm text-base-content">{d.label}</p>
                                        <p className="text-xs text-base-content/60 mt-1 leading-relaxed">{d.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
}
