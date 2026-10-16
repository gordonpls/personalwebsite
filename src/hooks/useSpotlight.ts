// Cursor spotlight: returns a pointer handler that feeds the mouse position
// into --mx/--my on the element, which the .spotlight CSS rule turns into a
// soft radial glow. Mouse only; touch and pen don't get a glow.

import type { PointerEvent } from "react";

export function useSpotlight() {
    return (e: PointerEvent<HTMLElement>) => {
        if (e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
        e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
}
