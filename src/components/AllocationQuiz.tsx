import { useState } from "react";
import quizData from "../AllocationQuiz/quiz.json";

type Step = "intro" | "question" | "result" | "applied";

interface QuizResult {
    id: string;
    label: string;
    scoreRange: { min: number; max: number };
    allocation: { stocks: number; bonds: number; display: string };
    shortDescription: string;
}

interface Props {
    onApply: (equityPct: number) => void;
}

const PROFILE_COLORS: Record<string, string> = {
    conservative: "#7F77DD",
    cautious:     "#1D9E75",
    balanced:     "#378ADD",
    growth:       "#E8A020",
    aggressive:   "#D85A30",
};

const pointMap = quizData.scoringMethod.answerPoints as Record<string, number>;
const questions = quizData.questions;
const results   = quizData.results as QuizResult[];

function getResult(score: number): QuizResult {
    return (
        results.find((r) => score >= r.scoreRange.min && score <= r.scoreRange.max) ??
        (score < results[0].scoreRange.min ? results[0] : results[results.length - 1])
    );
}

export const AllocationQuiz = ({ onApply }: Props) => {
    const [step, setStep]       = useState<Step>("intro");
    const [qIndex, setQIndex]   = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [appliedLabel, setAppliedLabel] = useState<string | null>(null);

    const currentQ = questions[qIndex];
    const score    = Object.values(answers).reduce((sum, a) => sum + (pointMap[a] ?? 0), 0);
    const result   = step === "result" || step === "applied" ? getResult(score) : null;

    const select = (optId: string) =>
        setAnswers((prev) => ({ ...prev, [currentQ.id]: optId }));

    const goNext = () => {
        if (qIndex < questions.length - 1) setQIndex((i) => i + 1);
        else setStep("result");
    };

    const goBack = () => {
        if (qIndex === 0) setStep("intro");
        else setQIndex((i) => i - 1);
    };

    const handleApply = () => {
        if (!result) return;
        onApply(result.allocation.stocks);
        setAppliedLabel(`${result.label} · ${result.allocation.display}`);
        setStep("applied");
    };

    const handleRetake = () => {
        setStep("intro");
        setQIndex(0);
        setAnswers({});
        setAppliedLabel(null);
    };

    // ── Applied (collapsed) ──────────────────────────────────────────────────
    if (step === "applied") {
        return (
            <div className="bg-base-100 border border-base-300 rounded-2xl px-6 py-4 flex items-center justify-between flex-wrap gap-3">
                <div>
                    <p className="text-xs text-base-content/40 uppercase tracking-widest font-medium mb-0.5">Allocation applied</p>
                    <p className="text-sm font-medium text-base-content">{appliedLabel}</p>
                </div>
                <button className="btn btn-sm btn-ghost" onClick={handleRetake}>Retake quiz</button>
            </div>
        );
    }

    // ── Intro ────────────────────────────────────────────────────────────────
    if (step === "intro") {
        return (
            <div className="bg-base-100 border border-base-300 rounded-2xl p-6 space-y-4">
                <div>
                    <p className="text-xs text-base-content/40 uppercase tracking-widest font-medium mb-1">
                        Asset Allocation Quiz
                    </p>
                    <h2 className="text-lg font-semibold text-base-content">Find your investor profile</h2>
                    <p className="text-sm text-base-content/60 mt-1">
                        {questions.length} questions · ~2 minutes. We'll map your goals, time horizon, and risk
                        tolerance to a recommended stock / bond split you can test in the portfolio simulator below.
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
        const selected   = answers[currentQ.id];
        const isLastQ    = qIndex === questions.length - 1;

        return (
            <div className="bg-base-100 border border-base-300 rounded-2xl p-6 space-y-5">
                {/* Progress */}
                <div className="flex items-center gap-3">
                    <span className="text-xs text-base-content/40 font-medium whitespace-nowrap">
                        {qIndex + 1} / {questions.length}
                    </span>
                    <div className="flex gap-1 flex-1">
                        {questions.map((_, i) => (
                            <div
                                key={i}
                                className={`h-1 rounded-full flex-1 transition-all duration-300 ${
                                    i < qIndex
                                        ? "bg-primary"
                                        : i === qIndex
                                        ? "bg-primary/50"
                                        : "bg-base-300"
                                }`}
                            />
                        ))}
                    </div>
                </div>

                {/* Prompt */}
                <p className="text-base font-medium text-base-content">{currentQ.prompt}</p>

                {/* Options */}
                <div className="space-y-2">
                    {currentQ.options.map((opt) => (
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
                            <span className="font-semibold text-primary mr-2">{opt.id}.</span>
                            {opt.text}
                        </button>
                    ))}
                </div>

                {/* Navigation */}
                <div className="flex justify-between pt-1">
                    <button className="btn btn-sm btn-ghost" onClick={goBack}>← Back</button>
                    <button
                        className="btn btn-sm btn-primary"
                        disabled={!selected}
                        onClick={goNext}
                    >
                        {isLastQ ? "See results" : "Next →"}
                    </button>
                </div>
            </div>
        );
    }

    // ── Result ───────────────────────────────────────────────────────────────
    if (step === "result" && result) {
        const color  = PROFILE_COLORS[result.id] ?? "#378ADD";
        const maxPts = questions.length * 4;

        return (
            <div className="bg-base-100 border border-base-300 rounded-2xl p-6 space-y-5">
                <p className="text-xs text-base-content/40 uppercase tracking-widest font-medium">Your result</p>

                <div className="flex gap-4">
                    <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: color }} />
                    <div className="space-y-1.5">
                        <p className="text-lg font-semibold" style={{ color }}>{result.label}</p>
                        <p className="text-2xl font-bold text-base-content">{result.allocation.display}</p>
                        <p className="text-sm text-base-content/60 pt-0.5">{result.shortDescription}</p>
                    </div>
                </div>

                {/* Score bar */}
                <div className="space-y-1">
                    <div className="flex justify-between text-xs text-base-content/40">
                        <span>Score</span>
                        <span>{score} / {maxPts}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-base-300">
                        <div
                            className="h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${(score / maxPts) * 100}%`, background: color }}
                        />
                    </div>
                </div>

                <div className="flex gap-3 flex-wrap">
                    <button className="btn btn-sm btn-ghost" onClick={handleRetake}>Retake quiz</button>
                    <button className="btn btn-sm btn-primary" onClick={handleApply}>
                        Apply to portfolio ↓
                    </button>
                </div>
            </div>
        );
    }

    return null;
};
