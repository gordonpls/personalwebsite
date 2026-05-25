import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

interface ScrollAreaProps {
    className?: string;          // outer wrapper — flex/height participation (e.g. "flex-1 min-h-0")
    viewportClassName?: string;  // scroll viewport — height caps (e.g. "max-h-[28rem] lg:max-h-none")
    contentClassName?: string;   // inner content — padding / spacing (e.g. "pr-2 space-y-5")
    children: ReactNode;
}

// Scroll container with a custom, always-visible thumb that doesn't depend on
// the OS/native scrollbar. macOS overlay scrollbars auto-hide, and Chrome
// ignores ::-webkit-scrollbar styling when scrollbar-width is set — both made
// the native bar unreliable. Here the native bar is hidden and we render our own.
export const ScrollArea = ({ className = "", viewportClassName = "", contentClassName = "", children }: ScrollAreaProps) => {
    const viewportRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const dragRef = useRef<{ startY: number; startTop: number } | null>(null);
    const [thumb, setThumb] = useState<{ top: number; height: number } | null>(null);

    const recompute = useCallback(() => {
        const el = viewportRef.current;
        if (!el) return;
        const { scrollTop, scrollHeight, clientHeight } = el;
        if (scrollHeight <= clientHeight + 1) { setThumb(null); return; } // no overflow
        const height = Math.max((clientHeight / scrollHeight) * clientHeight, 28);
        const maxTop = clientHeight - height;
        const span = scrollHeight - clientHeight;
        setThumb({ top: span > 0 ? (scrollTop / span) * maxTop : 0, height });
    }, []);

    useEffect(() => {
        const el = viewportRef.current, content = contentRef.current;
        if (!el || !content) return;
        recompute();
        const ro = new ResizeObserver(recompute);
        ro.observe(el);        // viewport size changes
        ro.observe(content);   // content height changes (e.g. switching holdings)
        el.addEventListener("scroll", recompute, { passive: true });
        return () => { ro.disconnect(); el.removeEventListener("scroll", recompute); };
    }, [recompute]);

    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            const el = viewportRef.current, d = dragRef.current;
            if (!el || !d) return;
            const { scrollHeight, clientHeight } = el;
            const thumbH = Math.max((clientHeight / scrollHeight) * clientHeight, 28);
            const trackSpace = clientHeight - thumbH;
            if (trackSpace > 0) el.scrollTop = d.startTop + ((e.clientY - d.startY) / trackSpace) * (scrollHeight - clientHeight);
        };
        const onUp = () => { if (dragRef.current) { dragRef.current = null; document.body.style.userSelect = ""; } };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
        return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    }, []);

    const onThumbDown = (e: React.MouseEvent) => {
        const el = viewportRef.current;
        if (!el) return;
        e.preventDefault();
        dragRef.current = { startY: e.clientY, startTop: el.scrollTop };
        document.body.style.userSelect = "none";
    };

    return (
        <div className={`relative ${className}`}>
            <div
                ref={viewportRef}
                className={`h-full overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${viewportClassName}`}
            >
                <div ref={contentRef} className={contentClassName}>{children}</div>
            </div>
            {thumb && (
                <div
                    onMouseDown={onThumbDown}
                    role="presentation"
                    className="absolute right-0.5 w-1.5 rounded-full bg-base-content/30 hover:bg-base-content/50 active:bg-base-content/60 transition-colors cursor-grab active:cursor-grabbing"
                    style={{ top: thumb.top, height: thumb.height }}
                />
            )}
        </div>
    );
};
