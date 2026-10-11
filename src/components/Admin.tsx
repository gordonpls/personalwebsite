import { useState, useEffect, useCallback } from "react";
import {
  isAnalyticsIgnored,
  enableAnalyticsIgnore,
  disableAnalyticsIgnore,
} from "../lib/analytics";

// ── Types ──────────────────────────────────────────────────────────────────

interface Overview {
  totalPageViews: number;
  uniqueVisitors: number;
  projectClicks: number;
  conversionClicks: number;
}

interface TopPage {
  path: string;
  views: number;
  unique_visitors: number;
}

interface ProjectRow {
  project_slug: string;
  event_type: string;
  count: number;
}

interface BreakdownRow {
  [key: string]: string | number;
  count: number;
}

interface Summary {
  overview: Overview;
  topPages: TopPage[];
  topProjects: ProjectRow[];
  deviceBreakdown: BreakdownRow[];
  browserBreakdown: BreakdownRow[];
  osBreakdown: BreakdownRow[];
  locationBreakdown: BreakdownRow[];
  referrerBreakdown: BreakdownRow[];
  dateRange: { start: string; end: string };
  range: string;
}

// ── Token storage ──────────────────────────────────────────────────────────

const TOKEN_KEY = "admin_token";

function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
function setToken(t: string): void {
  try { localStorage.setItem(TOKEN_KEY, t); } catch {}
}
function clearToken(): void {
  try { localStorage.removeItem(TOKEN_KEY); } catch {}
}

function authHeaders(): HeadersInit {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

// ── Auth helpers ───────────────────────────────────────────────────────────

async function verifySession(): Promise<boolean> {
  try {
    const r = await fetch("/api/admin/verify", {
      method: "POST",
      headers: authHeaders(),
    });
    return r.ok;
  } catch { return false; }
}

// ── Sub-components ─────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="stat bg-base-200 rounded-xl border border-base-300">
      <div className="stat-title text-base-content/60 text-xs">{label}</div>
      <div className="stat-value text-2xl font-bold text-base-content">{value.toLocaleString()}</div>
      {sub && <div className="stat-desc text-base-content/50 text-xs">{sub}</div>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold text-base-content/50 uppercase tracking-wider mb-3">{children}</h2>;
}

function BreakdownTable({ rows, labelKey, label = "Item" }: { rows: BreakdownRow[]; labelKey: string; label?: string }) {
  const total = rows.reduce((s, r) => s + (r.count as number), 0) || 1;
  return (
    <div className="space-y-2">
      {rows.map((r, i) => {
        const name = String(r[labelKey] || "Unknown");
        const pct = Math.round((r.count as number / total) * 100);
        return (
          <div key={i} className="flex items-center gap-3">
            <span className="w-28 text-xs text-base-content/70 truncate shrink-0">{name}</span>
            <div className="flex-1 bg-base-300 rounded-full h-1.5 overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs text-base-content/50 w-10 text-right shrink-0">{r.count as number}</span>
            <span className="text-xs text-base-content/30 w-8 text-right shrink-0">{pct}%</span>
          </div>
        );
      })}
      {rows.length === 0 && <p className="text-xs text-base-content/40">No data</p>}
    </div>
  );
}

const RANGE_LABELS: Record<string, string> = { "7d": "7 days", "30d": "30 days", month: "This month", all: "All time" };
const RANGES = ["7d", "30d", "month", "all"] as const;

// Project slug → display name
const PROJECT_NAMES: Record<string, string> = {
  "investing-dashboard": "Investing Dashboard",
  "allocation-quiz": "Allocation Quiz",
  "stablecoin-dashboard": "Stablecoin Dashboard",
  "fortune-cookie": "Fortune Cookie",
};

// One row per project, with its per-event counts kept in `counts` (spreading
// them into the row loses their type).
function groupProjects(rows: ProjectRow[]): { slug: string; counts: Record<string, number> }[] {
  const map: Record<string, Record<string, number>> = {};
  for (const r of rows) {
    if (!map[r.project_slug]) map[r.project_slug] = {};
    map[r.project_slug][r.event_type] = r.count;
  }
  return Object.entries(map).map(([slug, counts]) => ({ slug, counts }));
}

// ── Login form ─────────────────────────────────────────────────────────────

function LoginForm({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (r.ok) {
        const { token } = await r.json();
        setToken(token);
        onLogin();
      } else {
        setError("Incorrect password.");
      }
    } catch {
      setError("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-base-100">
      <div className="card bg-base-200 border border-base-300 shadow-xl w-full max-w-sm p-8">
        <h1 className="text-2xl font-bold text-base-content mb-1">Admin</h1>
        <p className="text-sm text-base-content/50 mb-6">Private analytics dashboard</p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label pb-1">
              <span className="label-text text-xs text-base-content/60">Password</span>
            </label>
            <input
              type="password"
              className="input input-bordered w-full"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              required
            />
          </div>
          {error && <p className="text-xs text-error">{error}</p>}
          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={loading}
          >
            {loading ? <span className="loading loading-spinner loading-sm" /> : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Dashboard ──────────────────────────────────────────────────────────────

// ── Dashboard password attempts ──────────────────────────────────────────

interface AttemptRow {
  created_at: string; visitor_hash: string | null; guess: string | null; guess_length: number | null; is_bot: number;
  device_type: string | null; browser: string | null; os: string | null; country: string | null; region: string | null;
}
interface RepeatRow {
  visitor_hash: string; day: string; attempts: number; first_at: string; last_at: string;
  country: string | null; region: string | null; device_type: string | null; browser: string | null; os: string | null;
}
interface Attempts { attempts: number; visitors: number; bots: number; lastAt: string | null; recent: AttemptRow[]; repeat: RepeatRow[] }

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const where = (r: { country: string | null; region: string | null }) =>
  r.country ? [r.region, r.country].filter(Boolean).join(", ") : "Unknown";
const device = (r: { device_type: string | null; browser: string | null; os: string | null }) =>
  [r.device_type, r.browser, r.os].filter(Boolean).join(" · ") || "Unknown";

// Wrong passwords at the /investments gate, with the guess as typed. Guesses
// are blanked after 30 days (only the length remains), since people sometimes
// type passwords they use elsewhere. Visitor IDs rotate daily, so "repeat"
// means within one day.
function FinanceAttempts({ range, onLogout }: { range: string; onLogout: () => void }) {
  const [data, setData] = useState<Attempts | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setError(false);
    fetch(`/api/admin/finance-attempts?range=${range}`, { headers: authHeaders() })
      .then((r) => {
        if (r.status === 401) { onLogout(); return null; }
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) => { if (!cancelled && d) setData(d); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [range, onLogout]);

  return (
    <section>
      <SectionTitle>Investments password attempts</SectionTitle>
      {error ? (
        <p className="text-sm text-error">Failed to load attempts.</p>
      ) : !data ? (
        <div className="h-24 rounded-xl bg-base-200 animate-pulse" />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="Failed attempts" value={data.attempts} />
            <StatCard label="~Unique visitors" value={data.visitors} sub="Approximate (daily hash)" />
            <StatCard label="From bots" value={data.bots} sub="Scripts and crawlers" />
            <div className="stat bg-base-200 rounded-xl border border-base-300">
              <div className="stat-title text-base-content/60 text-xs">Last attempt</div>
              <div className="stat-value text-base font-bold text-base-content">{data.lastAt ? when(data.lastAt) : "None"}</div>
            </div>
          </div>

          {data.attempts === 0 ? (
            <p className="text-xs text-base-content/60">No wrong passwords in this period.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="overflow-x-auto rounded-xl border border-base-300 bg-base-200 lg:col-span-2">
                <table className="table table-sm">
                  <thead>
                    <tr className="text-base-content/60">
                      <th>When</th><th>Guess</th><th>Where</th><th>Device</th><th>Visitor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent.map((r, i) => (
                      <tr key={i}>
                        <td className="whitespace-nowrap text-sm">{when(r.created_at)}</td>
                        <td className="max-w-[12rem] truncate font-mono text-sm" title={r.guess ?? undefined}>
                          {r.guess ?? (
                            <span className="text-base-content/60" title="Older than 30 days; only the length is kept">
                              {"•".repeat(Math.min(r.guess_length ?? 0, 12)) || "—"}
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap text-sm">{where(r)}</td>
                        <td className="whitespace-nowrap text-sm text-base-content/70">
                          {device(r)}
                          {r.is_bot ? <span className="badge badge-xs badge-warning ml-1.5">bot</span> : null}
                        </td>
                        <td className="font-mono text-xs text-base-content/60">{r.visitor_hash ? r.visitor_hash.slice(0, 8) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="px-4 pb-3 pt-1 text-xs text-base-content/60">
                  Latest {data.recent.length}{data.attempts > data.recent.length ? ` of ${data.attempts}` : ""}. Guesses are deleted after 30 days.
                </p>
              </div>

              <div className="rounded-xl border border-base-300 bg-base-200 p-4">
                <p className="mb-3 text-sm font-medium text-base-content">Tried more than once</p>
                {data.repeat.length === 0 ? (
                  <p className="text-xs text-base-content/60">Nobody tried twice in one day.</p>
                ) : (
                  <ul className="space-y-3">
                    {data.repeat.map((r) => (
                      <li key={r.visitor_hash + r.day} className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-mono text-xs text-base-content/70">{r.visitor_hash.slice(0, 8)}</p>
                          <p className="truncate text-xs text-base-content/60">{where(r)} · {device(r)}</p>
                          <p className="text-xs text-base-content/60">{when(r.first_at)} – {new Date(r.last_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</p>
                        </div>
                        <span className="badge badge-sm badge-error shrink-0">{r.attempts} tries</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// ── Visitors ─────────────────────────────────────────────────────────────

interface JourneyEvent { at: string; type: string; path: string | null; project: string | null }
interface VisitorRow {
  visitor_hash: string; first_at: string; last_at: string;
  views: number; pages: number; clicks: number;
  country: string | null; region: string | null;
  device_type: string | null; browser: string | null; os: string | null;
  referrer_host: string | null; journey: JourneyEvent[];
}

const PAGE_SIZE = 50;
const regionNames = (() => { try { return new Intl.DisplayNames(["en"], { type: "region" }); } catch { return null; } })();
const countryName = (c: string | null) => {
  if (!c) return null;
  if (/^[A-Z]{2}$/.test(c)) { try { return regionNames?.of(c) ?? c; } catch { return c; } }
  return c;
};
const placeOf = (v: VisitorRow) => [v.region, countryName(v.country)].filter(Boolean).join(", ") || "Unknown location";
const ago = (iso: string) => {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (m < 60 * 24) return `${Math.round(m / 60)}h ago`;
  return when(iso);
};
const timeOnly = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
const span = (a: string, b: string) => {
  const m = Math.round((Date.parse(b) - Date.parse(a)) / 60000);
  return m < 1 ? "under a minute" : m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`;
};
const EVENT_LABELS: Record<string, string> = {
  page_view: "Viewed",
  project_card_clicked: "Opened card",
  project_demo_clicked: "Clicked demo",
};
const eventLabel = (t: string) => EVENT_LABELS[t] ?? t.replace(/_/g, " ");

// One row per visitor, newest activity first; a row expands into the pages and
// clicks in order. Visitor IDs rotate with the hash salt (daily by default), so
// the same person on two days shows up as two rows.
function Visitors({ range, onLogout }: { range: string; onLogout: () => void }) {
  const [rows, setRows] = useState<VisitorRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const fetchPage = useCallback(async (offset: number) => {
    const r = await fetch(`/api/analytics/visitors?range=${range}&limit=${PAGE_SIZE}&offset=${offset}`, { headers: authHeaders() });
    if (r.status === 401) { onLogout(); return null; }
    if (!r.ok) throw new Error();
    return r.json() as Promise<{ total: number; visitors: VisitorRow[] }>;
  }, [range, onLogout]);

  useEffect(() => {
    let cancelled = false;
    setRows(null); setError(false); setOpen(null);
    fetchPage(0)
      .then((d) => { if (!cancelled && d) { setRows(d.visitors); setTotal(d.total); } })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [fetchPage]);

  const loadMore = async () => {
    if (!rows) return;
    setLoadingMore(true);
    try {
      const d = await fetchPage(rows.length);
      if (d) setRows([...rows, ...d.visitors]);
    } catch { setError(true); }
    setLoadingMore(false);
  };

  return (
    <section>
      <SectionTitle>Visitors</SectionTitle>
      {error ? (
        <p className="text-sm text-error">Failed to load visitors.</p>
      ) : !rows ? (
        <div className="h-40 rounded-xl bg-base-200 animate-pulse" />
      ) : rows.length === 0 ? (
        <p className="text-xs text-base-content/60">No visitors in this period.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-base-300 bg-base-200">
          <ul className="divide-y divide-base-300">
            {rows.map((v) => {
              const expanded = open === v.visitor_hash;
              return (
                <li key={v.visitor_hash}>
                  <button
                    type="button"
                    onClick={() => setOpen(expanded ? null : v.visitor_hash)}
                    aria-expanded={expanded}
                    className={`grid w-full grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-4 py-3 text-left transition hover:bg-base-300/40 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_7rem_6rem_1rem] ${expanded ? "bg-base-300/40" : ""}`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-base-content">{placeOf(v)}</span>
                      <span className="block truncate text-xs text-base-content/60">{device(v)}</span>
                    </span>
                    <span className="hidden min-w-0 truncate text-sm text-base-content/70 md:block">
                      {v.referrer_host ?? <span className="text-base-content/60">Direct</span>}
                    </span>
                    <span className="hidden text-right text-sm tabular-nums text-base-content/80 md:block">
                      {v.pages} {v.pages === 1 ? "page" : "pages"}
                      {v.clicks > 0 && <span className="block text-xs text-base-content/60">{v.clicks} {v.clicks === 1 ? "click" : "clicks"}</span>}
                    </span>
                    <span className="text-right text-xs text-base-content/60 whitespace-nowrap">
                      {ago(v.last_at)}
                      {/* On phones the source and activity fold under the time. */}
                      <span className="block md:hidden">{v.pages} {v.pages === 1 ? "page" : "pages"}</span>
                    </span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"
                      className={`hidden h-4 w-4 text-base-content/60 transition-transform md:block ${expanded ? "rotate-180" : ""}`}>
                      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>

                  {expanded && (
                    <div className="border-t border-base-300 bg-base-100/50 px-4 py-4">
                      <dl className="mb-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
                        <div><dt className="text-base-content/60">Source</dt><dd className="text-base-content">{v.referrer_host ?? "Direct"}</dd></div>
                        <div><dt className="text-base-content/60">Visit</dt><dd className="text-base-content">{when(v.first_at)} · {span(v.first_at, v.last_at)}</dd></div>
                        <div><dt className="text-base-content/60">Page views</dt><dd className="text-base-content tabular-nums">{v.views}</dd></div>
                        <div><dt className="text-base-content/60">Visitor ID</dt><dd className="font-mono text-base-content/70">{v.visitor_hash.slice(0, 8)}</dd></div>
                      </dl>
                      <ol className="space-y-1.5 border-l border-base-300 pl-4">
                        {v.journey.map((e, i) => (
                          <li key={i} className="relative flex items-baseline gap-3 text-xs">
                            <span className={`absolute -left-[1.29rem] top-1 h-2 w-2 rounded-full ${e.type === "page_view" ? "bg-base-content/40" : "bg-primary"}`} />
                            <span className="w-16 shrink-0 tabular-nums text-base-content/60">{timeOnly(e.at)}</span>
                            <span className={e.type === "page_view" ? "text-base-content/70" : "font-medium text-primary"}>{eventLabel(e.type)}</span>
                            <span className="min-w-0 truncate font-mono text-base-content/80">
                              {e.project ? (PROJECT_NAMES[e.project] ?? e.project) : (e.path || "/")}
                            </span>
                          </li>
                        ))}
                      </ol>
                      {v.journey.length < v.views + v.clicks && (
                        <p className="mt-2 text-xs text-base-content/60">First {v.journey.length} of {v.views + v.clicks} events.</p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="flex items-center justify-between gap-3 border-t border-base-300 px-4 py-2.5 text-xs text-base-content/60">
            <span>Showing {rows.length} of {total} · visitor IDs reset each day (or month), so a return visit is a new row</span>
            {rows.length < total && (
              <button type="button" className="btn btn-xs btn-ghost" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [range, setRange] = useState<typeof RANGES[number]>("30d");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ignored, setIgnored] = useState(isAnalyticsIgnored());
  const [ipMsg, setIpMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await fetch(`/api/analytics/private-summary?range=${range}`, {
        headers: authHeaders(),
      });
      if (r.status === 401) { onLogout(); return; }
      if (!r.ok) throw new Error("Server error");
      setSummary(await r.json());
    } catch {
      setError("Failed to load analytics.");
    } finally {
      setLoading(false);
    }
  }, [range, onLogout]);

  useEffect(() => { load(); }, [load]);

  function toggleIgnore() {
    if (ignored) { disableAnalyticsIgnore(); setIgnored(false); }
    else { enableAnalyticsIgnore(); setIgnored(true); }
  }

  async function excludeMyIp() {
    setIpMsg("Fetching IP…");
    try {
      const r = await fetch("https://api.ipify.org?format=json");
      if (!r.ok) throw new Error();
      const { ip } = await r.json();
      setIpMsg(`Your IP: ${ip} — add it to ANALYTICS_EXCLUDED_IPS in server/.env to exclude server-side.`);
    } catch {
      setIpMsg("Could not detect IP. Check ANALYTICS_EXCLUDED_IPS in server/.env manually.");
    }
  }

  const projects = summary ? groupProjects(summary.topProjects) : [];

  return (
    <div className="min-h-screen bg-base-100">
      {/* Header */}
      <div className="border-b border-base-300 bg-base-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <span className="font-bold text-base-content">Admin</span>
            <span className="mx-2 text-base-content/30">·</span>
            <span className="text-sm text-base-content/50">Analytics Dashboard</span>
          </div>
          <button
            className="btn btn-ghost btn-sm text-base-content/50"
            onClick={() => { clearToken(); onLogout(); }}
          >
            Sign out
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">
        {/* Range filter */}
        <div className="flex flex-wrap items-center gap-2">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`btn btn-sm ${range === r ? "btn-primary" : "btn-ghost text-base-content/60"}`}
            >
              {RANGE_LABELS[r]}
            </button>
          ))}
          <button
            className="btn btn-ghost btn-sm ml-auto text-base-content/40"
            onClick={load}
          >
            Refresh
          </button>
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-lg text-primary" />
          </div>
        )}

        {error && (
          <div className="alert alert-error text-sm">{error}</div>
        )}

        {summary && !loading && (
          <>
            {/* Overview */}
            <section>
              <SectionTitle>Overview</SectionTitle>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="Page Views" value={summary.overview.totalPageViews} />
                <StatCard label="~Unique Visitors" value={summary.overview.uniqueVisitors} sub="Approximate (daily hash)" />
                <StatCard label="Project Clicks" value={summary.overview.projectClicks} />
                <StatCard label="Conversion Clicks" value={summary.overview.conversionClicks} sub="Resume, email, LinkedIn" />
              </div>
            </section>

            {/* Top Pages */}
            <section>
              <SectionTitle>Top Pages</SectionTitle>
              <div className="bg-base-200 rounded-xl border border-base-300 overflow-hidden">
                <table className="table table-sm w-full">
                  <thead>
                    <tr className="text-base-content/50 text-xs">
                      <th>Path</th>
                      <th className="text-right">Views</th>
                      <th className="text-right">Unique</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.topPages.map((p, i) => (
                      <tr key={i} className="hover:bg-base-300/40">
                        <td className="font-mono text-xs text-base-content/80">{p.path || "/"}</td>
                        <td className="text-right text-sm">{p.views}</td>
                        <td className="text-right text-sm text-base-content/50">{p.unique_visitors}</td>
                      </tr>
                    ))}
                    {summary.topPages.length === 0 && (
                      <tr><td colSpan={3} className="text-center text-xs text-base-content/40 py-4">No data</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Top Projects */}
            {projects.length > 0 && (
              <section>
                <SectionTitle>Top Projects</SectionTitle>
                <div className="bg-base-200 rounded-xl border border-base-300 overflow-hidden">
                  <table className="table table-sm w-full">
                    <thead>
                      <tr className="text-base-content/50 text-xs">
                        <th>Project</th>
                        <th className="text-right">Page Views</th>
                        <th className="text-right">Card Clicks</th>
                        <th className="text-right">Demo Clicks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projects.map((p, i) => (
                        <tr key={i} className="hover:bg-base-300/40">
                          <td className="text-xs font-medium">
                            {PROJECT_NAMES[p.slug] || p.slug}
                          </td>
                          <td className="text-right text-sm">{p.counts.page_view ?? 0}</td>
                          <td className="text-right text-sm">{p.counts.project_card_clicked ?? 0}</td>
                          <td className="text-right text-sm">{p.counts.project_demo_clicked ?? 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Device / Browser / OS */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-base-200 rounded-xl border border-base-300 p-4">
                <SectionTitle>Devices</SectionTitle>
                <BreakdownTable rows={summary.deviceBreakdown} labelKey="device_type" label="Device" />
              </div>
              <div className="bg-base-200 rounded-xl border border-base-300 p-4">
                <SectionTitle>Browsers</SectionTitle>
                <BreakdownTable rows={summary.browserBreakdown} labelKey="browser" label="Browser" />
              </div>
              <div className="bg-base-200 rounded-xl border border-base-300 p-4">
                <SectionTitle>OS</SectionTitle>
                <BreakdownTable rows={summary.osBreakdown} labelKey="os" label="OS" />
              </div>
            </section>

            {/* Visitors, one row each (replaces the country/region breakdown) */}
            <Visitors range={range} onLogout={onLogout} />

            {/* Referrers */}
            {summary.referrerBreakdown.length > 0 && (
              <section>
                <SectionTitle>Referrers</SectionTitle>
                <div className="bg-base-200 rounded-xl border border-base-300 p-4">
                  <BreakdownTable rows={summary.referrerBreakdown} labelKey="referrer_host" label="Source" />
                </div>
              </section>
            )}
          </>
        )}

        <FinanceAttempts range={range} onLogout={onLogout} />

        {/* Self-exclusion controls */}
        <section className="bg-base-200 rounded-xl border border-base-300 p-5">
          <SectionTitle>Self-Exclusion</SectionTitle>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-base-content">Local browser exclusion</p>
                <p className="text-xs text-base-content/50 mt-0.5">
                  When enabled, this browser sends no analytics events.
                  Current status: <span className={ignored ? "text-warning font-medium" : "text-success font-medium"}>
                    {ignored ? "excluded" : "tracked"}
                  </span>
                </p>
              </div>
              <button
                className={`btn btn-sm ${ignored ? "btn-success" : "btn-warning"}`}
                onClick={toggleIgnore}
              >
                {ignored ? "Re-enable tracking" : "Exclude this browser"}
              </button>
            </div>

            <div className="divider my-1" />

            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-base-content">Server-side IP exclusion</p>
                <p className="text-xs text-base-content/50 mt-0.5">
                  Add your IP to <code className="text-xs bg-base-300 px-1 rounded">ANALYTICS_EXCLUDED_IPS</code> in{" "}
                  <code className="text-xs bg-base-300 px-1 rounded">server/.env</code> to exclude all
                  traffic from that IP across all browsers.
                </p>
                {ipMsg && (
                  <p className="text-xs text-info mt-2 bg-info/10 rounded p-2 break-all">{ipMsg}</p>
                )}
              </div>
              <button className="btn btn-sm btn-outline shrink-0" onClick={excludeMyIp}>
                Show my IP
              </button>
            </div>
          </div>
        </section>

        {summary && (
          <p className="text-xs text-center text-base-content/30">
            Showing data from {summary.dateRange.start} to {summary.dateRange.end}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Root Admin component ───────────────────────────────────────────────────

export function Admin() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    // Check whether the stored token is still valid
    verifySession().then((ok) => setAuthed(ok));
  }, []);

  if (authed === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base-100">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  if (!authed) {
    return <LoginForm onLogin={() => setAuthed(true)} />;
  }

  return <Dashboard onLogout={() => setAuthed(false)} />;
}
