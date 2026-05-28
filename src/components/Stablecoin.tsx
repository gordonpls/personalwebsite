import { useEffect } from "react";

// /stablecoin is a friendly path on this domain that sends visitors to the live
// dashboard (now hosted standalone, not embedded). Production also does a 302 at
// the server (.htaccess); this client redirect covers SPA nav and local dev.
const DASHBOARD_URL = "https://stablecoin-dashboard-gz.streamlit.app/";

export default function Stablecoin() {
    useEffect(() => {
        window.location.replace(DASHBOARD_URL);
    }, []);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-base-100 px-4 text-center">
            <span className="loading loading-spinner loading-lg text-primary" />
            <p className="text-base-content/70">Opening the stablecoin dashboard…</p>
            <a href={DASHBOARD_URL} className="link link-primary text-sm">Continue to the dashboard →</a>
        </div>
    );
}
