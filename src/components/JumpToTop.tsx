import { useState, useEffect } from "react";

export const JumpToTop = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const toggleVisibility = () => {
            if (window.scrollY > 1) {
                setIsVisible(true);
            } else {
                setIsVisible(false);
            }
        };
        window.addEventListener("scroll", toggleVisibility);
        return () => window.removeEventListener("scroll", toggleVisibility);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    };
    return (
        <div className={`z-50 rounded-md ring animate-bounce ring-2 ring-primary ${isVisible ? "opacity-100" : "opacity-0 pointer-events-none"}`} onClick={scrollToTop}>
        <svg className="w-[24px] h-[24px]" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path className="stroke stroke-primary" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m5 15 7-7 7 7" />
        </svg>
    </div>
    )
}
