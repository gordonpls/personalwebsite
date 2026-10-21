import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { WheelPicker } from "./WheelPicker";
import quizData from "../AllocationQuiz/quiz.json";

type Step = "intro" | "question" | "sliders" | "result";

interface QuizResult {
    id: string;
    label: string;
    maxEquity: number;
    shortDescription: string;
}

interface Props {
    // Called as soon as results show: the simulator below takes the mix.
    onApply: (equityPct: number, label: string, color: string, age: number, years: number) => void;
}

const PROFILE_COLORS: Record<string, string> = {
    conservative: "#7F77DD",
    cautious:     "#1D9E75",
    balanced:     "#378ADD",
    growth:       "#E8A020",
    aggressive:   "#D85A30",
};

const questions = quizData.questions;
const sliders   = quizData.sliders;
const results   = quizData.results as QuizResult[];
const totalSteps = questions.length + 1; // + the sliders screen

type QuizOption = typeof questions[number]["options"][number];

function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function buildShuffledOptions(): QuizOption[][] {
    return questions.map((q) => shuffle(q.options));
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

interface Analysis {
    equity: number;
    profile: QuizResult;
    willingness: number; // 0–1
    ability: number;     // 0–1
    insights: string[];
    crashPct: number;
}

// Two axes, not one score: willingness (how much risk you want) and ability
// (how much your finances and timeline can absorb). Equity = willingness
// blended with a 110-minus-age anchor, docked for a thin cushion, then capped
// by the time horizon.
function analyze(points: Record<string, number>, age: number, years: number): Analysis {
    const n = (id: string) => ((points[id] ?? 1) - 1) / 3;

    // What you'd do in a drop counts double vs. what you say you want.
    let willingness = (n("goal") + n("range") + 2 * n("drop")) / 4;
    if (points.experience === 2) willingness -= 0.1;   // sold in a real drop
    if (points.experience === 4) willingness += 0.05;  // bought in a real drop
    willingness = clamp(willingness, 0, 1);

    const ability = clamp(0.4 * n("cushion") + 0.6 * Math.min(years, 20) / 20, 0, 1);

    const ageAnchor  = clamp(110 - age, 20, 90);
    const cushionHit = points.cushion === 1 ? 15 : points.cushion === 2 ? 5 : 0;
    const preferred  = 0.6 * (10 + willingness * 85) + 0.4 * ageAnchor - cushionHit;
    const horizonCap = clamp(10 + years * 6, 20, 95);
    const equity     = clamp(Math.round(Math.min(preferred, horizonCap) / 10) * 10, 10, 100);
    const profile    = results.find((r) => equity <= r.maxEquity) ?? results[results.length - 1];

    const insights: string[] = [];
    if (points.range >= 3 && points.drop <= 2) {
        insights.push("You picked a wide range of outcomes, but said you'd sell after a 25% drop. When those disagree, what you'd do wins, so that answer counted double.");
    }
    if (horizonCap < preferred - 5) {
        insights.push(`Your ${years}-year timeline is the limiting factor. Your answers point to about ${Math.round(preferred / 5) * 5}% stocks, but money needed that soon may not have time to recover from a crash.`);
    }
    if (points.cushion === 1) {
        insights.push("With under a month of cushion, a job loss could force you to sell at a bad time. Building 3–6 months of savings first is often the best \"return\" available.");
    } else if (willingness - ability > 0.3) {
        insights.push("You're up for more risk than your finances can absorb right now. A bigger cash cushion or a longer timeline would let you take it.");
    } else if (ability - willingness > 0.3) {
        insights.push("Your finances could handle more risk than you're comfortable with. That's fine: a mix you'll stick with beats one you'd panic-sell.");
    }
    if (points.experience === 1 && willingness >= 0.6) {
        insights.push("You haven't held through a crash yet. Most people find a real 30% drop feels worse than it sounds on paper.");
    }
    const diff = equity - ageAnchor;
    insights.push(
        Math.abs(diff) < 10
            ? `You landed right around the classic "110 minus your age" rule of thumb (${ageAnchor}% stocks).`
            : `The "110 minus your age" rule of thumb says ${ageAnchor}% stocks. You landed ${diff > 0 ? "above" : "below"} it, based on your answers.`,
    );

    // Rough 2008-style peak-to-trough: stocks −50%, bonds −3%.
    const crashPct = Math.round(equity * 0.5 + (100 - equity) * 0.03);

    return { equity, profile, willingness, ability, insights: insights.slice(0, 3), crashPct };
}

// Donut of the stock / bond split: stocks in the profile color, bonds in a
// faint tint of it, the stock share written in the middle.
const SplitDonut = ({ equity, color }: { equity: number; color: string }) => {
    const r = 42;
    const c = 2 * Math.PI * r;
    return (
        <div className="relative size-40 shrink-0">
            <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden="true">
                <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeOpacity={0.18} strokeWidth="11" />
                <circle
                    cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="11" strokeLinecap="round"
                    strokeDasharray={c}
                    strokeDashoffset={c * (1 - equity / 100)}
                    className="transition-[stroke-dashoffset] duration-700 ease-out"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold tabular-nums text-base-content">{equity}%</span>
                <span className="text-xs font-medium uppercase tracking-widest text-base-content/60">stocks</span>
            </div>
        </div>
    );
};

// One score as a small tile: the number large, a thin bar under it.
const ScoreTile = ({ label, hint, value, color }: { label: string; hint: string; value: number; color: string }) => (
    <div className="rounded-xl border border-base-300 bg-base-200/40 p-3.5">
        <p className="text-xs font-semibold uppercase tracking-widest text-base-content/60">{label}</p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-base-content">
            {Math.round(value * 100)}<span className="text-sm font-medium text-base-content/60"> / 100</span>
        </p>
        <div className="mt-2 h-1.5 rounded-full bg-base-300">
            <div className="h-1.5 rounded-full transition-all duration-700" style={{ width: `${Math.max(value, 0.04) * 100}%`, background: color }} />
        </div>
        <p className="mt-1.5 text-xs text-base-content/60">{hint}</p>
    </div>
);

const ProgressBar = ({ index }: { index: number }) => (
    <div className="flex items-center gap-3">
        <span className="text-xs text-base-content/60 font-medium whitespace-nowrap">
            {index + 1} / {totalSteps}
        </span>
        <div className="flex gap-1 flex-1">
            {Array.from({ length: totalSteps }, (_, i) => (
                <div
                    key={i}
                    className={`h-1 rounded-full flex-1 transition-all duration-300 ${
                        i < index ? "bg-primary" : i === index ? "bg-primary/50" : "bg-base-300"
                    }`}
                />
            ))}
        </div>
    </div>
);

const ageSlider = sliders.find((s) => s.id === "age")!;
const horizonSlider = sliders.find((s) => s.id === "horizon")!;
// Horizon picks, inside the configured range (the max reads as "40+").
const HORIZON_CHOICES = [3, 5, 10, 20, 30].filter((y) => y >= horizonSlider.min && y <= horizonSlider.max);
// Birth years for the wheel, newest first, within the configured age range.
const THIS_YEAR = new Date().getFullYear();
const BIRTH_YEARS = Array.from({ length: ageSlider.max - ageSlider.min + 1 }, (_, i) => THIS_YEAR - ageSlider.min - i);

const initialSliders = () => Object.fromEntries(sliders.map((s) => [s.id, s.default])) as Record<string, number>;

export const AllocationQuiz = ({ onApply }: Props) => {
    const [step, setStep]       = useState<Step>("intro");
    const [qIndex, setQIndex]   = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [sliderVals, setSliderVals] = useState<Record<string, number>>(initialSliders);
    const reduce = useReducedMotion();
    const [shuffledOptions, setShuffledOptions] = useState<QuizOption[][]>(() => buildShuffledOptions());

    const currentQ = questions[qIndex];
    const currentOptions = shuffledOptions[qIndex];

    const points = Object.fromEntries(
        questions.map((q) => [q.id, q.options.find((o) => o.id === answers[q.id])?.points ?? 1]),
    );
    const analysis = step === "result" ? analyze(points, sliderVals.age, sliderVals.horizon) : null;

    // Picking an answer moves on by itself after a beat (long enough to see
    // the choice land). Back / forward stay available for changing answers.
    const advanceTimer = useRef<number | undefined>(undefined);
    useEffect(() => () => window.clearTimeout(advanceTimer.current), []);
    const select = (optId: string) => {
        setAnswers((prev) => ({ ...prev, [currentQ.id]: optId }));
        window.clearTimeout(advanceTimer.current);
        advanceTimer.current = window.setTimeout(goNext, reduce ? 0 : 280);
    };

    const goNext = () => {
        if (qIndex < questions.length - 1) setQIndex((i) => i + 1);
        else setStep("sliders");
    };

    const goBack = () => {
        window.clearTimeout(advanceTimer.current);
        if (qIndex === 0) setStep("intro");
        else setQIndex((i) => i - 1);
    };

    // Hand the mix to the simulator the moment results show (once per result).
    useEffect(() => {
        if (step !== "result" || !analysis) return;
        onApply(analysis.equity, analysis.profile.label, PROFILE_COLORS[analysis.profile.id] ?? "#378ADD", sliderVals.age, sliderVals.horizon);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step]);

    const handleRetake = () => {
        setStep("intro");
        setQIndex(0);
        setAnswers({});
        setSliderVals(initialSliders());
        setShuffledOptions(buildShuffledOptions());
    };

    // ── Intro ────────────────────────────────────────────────────────────────
    if (step === "intro") {
        return (
            <div className="bg-base-100 border border-base-300 rounded-2xl p-6 space-y-4">
                <div>
                    <p className="text-xs text-base-content/60 uppercase tracking-widest font-medium mb-1">
                        Asset Allocation Quiz
                    </p>
                    <h2 className="text-lg font-semibold text-base-content">Find your investor profile</h2>
                    <p className="text-sm text-base-content/60 mt-1">
                        {questions.length} quick questions and two sliders · ~2 minutes. We'll weigh how much risk
                        you <em>want</em> against how much you can <em>afford</em>, then suggest a stock / bond split
                        you can test in the portfolio simulator below.
                    </p>
                </div>
                <button
                    className="btn btn-primary btn-sm"
                    onClick={() => { setStep("question"); setQIndex(0); }}
                >
                    Start quiz →
                </button>
            </div>
        );
    }

    // ── Question ─────────────────────────────────────────────────────────────
    if (step === "question") {
        const selected = answers[currentQ.id];

        return (
            <div className="bg-base-100 border border-base-300 rounded-2xl p-6 space-y-5">
                <ProgressBar index={qIndex} />

                <p className="text-base font-medium text-base-content">{currentQ.prompt}</p>

                <div className="space-y-2">
                    {currentOptions.map((opt, i) => (
                        <button
                            key={opt.id}
                            onClick={() => select(opt.id)}
                            className={[
                                "w-full text-left px-4 py-3 rounded-xl border text-sm transition-all duration-150",
                                selected === opt.id
                                    ? "border-primary bg-primary/10 text-base-content font-medium"
                                    : "border-base-300 bg-base-200/50 text-base-content/70 hover:border-base-content/20 hover:bg-base-200",
                            ].join(" ")}
                        >
                            <span className="font-semibold text-primary mr-2">{i + 1}.</span>
                            {opt.text}
                        </button>
                    ))}
                </div>

                <div className="flex justify-between pt-1">
                    <button className="btn btn-sm btn-ghost" onClick={goBack}>← Back</button>
                    {/* Forward only for a question already answered (i.e. after going back). */}
                    {selected && (
                        <button className="btn btn-sm btn-ghost" onClick={goNext}>Forward →</button>
                    )}
                </div>
            </div>
        );
    }

    // ── Sliders (age + horizon) ──────────────────────────────────────────────
    if (step === "sliders") {
        return (
            <div className="bg-base-100 border border-base-300 rounded-2xl p-6 space-y-5">
                <ProgressBar index={questions.length} />

                {/* Birth year on an iOS-style wheel (age = this year − birth
                    year); horizon as a short row of chips. */}
                <div className="mx-auto max-w-lg space-y-8 py-2">
                    <div className="space-y-3 text-center">
                        <p className="text-base font-medium text-base-content">{ageSlider.prompt}</p>
                        <WheelPicker
                            label="Birth year"
                            values={BIRTH_YEARS}
                            value={THIS_YEAR - sliderVals.age}
                            onChange={(y) => setSliderVals((prev) => ({ ...prev, age: THIS_YEAR - y }))}
                        />
                        <p className="text-xs text-base-content/60">That makes you about {sliderVals.age}</p>
                    </div>

                    <div className="space-y-3 text-center">
                        <p id="quiz-horizon" className="text-base font-medium text-base-content">{horizonSlider.prompt}</p>
                        <div role="radiogroup" aria-labelledby="quiz-horizon" className="flex flex-wrap justify-center gap-2">
                            {HORIZON_CHOICES.map((y) => {
                                const on = sliderVals.horizon === y;
                                return (
                                    <button
                                        key={y}
                                        type="button"
                                        role="radio"
                                        aria-checked={on}
                                        onClick={() => setSliderVals((prev) => ({ ...prev, horizon: y }))}
                                        className={`rounded-full border px-4 py-2 text-sm font-semibold tabular-nums transition ${on
                                            ? "border-primary bg-primary text-primary-content shadow-sm"
                                            : "border-base-300 bg-base-200/50 text-base-content/80 hover:border-base-content/30"}`}
                                    >
                                        {y === HORIZON_CHOICES[HORIZON_CHOICES.length - 1] ? `${y}+` : y} yrs
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="flex justify-between pt-1">
                    <button className="btn btn-sm btn-ghost" onClick={() => { setStep("question"); setQIndex(questions.length - 1); }}>
                        ← Back
                    </button>
                    <button className="btn btn-sm btn-primary" onClick={() => setStep("result")}>
                        See results
                    </button>
                </div>
            </div>
        );
    }

    // ── Result ───────────────────────────────────────────────────────────────
    if (step === "result" && analysis) {
        const { profile, equity, willingness, ability, insights, crashPct } = analysis;
        const color = PROFILE_COLORS[profile.id] ?? "#378ADD";

        // Layout: the answer on the left (the split as a donut, the profile,
        // what it means), the reasoning on the right (the two scores, what
        // shaped the result, the crash test), actions along the bottom.
        return (
            <div className="bg-base-100 border border-base-300 rounded-2xl p-5 sm:p-6 space-y-5">
                <p className="text-xs text-base-content/60 uppercase tracking-widest font-medium">Your result</p>

                <div className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
                    {/* The answer */}
                    <section
                        className="flex flex-col items-center gap-5 rounded-2xl p-6 text-center"
                        style={{ background: `color-mix(in oklch, ${color} 10%, transparent)` }}
                    >
                        <SplitDonut equity={equity} color={color} />
                        <div className="space-y-2">
                            <span
                                className="inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest"
                                style={{ color, background: `color-mix(in oklch, ${color} 16%, transparent)` }}
                            >
                                {profile.label}
                            </span>
                            <p className="text-xl font-bold text-base-content">
                                {equity}% stocks · {100 - equity}% bonds
                            </p>
                            <p className="mx-auto max-w-xs text-sm text-base-content/70">{profile.shortDescription}</p>
                        </div>
                        <div className="flex w-full max-w-xs justify-center gap-5 text-xs text-base-content/70">
                            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full" style={{ background: color }} />Stocks {equity}%</span>
                            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full" style={{ background: color, opacity: 0.25 }} />Bonds {100 - equity}%</span>
                        </div>
                    </section>

                    {/* The reasoning */}
                    <div className="flex min-w-0 flex-col gap-4">
                        <div className="grid grid-cols-2 gap-3">
                            <ScoreTile label="Willingness" hint="How much risk you want" value={willingness} color={color} />
                            <ScoreTile label="Ability" hint="How much risk you can absorb" value={ability} color={color} />
                        </div>

                        <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-base-content/60">What shaped this</p>
                            <ol className="space-y-2">
                                {insights.map((text, i) => (
                                    <li key={text} className="flex gap-3 rounded-xl border border-base-300 p-3 text-sm leading-relaxed text-base-content/80">
                                        <span
                                            className="flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                                            style={{ color, background: `color-mix(in oklch, ${color} 16%, transparent)` }}
                                        >
                                            {i + 1}
                                        </span>
                                        <span>{text}</span>
                                    </li>
                                ))}
                            </ol>
                        </div>

                        <div className="flex items-center gap-4 rounded-xl bg-base-200/60 p-4">
                            <p className="shrink-0 text-3xl font-bold tabular-nums text-error">−{crashPct}%</p>
                            <p className="text-sm text-base-content/70">
                                <span className="font-semibold text-base-content">2008-style crash test.</span>{" "}
                                This mix could fall about ${(crashPct * 100).toLocaleString()} of every $10,000 before recovering.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-base-300 pt-4">
                    <button className="btn btn-sm btn-ghost" onClick={handleRetake}>Retake quiz</button>
                    {/* Already applied (see the effect above): a pill that says so,
                        with a light sweeping across it and a bobbing arrow that
                        jumps to the simulator. */}
                    <button
                        type="button"
                        onClick={() => document.getElementById("sec-simulator")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                        className="group relative flex items-center gap-2 overflow-hidden rounded-full py-2 pl-2 pr-4 text-sm font-semibold text-white shadow-md transition hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2"
                        style={{ background: color, outlineColor: color }}
                    >
                        <span className="flex size-6 items-center justify-center rounded-full bg-white/25">
                            <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                                <motion.path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: reduce ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.3 }} />
                            </svg>
                        </span>
                        Applied to the simulator below
                        <motion.span aria-hidden="true" animate={reduce ? undefined : { y: [0, 3, 0] }} transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}>↓</motion.span>
                        {!reduce && (
                            <motion.span
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-y-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                                initial={{ left: "-40%" }}
                                animate={{ left: "140%" }}
                                transition={{ repeat: Infinity, repeatDelay: 1.6, duration: 1.1, ease: "easeInOut" }}
                            />
                        )}
                    </button>
                </div>
            </div>
        );
    }

    return null;
};
