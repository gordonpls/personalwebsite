// Core typing-session state, shared by the "coming soon" teaser and (later) the
// real game. Tracks what's been typed against a target phrase and derives
// per-character status, WPM, and accuracy. Pure state: no DOM, no timers.

import { useCallback, useMemo, useState } from "react";

export type CharStatus = "correct" | "wrong" | "pending";

export interface TypingSession {
    target: string;
    typed: string;
    statuses: CharStatus[];
    done: boolean;
    wpm: number;        // standard 5-chars-per-word, net of nothing (teaser-grade)
    accuracy: number;   // 0–100, counts every keystroke incl. later-fixed mistakes
    mistakes: number;   // bumps each time a keystroke lands wrong (drives the shake)
    input: (next: string) => void;
    reset: (nextTarget?: string) => void;
}

export function useTypingSession(initialTarget: string): TypingSession {
    const [target, setTarget] = useState(initialTarget);
    const [typed, setTyped] = useState("");
    const [startedAt, setStartedAt] = useState<number | null>(null);
    const [finishedAt, setFinishedAt] = useState<number | null>(null);
    const [keystrokes, setKeystrokes] = useState(0);
    const [mistakes, setMistakes] = useState(0);

    const done = finishedAt !== null;

    // Accepts the full input value (from an <input>), so paste/IME/backspace all
    // work the same way. Only additions count as keystrokes.
    const input = useCallback((next: string) => {
        if (done) return;
        const clipped = next.slice(0, target.length);
        if (clipped.length > typed.length) {
            const added = clipped.slice(typed.length);
            const wrong = [...added].filter((ch, i) => ch !== target[typed.length + i]).length;
            setKeystrokes((k) => k + added.length);
            if (wrong) setMistakes((m) => m + wrong);
            if (startedAt === null) setStartedAt(performance.now());
        }
        setTyped(clipped);
        if (clipped === target) setFinishedAt(performance.now());
    }, [done, target, typed, startedAt]);

    const reset = useCallback((nextTarget?: string) => {
        if (nextTarget !== undefined) setTarget(nextTarget);
        setTyped("");
        setStartedAt(null);
        setFinishedAt(null);
        setKeystrokes(0);
        setMistakes(0);
    }, []);

    const statuses = useMemo<CharStatus[]>(
        () => [...target].map((ch, i) => (i >= typed.length ? "pending" : typed[i] === ch ? "correct" : "wrong")),
        [target, typed],
    );

    const minutes = startedAt !== null && finishedAt !== null ? (finishedAt - startedAt) / 60000 : 0;
    const wpm = minutes > 0 ? Math.round(target.length / 5 / minutes) : 0;
    const accuracy = keystrokes ? Math.round(((keystrokes - mistakes) / keystrokes) * 100) : 100;

    return { target, typed, statuses, done, wpm, accuracy, mistakes, input, reset };
}
