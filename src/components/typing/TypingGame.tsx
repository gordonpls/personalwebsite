// /typing — Typing Game project page. Skeleton for now: the game itself is
// "coming soon", and the coming-soon sign is a playable typing teaser built on
// useTypingSession, which the real game will reuse.

import { Navbar } from "../Navbar";
import { Footer } from "../Footer";
import { SectionHeading } from "../SectionHeading";
import { ComingSoonTyper } from "./ComingSoonTyper";

// What's planned, shown as ghost cards under the teaser.
const ROADMAP = [
    { title: "Timed runs", body: "15, 30 and 60 second sprints." },
    { title: "Word packs", body: "Code, finance jargon, food." },
    { title: "Personal bests", body: "Your WPM history, saved locally." },
];

export default function TypingGame() {
    return (
        <div className="container mx-auto w-full pt-4 overflow-x-clip bg-base-100 rounded-md">
            <div className="mockup-window border bg-base-300 !border-neutral dark:border-white rounded-md !overflow-visible !pt-0 before:!hidden">
                <Navbar embedded />
                <div className="px-4 pt-6 pb-16 space-y-12">
                    <SectionHeading
                        className="mx-auto max-w-3xl"
                        eyebrow="Typing Game"
                        title="Not quite ready yet"
                        description="The full game is still being built. In the meantime, the sign below is typeable."
                    />

                    <ComingSoonTyper />

                    <ul className="mx-auto grid max-w-3xl gap-3 sm:grid-cols-3">
                        {ROADMAP.map((r) => (
                            <li key={r.title} className="rounded-xl border border-dashed border-base-content/20 p-4">
                                <div className="flex items-center justify-between gap-2">
                                    <h3 className="font-semibold text-base-content">{r.title}</h3>
                                    <span className="badge badge-ghost badge-sm">soon</span>
                                </div>
                                <p className="mt-1 text-sm text-base-content/60">{r.body}</p>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
            <Footer />
        </div>
    );
}
