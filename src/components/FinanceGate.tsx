// Password gate for the investments dashboard.
//
// Locked: DashboardTeaser (labels readable, values blurred, all invented) with
// the unlock card over it. The teaser is plain markup with no fetches, so the
// locked page stays cheap to render. Unlocked: the real dashboard mounts
// against the API and fades in.

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { motion } from "framer-motion";
import { DashboardTeaser } from "./DashboardTeaser";
import { TickerTape, type TapeItem } from "./TickerTape";
import { unlockFinance, useFinanceUnlocked, verifyFinanceToken } from "../services/financeAuth";

const LockIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
        <rect x="4" y="11" width="16" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" strokeLinecap="round" />
    </svg>
);

const CoffeeIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
        <path d="M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9Z" />
        <path d="M16 11h1.5a2.5 2.5 0 0 1 0 5H16" />
        <path d="M8 3c0 1.2 1 1.3 1 2.5M12 3c0 1.2 1 1.3 1 2.5" />
    </svg>
);

// Locked tape: broad market indices (never the real holdings), values blurred.
// Numbers are invented; they only exist to be blurred.
const TEASER_TAPE: TapeItem[] = [
    { symbol: "SPX", price: 5821.4, change: 0.42 }, { symbol: "NDX", price: 20412.7, change: 0.87 },
    { symbol: "DJI", price: 42310.2, change: -0.18 }, { symbol: "RUT", price: 2231.5, change: 0.65 },
    { symbol: "VIX", price: 15.82, change: -3.1 }, { symbol: "TNX", price: 4.21, change: 0.9 },
    { symbol: "GOLD", price: 2654.3, change: 0.31 }, { symbol: "WTI", price: 71.44, change: -1.2 },
    { symbol: "BTC", price: 64210, change: 2.4 }, { symbol: "EURUSD", price: 1.0942, change: -0.08 },
];

const UnlockCard = () => {
    const [password, setPassword] = useState("");
    const [status, setStatus] = useState<"idle" | "checking" | "wrong" | "error">("idle");
    const [nudge, setNudge] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { inputRef.current?.focus({ preventScroll: true }); }, []);

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (!password.trim() || status === "checking") return;
        setStatus("checking");
        const result = await unlockFinance(password);
        if (result === "ok") return; // gate re-renders unlocked
        setStatus(result);
        if (result === "wrong") {
            setNudge((n) => n + 1);
            setPassword("");
            inputRef.current?.focus();
        }
    };

    return (
        <motion.div
            key={nudge}
            animate={nudge ? { x: [0, -4, 4, -2, 2, 0] } : undefined}
            transition={{ duration: 0.3 }}
            className="relative w-full max-w-sm rounded-2xl border border-base-300 bg-base-100 px-6 pb-6 pt-7 text-center shadow-xl"
        >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <CoffeeIcon />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-base-content">Private portfolio</h2>
            <p className="mt-1 text-sm text-base-content/70">Happy to share over coffee.</p>

            <form onSubmit={submit} className="mt-5 text-left">
                <label className="input w-full">
                    <LockIcon className="w-4 h-4 text-base-content/60" />
                    <span className="sr-only">Password</span>
                    <input
                        ref={inputRef}
                        id="finance-password"
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); if (status !== "checking") setStatus("idle"); }}
                        placeholder="Password"
                        aria-invalid={status === "wrong" || undefined}
                        aria-describedby="finance-password-help"
                        className="grow"
                    />
                </label>
                <p id="finance-password-help" aria-live="polite" className="mt-1.5 min-h-[1.25rem] text-xs text-base-content/70">
                    {status === "wrong" && "Try again."}
                    {status === "error" && "Couldn't reach the server. Please try again in a moment."}
                </p>
                <button type="submit" className="btn btn-primary mt-1 w-full" disabled={status === "checking"}>
                    {status === "checking" ? <span className="loading loading-spinner loading-sm" /> : "Unlock"}
                </button>
            </form>
        </motion.div>
    );
};

export const FinanceGate = ({ children }: { children: ReactNode }) => {
    const unlocked = useFinanceUnlocked();
    // Only fade in when the unlock happens on this page view, not when a
    // returning visitor arrives already unlocked.
    const [revealing, setRevealing] = useState(false);
    const wasUnlocked = useRef(unlocked);

    useEffect(() => { verifyFinanceToken(); }, []);
    useEffect(() => {
        if (unlocked && !wasUnlocked.current) setRevealing(true);
        wasUnlocked.current = unlocked;
    }, [unlocked]);

    if (unlocked) {
        return (
            <div className="relative">
                {/* Opacity only: a `filter` here would trap the fixed section nav. */}
                <motion.div
                    initial={revealing ? { opacity: 0 } : false}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    {children}
                </motion.div>
            </div>
        );
    }

    return (
        <div className="relative">
            <TickerTape items={TEASER_TAPE} label="Markets" redacted className="-mx-4 -mt-4 mb-6" />
            <h2 className="mb-4 text-2xl font-bold tracking-tight text-base-content">Personal Portfolio</h2>
            <div aria-hidden="true" inert className="pointer-events-none select-none">
                <DashboardTeaser />
            </div>
            {/* Soft spotlight behind the card so it reads clearly over the teaser. */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,var(--color-base-300)_0%,transparent_60%)] opacity-80" />
            <div className="absolute inset-0 flex items-start justify-center px-2 pt-40 sm:pt-48">
                <UnlockCard />
            </div>
        </div>
    );
};
