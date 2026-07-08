// Analytics utility — all tracking is off in dev unless VITE_ANALYTICS_ENABLED=true.
// Never throws; analytics failures must never affect site functionality.

const ANALYTICS_ENABLED =
  import.meta.env.PROD || import.meta.env.VITE_ANALYTICS_ENABLED === "true";

const IGNORE_KEY = "analytics_ignore";

const CONTROL_ROUTES = new Set([
  "/ignore",
  "/track",
  "/analytics-ignore",
  "/analytics-track",
]);

// ── Self-exclusion helpers ─────────────────────────────────────────────────

export function isAnalyticsIgnored(): boolean {
  try {
    const v = localStorage.getItem(IGNORE_KEY);
    return v === "true" || v === "1";
  } catch {
    return false;
  }
}

export function enableAnalyticsIgnore(): void {
  try {
    localStorage.setItem(IGNORE_KEY, "true");
  } catch {}
}

export function disableAnalyticsIgnore(): void {
  try {
    localStorage.removeItem(IGNORE_KEY);
  } catch {}
}

// ── Route guards ───────────────────────────────────────────────────────────

export function isAnalyticsControlRoute(path: string): boolean {
  return CONTROL_ROUTES.has(path);
}

function shouldTrack(path: string): boolean {
  if (!ANALYTICS_ENABLED) return false;
  if (isAnalyticsIgnored()) return false;
  if (path.startsWith("/admin")) return false;
  if (isAnalyticsControlRoute(path)) return false;
  return true;
}

// ── Payload types ──────────────────────────────────────────────────────────

interface EventPayload {
  eventType: string;
  path?: string;
  projectSlug?: string;
  referrer?: string;
  metadata?: Record<string, unknown>;
}

// ── Transport ──────────────────────────────────────────────────────────────

function sendEvent(payload: EventPayload): void {
  try {
    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      // sendBeacon with a Blob preserves application/json content-type
      const sent = navigator.sendBeacon(
        "/api/analytics/event",
        new Blob([body], { type: "application/json" })
      );
      if (sent) return;
    }
    // Fallback: keepalive fetch so it survives page navigation
    fetch("/api/analytics/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {}
}

// ── Public API ─────────────────────────────────────────────────────────────

export function trackPageView(
  path: string,
  options?: { referrer?: string; projectSlug?: string }
): void {
  if (!shouldTrack(path)) return;
  let referrerHost: string | undefined;
  try {
    if (options?.referrer || document.referrer) {
      referrerHost = new URL(options?.referrer || document.referrer).hostname;
    }
  } catch {}
  sendEvent({
    eventType: "page_view",
    path,
    projectSlug: options?.projectSlug,
    referrer: referrerHost,
  });
}

export function trackEvent(
  eventType: string,
  options?: {
    path?: string;
    projectSlug?: string;
    metadata?: Record<string, unknown>;
  }
): void {
  const path = options?.path ?? window.location.pathname;
  if (!shouldTrack(path)) return;
  sendEvent({
    eventType,
    path,
    projectSlug: options?.projectSlug,
    metadata: options?.metadata,
  });
}

// ── Data-attribute event delegation ───────────────────────────────────────
// Attach once at app init. Reads data-track / data-project attributes.

let _delegationInit = false;

export function initDelegatedTracking(): void {
  if (!ANALYTICS_ENABLED || _delegationInit) return;
  _delegationInit = true;
  document.addEventListener(
    "click",
    (e) => {
      if (isAnalyticsIgnored()) return;
      const el = (e.target as Element).closest("[data-track]");
      if (!el) return;
      const eventType = el.getAttribute("data-track") || "click";
      const projectSlug = el.getAttribute("data-project") || undefined;
      trackEvent(eventType, { projectSlug });
    },
    { capture: true }
  );
}
