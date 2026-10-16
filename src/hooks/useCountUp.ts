// Count-up for stat numbers: the first time the element scrolls into view the
// value animates from 0 to its target; after that it just tracks the target
// (so sliders etc. update instantly). Skipped under prefers-reduced-motion.

import { useEffect, useRef, useState } from "react";

export function useCountUp<T extends HTMLElement>(target: number, durationMs = 900) {
    const ref = useRef<T>(null);
    const [phase, setPhase] = useState<"waiting" | "running" | "done">(() =>
        window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "done" : "waiting",
    );
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        if (phase !== "waiting" || !ref.current) return;
        const io = new IntersectionObserver(([e]) => {
            if (e.isIntersecting) { setPhase("running"); io.disconnect(); }
        }, { threshold: 0.6 });
        io.observe(ref.current);
        return () => io.disconnect();
    }, [phase]);

    useEffect(() => {
        if (phase !== "running") return;
        const start = performance.now();
        let raf = 0;
        const tick = (now: number) => {
            const t = Math.min(1, (now - start) / durationMs);
            setProgress(1 - Math.pow(1 - t, 3)); // ease-out cubic
            if (t < 1) raf = requestAnimationFrame(tick);
            else setPhase("done");
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [phase, durationMs]);

    const value = phase === "done" ? target : target * (phase === "running" ? progress : 0);
    return { ref, value };
}
