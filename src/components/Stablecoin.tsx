import { useState, useEffect } from "react";
import { Navbar } from "./Navbar";

export default function Stablecoin() {
    const [iframeKey, setIframeKey] = useState(0);

    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = ""; };
    }, []);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                setIframeKey((k) => k + 1);
            }
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, []);

    return (
        <div className="w-full h-screen overflow-hidden bg-base-100 pt-16">
            <Navbar />
            <div className="px-4 pt-4" style={{ height: "calc(100vh - 4rem)" }}>
                <iframe
                    key={iframeKey}
                    src="https://stablecoin-dashboard-gz.streamlit.app/?embed=true"
                    title="Stablecoin Dashboard"
                    style={{ height: "100%", width: "100%", border: "0", outline: "none", display: "block" }}
                />
            </div>
        </div>
    );
}
