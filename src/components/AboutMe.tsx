import avatar2 from "../assets/avatar2.webp";

// Body prose uses a serif stack so it reads like a personal essay set apart
// from the dashboard typography of the rest of the page.
const SERIF = `"Iowan Old Style", "Palatino Linotype", "Hoefler Text", Georgia, serif`;

const PARAGRAPHS = [
    "I've spent a lot of time thinking about the kind of life I want to build and the kind of person I want to become. Through moments requiring both reflection and strength, I've come to see myself more clearly and develop a stronger sense of purpose. This reflection has helped me understand where I want to go and inspired me to move forward with intention.",
    "Much of that foundation comes from my parents. Growing up, I watched them work tirelessly to create opportunities for our family. I also remember the warmth they brought into everything they did. My father approached his craft with care and precision, while my mother showed me the importance of education and patience. Their example taught me perseverance, dedication, and the discipline to approach things with passion and meticulous planning. I've learned to show up prepared, stay curious, and care about doing things well. The lessons I first learned sitting in the corner of our family's restaurant continue to guide the goals I set and the care I bring to them.",
    "People who know me well often tell me that I have optimistic views. I think this quality was developed slowly. It started from the values I was raised with and grew through the people who have supported me. In time, it became tied to a belief I hold closely: even when life takes sharp, unexpected turns, the good can still outweigh the terrible. This optimism has expanded my gratitude for life and become a standard for the way I carry myself, treat others, and recognize the gift of each day.",
    "The journey so far has given me a greater appreciation for where I come from and strengthened my conviction to build a future that reflects my ambition and dedication. At this time, that conviction is manifesting through the questions I find most intriguing: how money moves in finance, how systems work together in engineering, how people come together to build amazing things, and how technology constantly reshapes all three.",
    "I believe in putting care into work, treating people with kindness, and remaining open to what each experience can teach me. I've also come to appreciate that everyone carries a story worth hearing. I enjoy sharing mine, and I'm always grateful when others take the time to listen. Those conversations create room for understanding, broader perspective, and bring more humanity into a complex world.",
    "If anything here resonates, I would be grateful for the chance to connect and see where the conversation leads.",
];

const PULL_QUOTE = "Even when life takes sharp, unexpected turns, the good can still outweigh the terrible.";

export const AboutMe = () => {
    return (
        <div className="bg-base-200 border-2 border-secondary rounded-md p-6 md:p-10 lg:p-14">
            <div className="max-w-5xl mx-auto">
                {/* Eyebrow */}
                <div className="flex items-center gap-3 mb-8 lg:mb-12">
                    <span className="h-px w-10 bg-primary/60" />
                    <span className="text-[11px] uppercase tracking-[0.3em] text-primary font-semibold">About me</span>
                </div>

                {/* Body grid: prose on the left, portrait on the right */}
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_18rem] gap-8 lg:gap-14">
                    {/* Prose */}
                    <article
                        className="space-y-6 text-[17px] md:text-lg leading-[1.75] text-base-content/85 order-2 lg:order-1 lg:max-w-prose"
                        style={{ fontFamily: SERIF }}
                    >
                        {/* Lead paragraph with drop cap */}
                        <p>
                            <span
                                className="float-left text-7xl md:text-[5.5rem] font-bold pr-3 pt-2 leading-[0.85] text-primary select-none"
                                style={{ fontFamily: SERIF }}
                                aria-hidden="true"
                            >
                                I
                            </span>
                            <span aria-hidden="true">{PARAGRAPHS[0].slice(1)}</span>
                            {/* Screen-reader version of the full paragraph */}
                            <span className="sr-only">{PARAGRAPHS[0]}</span>
                        </p>

                        <p>{PARAGRAPHS[1]}</p>

                        {/* Pull quote between roots and outlook */}
                        <figure className="my-10">
                            <blockquote className="border-l-4 border-primary/70 pl-6 italic text-xl md:text-2xl lg:text-[1.65rem] leading-snug text-base-content">
                                <span aria-hidden="true" className="text-primary/60 pr-1 text-2xl">“</span>
                                {PULL_QUOTE}
                                <span aria-hidden="true" className="text-primary/60 pl-0.5 text-2xl">”</span>
                            </blockquote>
                        </figure>

                        <p>{PARAGRAPHS[2]}</p>
                        <p>{PARAGRAPHS[3]}</p>
                        <p>{PARAGRAPHS[4]}</p>

                        {/* Closing line set apart visually */}
                        <p className="text-base-content italic">{PARAGRAPHS[5]}</p>
                    </article>

                    {/* Right rail: portrait */}
                    <aside className="lg:sticky lg:top-24 self-start order-1 lg:order-2">
                        <div className="relative w-44 h-44 lg:w-72 lg:h-72 mx-auto lg:mx-0">
                            {/* Primary-tinted offset block sits behind the portrait but above the section bg */}
                            <div aria-hidden="true" className="absolute -bottom-3 -right-3 hidden lg:block h-24 w-24 rounded-2xl bg-primary/20" />
                            <img
                                src={avatar2}
                                alt="Portrait of Gordon Zhong"
                                className="relative w-full h-full rounded-2xl object-cover shadow-xl ring-1 ring-base-300"
                            />
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
};
