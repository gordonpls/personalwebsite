// Handles /ignore, /track, /analytics-ignore, /analytics-track.
// Visiting these routes sets or clears the local analytics exclusion flag,
// then redirects to the home page. No server call required.

import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  enableAnalyticsIgnore,
  disableAnalyticsIgnore,
  isAnalyticsIgnored,
} from "../lib/analytics";

const IGNORE_ROUTES = new Set(["/ignore", "/analytics-ignore"]);
const TRACK_ROUTES = new Set(["/track", "/analytics-track"]);

export function AnalyticsControl() {
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"ignoring" | "tracking" | null>(null);

  useEffect(() => {
    const path = location.pathname;
    if (IGNORE_ROUTES.has(path)) {
      enableAnalyticsIgnore();
      setStatus("ignoring");
    } else if (TRACK_ROUTES.has(path)) {
      disableAnalyticsIgnore();
      setStatus("tracking");
    }
    // Redirect after a brief confirmation so the user sees the status.
    const t = setTimeout(() => navigate("/", { replace: true }), 2000);
    return () => clearTimeout(t);
  }, [location.pathname, navigate]);

  const ignored = isAnalyticsIgnored();

  return (
    <div className="flex min-h-screen items-center justify-center bg-base-100">
      <div className="card bg-base-200 border border-base-300 shadow-md w-full max-w-sm p-8 text-center space-y-4">
        <div className="text-4xl">
          {status === "ignoring" ? "🚫" : "✅"}
        </div>
        <h1 className="text-xl font-bold text-base-content">
          {status === "ignoring"
            ? "Analytics excluded"
            : "Analytics re-enabled"}
        </h1>
        <p className="text-sm text-base-content/60">
          {status === "ignoring"
            ? "Your visits will no longer be tracked in this browser."
            : "Your visits will be tracked again in this browser."}
        </p>
        <div className="badge badge-outline text-xs">
          Current status: {ignored ? "excluded" : "tracked"}
        </div>
        <p className="text-xs text-base-content/40">Redirecting to home…</p>
      </div>
    </div>
  );
}
