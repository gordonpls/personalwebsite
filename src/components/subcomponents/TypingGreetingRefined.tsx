import { useEffect, useState } from "react";
import greetings from "../../assets/greetings.json";

// Refined timings vs the classic version:
//  - small per-keystroke jitter so it doesn't feel mechanical
//  - delete pass is roughly half the speed of typing (matches how people backspace)
//  - a short breath between languages instead of jumping straight in
//  - caret stays solid while typing/deleting, only blinks during the hold/rest
const TYPE_MS = 70;
const TYPE_JITTER = 35;
const DELETE_MS = 35;
const DELETE_JITTER = 15;
const HOLD_AFTER_TYPE = 1400;
const REST_BEFORE_NEXT = 380;

const rand = (mid: number, jit: number) => mid + (Math.random() * 2 - 1) * jit;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Alternates English and Chinese only (greetings.json keeps the other
// languages in case we want them back).
const buildOrder = () => ["English", "Mandarin Chinese"];

type Phase = "typing" | "hold" | "deleting" | "rest" | "brushing" | "fading";

// Chinese is brushed in (all characters at once, each wiped in with a soft
// mask, staggered) instead of typed; English keeps the typing effect.
const BRUSH_STAGGER_MS = 160;
const BRUSH_STROKE_MS = 500;
const FADE_MS = 350;
const isChinese = (s: string) => /[\u4e00-\u9fff]/.test(s);

// Each pass of the name's sunlight sweep picks a new glint color: any hue,
// kept light and warm-bright so it always reads as "sunlight".
const randomGlint = () => `oklch(${(84 + Math.random() * 8).toFixed(1)}% ${(0.12 + Math.random() * 0.08).toFixed(3)} ${Math.floor(Math.random() * 360)})`;
type CaretShape = "block" | "underscore" | "bar";

const TypingGreetingRefined = ({ caret = "block" }: { caret?: CaretShape } = {}) => {
    const [order, setOrder] = useState<string[]>(buildOrder());
    const [index, setIndex] = useState(0);
    const [text, setText] = useState("");
    const [phase, setPhase] = useState<Phase>("typing");

    useEffect(() => {
        let cancelled = false;
        const word: string = (greetings as Record<string, string>)[order[index]] ?? "";

        const run = async () => {
            if (isChinese(word)) {
                setText(word);
                setPhase("brushing");
                await wait([...word].length * BRUSH_STAGGER_MS + BRUSH_STROKE_MS + HOLD_AFTER_TYPE);
                if (cancelled) return;
                setPhase("fading");
                await wait(FADE_MS);
                if (cancelled) return;
                setText("");
                setPhase("rest");
                await wait(REST_BEFORE_NEXT);
                if (cancelled) return;
                setIndex((prev) => (prev >= order.length - 1 ? 0 : prev + 1));
                return;
            }
            setText("");
            setPhase("typing");
            for (let i = 0; i < word.length; i++) {
                await wait(rand(TYPE_MS, TYPE_JITTER));
                if (cancelled) return;
                setText(word.slice(0, i + 1));
            }
            setPhase("hold");
            await wait(HOLD_AFTER_TYPE);
            if (cancelled) return;

            setPhase("deleting");
            for (let i = word.length - 1; i >= 0; i--) {
                await wait(rand(DELETE_MS, DELETE_JITTER));
                if (cancelled) return;
                setText(word.slice(0, i));
            }
            setPhase("rest");
            await wait(REST_BEFORE_NEXT);
            if (cancelled) return;

            setIndex((prev) => {
                if (prev >= order.length - 1) {
                    setOrder(buildOrder());
                    return 0;
                }
                return prev + 1;
            });
        };

        run();
        return () => { cancelled = true; };
    }, [index, order]);

    const caretIdle = phase === "hold" || phase === "rest";
    const brush = phase === "brushing" || phase === "fading";
    const [glint, setGlint] = useState(randomGlint);

    return (
        <div className="typing-greeting-refined text-center flex flex-col text-secondary business:text-[#2f6fe0] w-full">
            <span className="text-xl lg:text-3xl font-bold w-full inline-flex items-center justify-center min-h-[1.4em]">
                {brush ? (
                    <span className={`greeting-brush ${phase === "fading" ? "is-fading" : ""}`} aria-label={text}>
                        {[...text].map((ch, i) => (
                            <span key={i} aria-hidden="true" style={{ animationDelay: `${i * BRUSH_STAGGER_MS}ms` }}>{ch}</span>
                        ))}
                    </span>
                ) : (
                    <>
                        <span className="whitespace-pre">{text}</span>
                        <span className={`caret caret-${caret} ${caretIdle ? "idle" : "active"}`} aria-hidden="true" />
                    </>
                )}
            </span>
            <h1
                className="name-sunlit text-4xl md:text-5xl lg:text-6xl xl:text-8xl font-bold my-2 pb-2"
                style={{ "--glint": glint } as React.CSSProperties}
                onAnimationIteration={() => setGlint(randomGlint())}
            >
                Gordon Zhong
            </h1>
        </div>
    );
};

export default TypingGreetingRefined;
