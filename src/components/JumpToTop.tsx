import { useState, useEffect } from "react";

export const JumpToTop = () => {
    const [isVisible, setIsVisible] = useState(false);

    // Checked at most once per frame (scroll fires many times per frame), and
    // React only hears about it when visibility actually flips.
    useEffect(() => {
        let frame = 0;
        let visible = false;
        const check = () => {
            frame = 0;
            const next = window.scrollY > 1;
            if (next !== visible) { visible = next; setIsVisible(next); }
        };
        const onScroll = () => { if (!frame) frame = requestAnimationFrame(check); };
        check();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(frame); };
    }, []);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    };
    return (
        <button
            type="button"
            aria-label="Scroll to top"
            onClick={scrollToTop}
            className={`z-50 rounded-md ring-2 ring-primary p-0.5 animate-bounce focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/70 ${isVisible ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        >
            <svg className="w-[24px] h-[24px]" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path className="stroke stroke-primary" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m5 15 7-7 7 7" />
            </svg>
        </button>
    )
}
