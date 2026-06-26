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

// Randomized language order that always opens with English.
const buildOrder = () => {
    const rest = Object.keys(greetings).filter((l) => l !== "English");
    for (let i = rest.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    return ["English", ...rest];
};

type Phase = "typing" | "hold" | "deleting" | "rest";
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

    return (
        <div className="typing-greeting-refined text-center flex flex-col text-secondary business:text-[#2f6fe0] w-full">
            <span className="text-xl lg:text-3xl font-bold w-full inline-flex items-center justify-center min-h-[1.4em]">
                <span className="whitespace-pre">{text}</span>
                <span className={`caret caret-${caret} ${caretIdle ? "idle" : "active"}`} aria-hidden="true" />
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-8xl font-bold my-2 pb-2 text-white animate-pulse drop-shadow-xl">
                Gordon Zhong
            </h1>
        </div>
    );
};

export default TypingGreetingRefined;
