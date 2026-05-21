import { useState, useEffect } from "react";
import { Navbar } from "./Navbar";

export default function Stablecoin() {
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = ""; };
    }, []);

    return (
        <div className="w-full h-screen overflow-hidden bg-base-100 pt-16">
            <Navbar />
            <div className="px-4 pt-4 relative" style={{ height: "calc(100vh - 4rem)" }}>
                {!loaded && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-base-content/40">
                        <span className="loading loading-spinner loading-lg" />
                        <span className="text-sm">Loading dashboard — may take up to a minute on first visit</span>
                    </div>
                )}
                <iframe
                    src="https://stablecoin-dashboard-gz.streamlit.app/?embed=true"
                    title="Stablecoin Dashboard"
                    onLoad={() => setLoaded(true)}
                    style={{
                        height: "100%",
                        width: "100%",
                        border: "0",
                        outline: "none",
                        display: "block",
                        opacity: loaded ? 1 : 0,
                        transition: "opacity 0.3s ease",
                    }}
                />
            </div>
        </div>
    );
}
