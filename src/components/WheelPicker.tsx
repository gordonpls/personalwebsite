// iOS-style scroll wheel: a short column of values that snaps to the middle
// row, with the rows fading and shrinking away from it. Scroll, drag, tap a
// row, or use the arrow keys. `value` must be one of `values`.

import { useEffect, useRef, useState } from "react";

const ROW = 40;      // px per row
const VISIBLE = 5;   // rows in view (odd, so one sits in the middle)

export const WheelPicker = <T extends string | number>({ values, value, onChange, label, format = String }: {
    values: readonly T[];
    value: T;
    onChange: (v: T) => void;
    label: string;
    format?: (v: T) => string;
}) => {
    const ref = useRef<HTMLDivElement>(null);
    const index = Math.max(0, values.indexOf(value));
    // Fractional scroll position in rows, for the per-row fade/scale.
    const [pos, setPos] = useState(index);
    const settle = useRef<number | undefined>(undefined);

    // Start on the current value, and follow it when it changes from outside.
    useEffect(() => {
        const el = ref.current;
        if (el && Math.round(el.scrollTop / ROW) !== index) {
            el.scrollTo({ top: index * ROW });
            setPos(index);
        }
    }, [index]);

    const onScroll = () => {
        const el = ref.current;
        if (!el) return;
        setPos(el.scrollTop / ROW);
        // Commit once the wheel stops moving.
        window.clearTimeout(settle.current);
        settle.current = window.setTimeout(() => {
            const i = Math.min(values.length - 1, Math.max(0, Math.round(el.scrollTop / ROW)));
            if (values[i] !== value) onChange(values[i]);
        }, 90);
    };
    useEffect(() => () => window.clearTimeout(settle.current), []);

    const go = (i: number) => {
        const j = Math.min(values.length - 1, Math.max(0, i));
        ref.current?.scrollTo({ top: j * ROW, behavior: "smooth" });
    };

    const pad = ((VISIBLE - 1) / 2) * ROW;

    return (
        <div className="relative mx-auto w-40 select-none" style={{ height: VISIBLE * ROW }}>
            {/* The selection band behind the middle row. */}
            <div className="pointer-events-none absolute inset-x-0 rounded-xl bg-base-200 ring-1 ring-base-300" style={{ top: pad, height: ROW }} />
            <div
                ref={ref}
                role="listbox"
                aria-label={label}
                aria-activedescendant={`wheel-${String(value)}`}
                tabIndex={0}
                onScroll={onScroll}
                onKeyDown={(e) => {
                    if (e.key === "ArrowDown") { e.preventDefault(); go(index + 1); }
                    if (e.key === "ArrowUp") { e.preventDefault(); go(index - 1); }
                }}
                className="relative h-full snap-y snap-mandatory overflow-y-scroll rounded-xl outline-none [scrollbar-width:none] focus-visible:ring-2 focus-visible:ring-primary [&::-webkit-scrollbar]:hidden"
                style={{
                    paddingBlock: pad,
                    maskImage: "linear-gradient(to bottom, transparent, black 30%, black 70%, transparent)",
                    WebkitMaskImage: "linear-gradient(to bottom, transparent, black 30%, black 70%, transparent)",
                }}
            >
                {values.map((v, i) => {
                    const d = Math.min(Math.abs(i - pos), 3);
                    return (
                        <div
                            key={String(v)}
                            id={`wheel-${String(v)}`}
                            role="option"
                            aria-selected={i === index}
                            onClick={() => go(i)}
                            className="flex snap-center cursor-pointer items-center justify-center text-2xl font-semibold tabular-nums text-base-content"
                            style={{ height: ROW, opacity: 1 - d * 0.28, transform: `scale(${1 - d * 0.1}) rotateX(${(i - pos) * 18}deg)` }}
                        >
                            {format(v)}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
