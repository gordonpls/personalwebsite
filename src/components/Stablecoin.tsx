import { useState, useEffect, useRef } from "react";
import { Navbar } from "./Navbar";
import { StablecoinArchitecture } from "./StablecoinArchitecture";

function DashboardSkeleton() {
    return (
        <div className="w-full h-full overflow-hidden px-8 py-6 space-y-6 bg-base-300">
            {/* Title */}
            <div className="space-y-2 pt-2">
                <div className="skeleton h-8 w-72 rounded" />
                <div className="skeleton h-4 w-[480px] max-w-full rounded" />
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="skeleton rounded-xl h-28" />
                ))}
            </div>

            {/* Tab bar */}
            <div className="flex gap-6 border-b border-base-content/10 pb-2">
                {["Overview", "Supply", "Peg Deviation", "Risk Scores", "API Usage"].map((tab, i) => (
                    <div key={tab} className={`skeleton h-4 rounded ${i === 0 ? "w-20" : "w-24"}`} />
                ))}
            </div>

            {/* Section heading */}
            <div className="space-y-1">
                <div className="skeleton h-6 w-48 rounded" />
                <div className="skeleton h-3 w-96 max-w-full rounded" />
            </div>

            {/* Filter row */}
            <div className="flex gap-4">
                <div className="skeleton h-10 w-64 rounded-lg" />
                <div className="skeleton h-10 w-48 rounded-lg" />
            </div>

            {/* Table header */}
            <div className="space-y-2">
                <div className="flex gap-4">
                    {[80, 120, 100, 90, 90, 100, 110, 90, 100, 110].map((w, i) => (
                        <div key={i} className="skeleton h-3 rounded" style={{ width: w }} />
                    ))}
                </div>
                <div className="divider my-1" />
                {Array.from({ length: 8 }).map((_, row) => (
                    <div key={row} className="flex gap-4 items-center py-1">
                        {[80, 120, 100, 90, 90, 100, 110, 90, 100, 110].map((w, col) => (
                            <div key={col} className="skeleton h-3 rounded" style={{ width: w, opacity: 1 - row * 0.08 }} />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function Stablecoin() {
    const [showContent, setShowContent] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = ""; };
    }, []);

    const handleLoad = () => {
        // onLoad fires when the iframe HTML arrives; Streamlit still needs ~2.5s
        // to boot its React app, open a WebSocket, and render before content is visible
        timerRef.current = setTimeout(() => setShowContent(true), 2500);
    };

    useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

    return (
        <div className="w-full h-screen overflow-hidden bg-base-100 pt-16">
            <Navbar />
            <div className="px-4 pt-4 relative" style={{ height: "calc(100vh - 4rem)" }}>
                {!showContent && (
                    <div className="absolute inset-0">
                        <DashboardSkeleton />
                    </div>
                )}
                <iframe
                    src="https://stablecoin-dashboard-gz.streamlit.app/?embed=true"
                    title="Stablecoin Dashboard"
                    onLoad={handleLoad}
                    style={{
                        height: "100%",
                        width: "100%",
                        border: "0",
                        outline: "none",
                        display: "block",
                        opacity: showContent ? 1 : 0,
                        transition: "opacity 0.4s ease",
                    }}
                />
            </div>
            <StablecoinArchitecture />
        </div>
    );
}
