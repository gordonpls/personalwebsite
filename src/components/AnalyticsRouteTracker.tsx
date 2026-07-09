import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import {
  trackPageView,
  isAnalyticsControlRoute,
  initDelegatedTracking,
} from "../lib/analytics";

// Maps route paths to project slugs for page_view enrichment.
const PROJECT_SLUGS: Record<string, string> = {
  "/investments": "investing-dashboard",
  "/allocation": "allocation-quiz",
  "/stablecoin": "stablecoin-dashboard",
  "/fortune": "fortune-cookie",
};

export function AnalyticsRouteTracker() {
  const location = useLocation();
  const prevPathRef = useRef<string | null>(null);

  // Initialize delegated tracking once on mount (handles data-track clicks).
  useEffect(() => {
    initDelegatedTracking();
  }, []);

  useEffect(() => {
    const path = location.pathname;
    // Skip duplicate tracking: same-path re-renders and React Strict Mode
    // double-invoke both see prevPathRef already set to this path.
    if (path === prevPathRef.current) return;
    prevPathRef.current = path;

    if (path.startsWith("/admin")) return;
    if (path.startsWith("/blog")) return;
    if (isAnalyticsControlRoute(path)) return;

    trackPageView(path, {
      referrer: document.referrer || undefined,
      projectSlug: PROJECT_SLUGS[path],
    });
  }, [location.pathname]);

  return null;
}
