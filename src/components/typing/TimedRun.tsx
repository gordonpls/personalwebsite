// The game proper, in the style of the old "coming soon" sign: a few words at
// a time sit in big ghost letters and the visitor types over them. Correct
// letters ink in, a wrong one shakes the line, and when the clock runs out the
// score itself appears on the sign with a little wave.
//
// The server deals each run's words with a signed token; the browser records a
// keystroke log and the server replays it to compute the official score (see
// server/routes/typing.js). If the server is offline, runs are dealt locally
// and simply aren't saved.

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion, useAnimationControls, useReducedMotion } from "framer-motion";
import { useTypingSession } from "./useTypingSession";
import { Leaderboard, type ScoreEntry } from "./Leaderboard";
import { PACKS, makeRunText, type PackId } from "./wordPacks";

const DURATIONS = [30, 60] as const;
type Duration = (typeof DURATIONS)[number];
type Boards = Record<number, ScoreEntry[]>;
type Phase = "ready" | "running" | "done";
type Run = { token: string | null; text: string };
// [ms since first key, inserted text | number of chars deleted]
type RunLog = [number, string | number][];

// Most characters on the sign at once, even when the box is wide: short
// chunks are easier to read ahead in.
const MAX_CHUNK_CHARS = 24;
// After time's up, ignore space briefly so a word-ending space typed right at
// the buzzer doesn't instantly restart and hide the results.
const RETRY_GRACE_MS = 700;

async function fetchRun(seconds: number, pack: PackId): Promise<Run> {
    try {
        const r = await fetch("/api/typing/runs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ seconds, pack }),
        });
        if (!r.ok) throw new Error();
        return await r.json();
    } catch {
        return { token: null, text: makeRunText(pack) };
    }
}

// Splits [start, end) into words that each keep their trailing space, so the
// sign only wraps between words.
function wordGroups(text: string, start: number, end: number) {
    const out: [number, number][] = [];
    let g = start;
    for (let i = start; i < end; i++) {
        if (text[i] === " ") { out.push([g, i + 1]); g = i + 1; }
    }
    if (g < end) out.push([g, end]);
    return out;
}

export const TimedRun = ({ name, onChangeName }: { name: string; onChangeName: () => void }) => {
    const reduce = useReducedMotion();
    const inputRef = useRef<HTMLInputElement>(null);
    const shake = useAnimationControls();

    const [seconds, setSeconds] = useState<Duration>(30);
    const [pack, setPack] = useState<PackId>("code");
    const s = useTypingSession("");

    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState<string | null>(null);
    const [phase, setPhase] = useState<Phase>("ready");
    const [startedAt, setStartedAt] = useState<number | null>(null);
    const [now, setNow] = useState(0);
    const [endedAt, setEndedAt] = useState(0);
    const [result, setResult] = useState<{ wpm: number; accuracy: number } | null>(null);
    const [saveNote, setSaveNote] = useState<string | null>(null);
    const [focused, setFocused] = useState(false);

    const [boards, setBoards] = useState<Boards>({});
    const [boardStatus, setBoardStatus] = useState<"loading" | "ready" | "offline">("loading");
    const [placed, setPlaced] = useState<{ rank: number | null; at: number | null } | null>(null);

    // How many sign letters fit on one line, measured from the real font so a
    // chunk never wraps (the sign is monospace, so every letter is one width).
    const signRef = useRef<HTMLDivElement>(null);
    const measureRef = useRef<HTMLSpanElement>(null);
    const [lineChars, setLineChars] = useState(MAX_CHUNK_CHARS);
    useLayoutEffect(() => {
        const box = signRef.current;
        const probe = measureRef.current;
        if (!box || !probe) return;
        const measure = () => {
            const charW = probe.getBoundingClientRect().width / 10;
            if (charW > 0) setLineChars(Math.max(8, Math.min(MAX_CHUNK_CHARS, Math.floor(box.clientWidth / charW))));
        };
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(box);
        return () => ro.disconnect();
    }, []);

    const logRef = useRef<RunLog>([]);
    const runId = useRef(0);
    // The next run is dealt while you type this one, so retry is instant.
    const nextRun = useRef<{ key: string; run: Promise<Run> } | null>(null);

    useEffect(() => {
        fetch("/api/typing/scores")
            .then((r) => (r.ok ? r.json() : Promise.reject()))
            .then((b) => { setBoards(b); setBoardStatus("ready"); })
            .catch(() => setBoardStatus("offline"));
    }, []);

    const restart = useCallback(async (d: Duration = seconds, p: PackId = pack) => {
        const id = ++runId.current;
        setLoading(true);
        setPhase("ready");
        setStartedAt(null);
        setResult(null);
        setSaveNote(null);
        setPlaced(null);
        logRef.current = [];
        const key = `${d}-${p}`;
        const pending = nextRun.current?.key === key ? nextRun.current.run : fetchRun(d, p);
        nextRun.current = null;
        const run = await pending;
        if (id !== runId.current) return; // a newer restart won
        s.reset(run.text);
        setToken(run.token);
        setLoading(false);
        inputRef.current?.focus();
    }, [seconds, pack, s]);

    // Deal the first run on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { restart(); }, []);

    const correctChars = s.statuses.reduce((n, st) => n + (st === "correct" ? 1 : 0), 0);
    const elapsedMs = phase === "running" && startedAt !== null ? Math.max(0, now - startedAt) : 0;
    const remaining = phase === "done" ? 0 : Math.max(0, Math.ceil(seconds - elapsedMs / 1000));
    const liveWpm = elapsedMs > 1000 ? Math.round(correctChars / 5 / (elapsedMs / 60000)) : 0;

    // The server replays the log and answers with the official numbers.
    const submit = useCallback(async (clientWpm: number) => {
        if (!token || clientWpm <= 0) return;
        const id = runId.current;
        setSaveNote("Saving to the board…");
        try {
            const r = await fetch("/api/typing/scores", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, name, log: logRef.current }),
            });
            const body = await r.json().catch(() => ({}));
            if (!r.ok) {
                if (id === runId.current) setSaveNote(body.error ?? "Couldn't save this run");
                return;
            }
            setBoards((b) => ({ ...b, [seconds]: body.board }));
            setPlaced({ rank: body.rank, at: body.rank ? body.board[body.rank - 1].at : null });
            if (id === runId.current) {
                setResult({ wpm: body.wpm, accuracy: body.accuracy });
                setSaveNote(null);
            }
        } catch {
            if (id === runId.current) setSaveNote("Couldn't reach the board; this run wasn't saved");
        }
    }, [token, name, seconds]);

    const finish = useCallback(() => {
        if (startedAt === null) return;
        const t = performance.now();
        const wpm = Math.round(correctChars / 5 / (Math.min(seconds, (t - startedAt) / 1000) / 60));
        setResult({ wpm, accuracy: s.accuracy });
        setEndedAt(t);
        setPhase("done");
        inputRef.current?.blur();
        submit(wpm);
    }, [startedAt, seconds, correctChars, s.accuracy, submit]);

    // Clock: tick while running; end on the buzzer (or if every word is typed).
    useEffect(() => {
        if (phase !== "running") return;
        const id = setInterval(() => setNow(performance.now()), 100);
        return () => clearInterval(id);
    }, [phase]);
    useEffect(() => {
        if (phase === "running" && (elapsedMs >= seconds * 1000 || s.done)) finish();
    }, [phase, elapsedMs, seconds, s.done, finish]);

    const retry = useCallback(() => {
        if (performance.now() - endedAt >= RETRY_GRACE_MS) restart();
    }, [endedAt, restart]);

    // Space (or Enter) to retry once the run is over.
    useEffect(() => {
        if (phase !== "done") return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== " " && e.key !== "Enter") return;
            const el = e.target as HTMLElement;
            if (el !== inputRef.current && el?.closest?.("button, a, input, select, textarea")) return;
            e.preventDefault();
            retry();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [phase, retry]);

    // Every fresh mistake gives the sign a little shake.
    useEffect(() => {
        if (s.mistakes && !reduce) shake.start({ x: [0, -7, 6, -4, 2, 0], transition: { duration: 0.35 } });
    }, [s.mistakes, reduce, shake]);

    const onInput = (value: string) => {
        if (loading || phase === "done") return;
        const t = performance.now();
        const t0 = startedAt ?? t;
        if (t - t0 >= seconds * 1000) { finish(); return; }

        // Log the edit as "delete n" and/or "insert text" from the common prefix.
        const prev = s.typed;
        const next = value.slice(0, s.target.length);
        let p = 0;
        while (p < prev.length && p < next.length && prev[p] === next[p]) p++;
        const rel = Math.round(t - t0);
        if (prev.length > p) logRef.current.push([rel, prev.length - p]);
        if (next.length > p) logRef.current.push([rel, next.slice(p)]);

        if (phase === "ready" && next.length) {
            setStartedAt(t0);
            setNow(t0);
            setPhase("running");
            nextRun.current = { key: `${seconds}-${pack}`, run: fetchRun(seconds, pack) };
        }
        s.input(value);
    };

    const pickSeconds = (d: Duration) => { setSeconds(d); restart(d, pack); };
    const pickPack = (p: PackId) => { setPack(p); restart(seconds, p); };

    // Cut the run into chunks of whole words that fit on one line (trailing
    // space included). A word that would overflow starts the next chunk, so
    // the sign never wraps mid-chunk no matter how long the words are.
    const chunks = useMemo(() => {
        const out: { start: number; end: number }[] = [];
        const len = s.target.length;
        let start = 0;
        let pos = 0;
        for (const w of s.target.split(" ")) {
            const next = Math.min(pos + w.length + 1, len);
            if (next - start > lineChars && pos > start) { out.push({ start, end: pos }); start = pos; }
            pos = next;
        }
        if (start < len) out.push({ start, end: len });
        return out;
    }, [s.target, lineChars]);

    const caretAt = s.typed.length;
    const ci = Math.max(0, chunks.findIndex((c) => caretAt < c.end));
    const chunk = chunks[ci] ?? { start: 0, end: 0 };
    const upcoming = chunks[ci + 1];
    const signText = s.target.slice(chunk.start, chunk.end).trim();

    const hint = loading
        ? "Shuffling the words…"
        : phase === "running"
            ? `${remaining}s left · ${liveWpm} wpm`
            : phase === "done"
                ? saveNote
                : !focused
                    ? "Click here and start typing"
                    : "The clock starts when you do ↓";

    return (
        <div className="flex flex-col items-center gap-6">
            {/* Run length + word pack. */}
            <div className="flex w-full max-w-3xl flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-base-content/60">
                    Playing as <span className="font-semibold text-base-content">{name}</span>
                    <button type="button" onClick={onChangeName} className="link link-hover ml-2 text-primary">
                        change
                    </button>
                </p>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="join" role="group" aria-label="Run length">
                        {DURATIONS.map((d) => (
                            <button
                                key={d}
                                type="button"
                                aria-pressed={seconds === d}
                                onClick={() => pickSeconds(d)}
                                className={`btn join-item btn-sm ${seconds === d ? "btn-primary" : "btn-ghost"}`}
                            >
                                {d}s
                            </button>
                        ))}
                    </div>
                    <div className="join" role="group" aria-label="Word pack">
                        {(Object.keys(PACKS) as PackId[]).map((p) => (
                            <button
                                key={p}
                                type="button"
                                aria-pressed={pack === p}
                                onClick={() => pickPack(p)}
                                className={`btn join-item btn-sm gap-1 ${pack === p ? "btn-primary" : "btn-ghost"}`}
                            >
                                <span aria-hidden="true">{PACKS[p].emoji}</span> {PACKS[p].label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div
                className={`relative w-full max-w-3xl ${phase === "done" ? "cursor-pointer" : "cursor-text"} overflow-hidden rounded-2xl bg-base-100 px-6 py-10 shadow-sm ring-1 ring-base-300 transition-shadow duration-300 focus-within:ring-2 focus-within:ring-primary/50 focus-within:shadow-lg md:py-14`}
                onClick={() => (phase === "done" ? retry() : inputRef.current?.focus())}
            >
                {/* The clock: a thin bar that drains across the top edge. */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-base-200" aria-hidden="true">
                    <div
                        className="h-full bg-primary transition-[width] duration-100 ease-linear"
                        style={{ width: `${phase === "ready" ? 100 : phase === "done" ? 0 : Math.max(0, 100 - (elapsedMs / (seconds * 10)))}%` }}
                    />
                </div>

                <input
                    ref={inputRef}
                    value={s.typed}
                    onChange={(e) => onInput(e.target.value)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    onPaste={(e) => e.preventDefault()}
                    aria-label={`Type: ${signText}`}
                    autoFocus
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    className={`absolute inset-0 h-full w-full cursor-text opacity-0 ${phase === "done" ? "pointer-events-none" : ""}`}
                />

                <motion.div ref={signRef} animate={shake} className="pointer-events-none relative select-none" aria-hidden="true">
                    {/* Ten-letter probe in the sign's exact font, for lineChars. */}
                    <span ref={measureRef} className="invisible absolute left-0 top-0 whitespace-pre font-mono text-3xl font-bold tracking-tight md:text-5xl">
                        mmmmmmmmmm
                    </span>
                    {phase === "done" && result ? (
                        // Time's up: the score takes over the sign and ripples a wave.
                        <>
                            <p className="text-center font-mono text-3xl font-bold leading-relaxed tracking-tight text-primary md:text-5xl">
                                {[...`${result.wpm} wpm`].map((ch, i) => (
                                    <motion.span
                                        key={`${result.wpm}-${i}`}
                                        className="inline-block whitespace-pre"
                                        initial={reduce ? false : { y: 0, opacity: 0 }}
                                        animate={reduce ? { opacity: 1 } : { y: [0, -10, 0], opacity: 1 }}
                                        transition={{ duration: 0.45, delay: i * 0.04, ease: "easeOut" }}
                                    >
                                        {ch}
                                    </motion.span>
                                ))}
                            </p>
                            <p className="mt-2 h-8 text-center font-mono text-lg text-base-content/60 md:h-10 md:text-2xl">
                                {result.accuracy}% accuracy · {seconds}s · {PACKS[pack].label}
                            </p>
                        </>
                    ) : (
                        <>
                            {/* The current chunk. Each new chunk rises in from the preview line. */}
                            <motion.p
                                key={`${s.target.length}-${chunk.start}`}
                                initial={reduce || chunk.start === 0 ? false : { opacity: 0, y: 18 }}
                                animate={{ opacity: loading ? 0.3 : 1, y: 0 }}
                                transition={{ duration: 0.22, ease: "easeOut" }}
                                className="min-h-[1.625em] text-center font-mono text-3xl font-bold leading-relaxed tracking-tight md:text-5xl"
                            >
                                {wordGroups(s.target, chunk.start, chunk.end).map(([a, b]) => (
                                    <span key={a} className="inline-block whitespace-nowrap">
                                        {[...s.target.slice(a, b)].map((ch, j) => {
                                            const i = a + j;
                                            const st = s.statuses[i];
                                            return (
                                                <span
                                                    key={i}
                                                    className={`relative inline-block whitespace-pre transition-colors duration-150 ${
                                                        st === "correct" ? "text-primary" : st === "wrong" ? "rounded-sm bg-error/15 text-error" : "text-base-content/60"
                                                    }`}
                                                >
                                                    {/* Caret glides between letters via a shared layoutId. */}
                                                    {i === caretAt && !loading && (
                                                        <motion.span
                                                            layoutId="typer-caret"
                                                            transition={{ type: "spring", stiffness: 700, damping: 40 }}
                                                            className={`absolute -left-[2px] top-[12%] h-[76%] w-[3px] rounded-full bg-primary ${phase === "ready" ? "typer-caret-idle" : ""}`}
                                                        />
                                                    )}
                                                    {ch}
                                                </span>
                                            );
                                        })}
                                    </span>
                                ))}
                            </motion.p>
                            {/* What's next, small and quiet underneath. */}
                            <p className="mt-2 h-8 truncate text-center font-mono text-lg text-base-content/60 md:h-10 md:text-2xl">
                                {upcoming ? s.target.slice(upcoming.start, upcoming.end).trim() : ""}
                            </p>
                        </>
                    )}
                </motion.div>

                {/* Retry prompt: a big spacebar that keeps pressing itself, so
                    "hit space" reads at a glance. It wakes up once the grace
                    window is over, right when space starts working. */}
                {phase === "done" && (
                    <motion.div
                        initial={reduce ? false : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: RETRY_GRACE_MS / 1000, duration: 0.25 }}
                        className="mt-6 flex flex-col items-center gap-2"
                    >
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); retry(); }}
                            className="group flex items-center gap-3 rounded-xl px-3 py-2 text-base font-semibold text-base-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                            Press
                            <motion.kbd
                                animate={reduce ? undefined : { y: [0, 0, 3, 0], boxShadow: ["0 4px 0 var(--color-primary)", "0 4px 0 var(--color-primary)", "0 1px 0 var(--color-primary)", "0 4px 0 var(--color-primary)"] }}
                                transition={{ duration: 1.4, times: [0, 0.6, 0.7, 0.8], repeat: Infinity, delay: RETRY_GRACE_MS / 1000 }}
                                style={{ boxShadow: "0 4px 0 var(--color-primary)" }}
                                className="inline-flex h-10 w-36 items-center justify-center rounded-lg border-2 border-primary bg-primary/10 font-mono text-sm text-primary group-hover:bg-primary/20 md:w-44"
                            >
                                space
                            </motion.kbd>
                            to re-try
                        </button>
                        <span className="text-xs text-base-content/60">or click anywhere in the box</span>
                    </motion.div>
                )}

                <p className="pointer-events-none mt-4 h-5 text-center text-sm text-base-content/60 tabular-nums">
                    {hint}
                </p>
                <p className="sr-only" aria-live="polite">
                    {phase === "done" && result
                        ? `Time's up. ${result.wpm} words per minute, ${result.accuracy}% accuracy.${placed?.rank ? ` You placed number ${placed.rank} on the leaderboard.` : ""} Press space to try again.`
                        : ""}
                </p>
            </div>

            {/* Placement callout. */}
            <div className="flex h-6 items-center justify-center">
                {phase === "done" && placed?.rank && (
                    <motion.p
                        initial={reduce ? false : { scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 18 }}
                        className="text-sm font-semibold text-base-content"
                    >
                        {placed.rank === 1 ? "👑 New #1! The board is yours." : `🎉 You placed #${placed.rank} on the board!`}
                    </motion.p>
                )}
            </div>

            {/* One board per run length, side by side; the one you're playing is outlined. */}
            <div className="grid w-full max-w-3xl gap-6 md:grid-cols-2">
                {DURATIONS.map((d) => (
                    <Leaderboard
                        key={d}
                        seconds={d}
                        active={d === seconds}
                        entries={boards[d] ?? []}
                        you={name}
                        highlightAt={d === seconds ? placed?.at ?? null : null}
                        status={boardStatus}
                    />
                ))}
            </div>
        </div>
    );
};
