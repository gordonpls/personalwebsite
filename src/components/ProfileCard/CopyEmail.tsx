// Email chip for the Hero: clicking the address or the copy icon beside it
// copies the address (no mailto: nobody wants a mail app popping open). The
// icon morphs into a check and a "Copied ✓" bubble floats up. If the
// clipboard is unavailable (insecure context, denied permission), the address
// is selected instead so ⌘C / long-press copy works.

import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { trackEvent } from '../../lib/analytics';

const CopyEmail = ({ icon, email, className = '' }: { icon: React.ReactNode; email: string; className?: string }) => {
    const [copied, setCopied] = useState(false);
    const timer = useRef(0);
    const addressRef = useRef<HTMLSpanElement>(null);
    useEffect(() => () => window.clearTimeout(timer.current), []);

    const copy = async () => {
        trackEvent('email_clicked');
        try {
            await navigator.clipboard.writeText(email);
            setCopied(true);
            window.clearTimeout(timer.current);
            timer.current = window.setTimeout(() => setCopied(false), 1600);
        } catch {
            const sel = window.getSelection();
            if (sel && addressRef.current) {
                const range = document.createRange();
                range.selectNodeContents(addressRef.current);
                sel.removeAllRanges();
                sel.addRange(range);
            }
        }
    };

    return (
        <div className={className}>
            {icon}
            <button type="button" onClick={copy} className="cursor-copy hover:underline" title="Click to copy">
                <span ref={addressRef}>{email}</span>
            </button>
            <span className="relative -my-1 -mr-1.5 flex">
                <button
                    type="button"
                    onClick={copy}
                    aria-label={copied ? 'Email copied' : 'Copy email address'}
                    title="Copy"
                    className="grid size-7 place-items-center rounded-full opacity-70 transition hover:bg-white/60 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-primary active:scale-90"
                >
                    {/* Two-pages icon swaps for a check while "copied". */}
                    <AnimatePresence mode="wait" initial={false}>
                        <motion.svg
                            key={copied ? 'check' : 'copy'}
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.5, opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className={`size-4 ${copied ? 'text-success' : ''}`}
                            aria-hidden="true"
                        >
                            {copied ? (
                                <path d="M5 12.5l4.5 4.5L19 7.5" />
                            ) : (
                                <>
                                    <rect x="9" y="9" width="11" height="11" rx="2.5" />
                                    <path d="M15 9V6.5A2.5 2.5 0 0 0 12.5 4h-6A2.5 2.5 0 0 0 4 6.5v6A2.5 2.5 0 0 0 6.5 15H9" />
                                </>
                            )}
                        </motion.svg>
                    </AnimatePresence>
                </button>
                <AnimatePresence>
                    {copied && (
                        <motion.span
                            role="status"
                            initial={{ opacity: 0, y: 6, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                            className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-neutral px-3 py-1 text-xs font-semibold text-neutral-content shadow-lg"
                        >
                            Copied ✓
                        </motion.span>
                    )}
                </AnimatePresence>
            </span>
        </div>
    );
};

export default CopyEmail;
