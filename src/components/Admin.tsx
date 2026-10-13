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

// ── Password attempts ───────────────────────────────────────────────────

type Gate = "blog" | "investments";
const GATES: { id: Gate; label: string }[] = [
  { id: "blog", label: "Blog" },
  { id: "investments", label: "Investments" },
];

interface AttemptRow {
  created_at: string; ip: string | null; visitor_hash: string | null; guess: string | null; guess_length: number | null; is_bot: number;
  device_type: string | null; browser: string | null; os: string | null; country: string | null; region: string | null;
}
interface RepeatRow {
  visitor_hash: string; day: string; attempts: number; first_at: string; last_at: string; ip: string | null;
  country: string | null; region: string | null; device_type: string | null; browser: string | null; os: string | null;
}
interface Attempts { attempts: number; visitors: number; bots: number; lastAt: string | null; recent: AttemptRow[]; repeat: RepeatRow[] }

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const regionNames = (() => { try { return new Intl.DisplayNames(["en"], { type: "region" }); } catch { return null; } })();
const countryName = (c: string | null) => {
  if (!c) return null;
  if (/^[A-Z]{2}$/.test(c)) { try { return regionNames?.of(c) ?? c; } catch { return c; } }
  return c;
};
const where = (r: { country: string | null; region: string | null }) =>
  [r.region, countryName(r.country)].filter(Boolean).join(", ") || "Unknown";
const device = (r: { device_type: string | null; browser: string | null; os: string | null }) =>
  [r.device_type, r.browser, r.os].filter(Boolean).join(" · ") || "Unknown";

// Wrong passwords at the blog and /investments gates: the guess as typed, the
// IP (to block a persistent guesser at the host or CDN), where, and on what
// device. Guesses and IPs are blanked after 30 days. Visitor IDs rotate daily,
// so "repeat" means repeated within one day.
function PasswordAttempts({ range, onLogout }: { range: string; onLogout: () => void }) {
  const [gate, setGate] = useState<Gate>("blog");
  const [data, setData] = useState<Attempts | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setData(null); setError(false);
    fetch(`/api/admin/finance-attempts?range=${range}&gate=${gate}`, { headers: authHeaders() })
      .then((r) => {
        if (r.status === 401) { onLogout(); return null; }
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) => { if (!cancelled && d) setData(d); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [range, gate, onLogout]);

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-base-content/60">Password attempts</h2>
        <div role="tablist" className="join">
          {GATES.map((g) => (
            <button key={g.id} type="button" role="tab" aria-selected={gate === g.id} onClick={() => setGate(g.id)}
              className={`btn btn-xs join-item ${gate === g.id ? "btn-primary" : "btn-ghost text-base-content/70"}`}>
              {g.label}
            </button>
          ))}
        </div>
      </div>
      {error ? (
        <p className="text-sm text-error">Failed to load attempts.</p>
      ) : !data ? (
        <div className="h-24 rounded-xl bg-base-200 animate-pulse" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-base-300 bg-base-200">
          <p className="flex flex-wrap gap-x-4 gap-y-1 border-b border-base-300 px-4 py-2.5 text-xs text-base-content/70">
            <span><b className="text-base-content tabular-nums">{data.attempts}</b> failed</span>
            <span><b className="text-base-content tabular-nums">{data.visitors}</b> ~visitors</span>
            <span><b className="text-base-content tabular-nums">{data.bots}</b> from bots</span>
            <span>last {data.lastAt ? when(data.lastAt) : "never"}</span>
          </p>
          {data.attempts === 0 ? (
            <p className="px-4 py-3 text-xs text-base-content/60">No wrong passwords in this period.</p>
          ) : (
            <>
              {data.repeat.length > 0 && (
                <div className="flex flex-wrap gap-2 border-b border-base-300 px-4 py-2.5 text-xs">
                  <span className="text-base-content/70">Tried more than once:</span>
                  {data.repeat.map((r) => (
                    <span key={r.visitor_hash + r.day} className="badge badge-sm badge-error badge-outline gap-1" title={`${where(r)} · ${device(r)} · ${when(r.first_at)}–${when(r.last_at)}`}>
                      <span className="font-mono">{r.ip ?? r.visitor_hash.slice(0, 8)}</span> × {r.attempts}
                    </span>
                  ))}
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="table table-xs">
                  <thead>
                    <tr className="text-base-content/60">
                      <th>When</th><th>Guess</th><th>IP</th><th>Where</th><th>Device</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent.map((r, i) => (
                      <tr key={i} className="hover:bg-base-300/40">
                        <td className="whitespace-nowrap">{when(r.created_at)}</td>
                        <td className="max-w-[12rem] truncate font-mono" title={r.guess ?? undefined}>
                          {r.guess ?? (
                            <span className="text-base-content/60" title="Older than 30 days; only the length is kept">
                              {"•".repeat(Math.min(r.guess_length ?? 0, 12)) || "—"}
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap font-mono text-base-content/80">{r.ip ?? <span className="text-base-content/60">—</span>}</td>
                        <td className="whitespace-nowrap">{where(r)}</td>
                        <td className="whitespace-nowrap text-base-content/70">
                          {device(r)}
                          {r.is_bot ? <span className="badge badge-xs badge-warning ml-1.5">bot</span> : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="border-t border-base-300 px-4 py-2 text-xs text-base-content/60">
                Latest {data.recent.length}{data.attempts > data.recent.length ? ` of ${data.attempts}` : ""}. Guesses and IPs are deleted after 30 days.
              </p>
            </>
          )}
        </div>
      )}
    </section>
  );
}

// ── Visitors ─────────────────────────────────────────────────────────────

interface TrailPage { path: string; views: number; seconds: number | null }
interface VisitorRow {
  visitor_hash: string; first_at: string; last_at: string;
  views: number; pages: number; clicks: number;
  country: string | null; region: string | null;
  device_type: string | null; browser: string | null; os: string | null;
  referrer_host: string | null; trail: TrailPage[];
}

const PAGE_SIZE = 50;
const ago = (iso: string) => {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (m < 60 * 24) return `${Math.round(m / 60)}h ago`;
  return when(iso);
};
const dur = (s: number) => (s < 60 ? `${Math.round(s)}s` : s < 3600 ? `${Math.round(s / 60)}m` : `${Math.floor(s / 3600)}h ${Math.round((s % 3600) / 60)}m`);
const visitLength = (a: string, b: string) => {
  const s = (Date.parse(b) - Date.parse(a)) / 1000;
  return s < 5 ? "—" : dur(s);
};
const trailText = (t: TrailPage[]) =>
  t.map((p) => `${p.path}${p.views > 1 ? ` ×${p.views}` : ""}${p.seconds != null ? ` (${dur(p.seconds)})` : ""}`).join(" → ");

// One compact row per visitor, newest activity first: where they're from, how
// they arrived, what they used, and the pages they read with time on each
// (time until their next action, so the last page's time is unknown). Visitor
// IDs rotate with the hash salt (daily by default): a return visit is a new row.
function Visitors({ range, onLogout }: { range: string; onLogout: () => void }) {
  const [rows, setRows] = useState<VisitorRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchPage = useCallback(async (offset: number) => {
    const r = await fetch(`/api/analytics/visitors?range=${range}&limit=${PAGE_SIZE}&offset=${offset}`, { headers: authHeaders() });
    if (r.status === 401) { onLogout(); return null; }
    if (!r.ok) throw new Error();
    return r.json() as Promise<{ total: number; visitors: VisitorRow[] }>;
  }, [range, onLogout]);

  useEffect(() => {
    let cancelled = false;
    setRows(null); setError(false);
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
          <div className="max-h-[28rem] overflow-auto">
            <table className="table table-xs table-pin-rows">
              <thead>
                <tr className="text-base-content/60">
                  <th>Seen</th><th>From</th><th>Source</th><th>Device</th><th>Pages (time on each)</th><th className="text-right">Visit</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((v) => {
                  const text = trailText(v.trail);
                  return (
                    <tr key={v.visitor_hash} className="hover:bg-base-300/40">
                      <td className="whitespace-nowrap text-base-content/70" title={`${when(v.first_at)} – ${when(v.last_at)}`}>{ago(v.last_at)}</td>
                      <td className="max-w-[10rem] truncate" title={where(v)}>{where(v)}</td>
                      <td className="max-w-[8rem] truncate text-base-content/70">{v.referrer_host ?? "Direct"}</td>
                      <td className="whitespace-nowrap text-base-content/70">{device(v)}</td>
                      <td className="max-w-[22rem] truncate font-mono text-base-content/80" title={text}>
                        {v.trail.length ? v.trail.map((p, i) => (
                          <span key={p.path}>
                            {i > 0 && <span className="text-base-content/60"> → </span>}
                            {p.path}
                            {p.views > 1 && <span className="text-base-content/60"> ×{p.views}</span>}
                            {p.seconds != null && <span className="text-base-content/60"> {dur(p.seconds)}</span>}
                          </span>
                        )) : <span className="text-base-content/60">—</span>}
                        {v.clicks > 0 && <span className="badge badge-xs badge-primary badge-outline ml-1.5">{v.clicks} {v.clicks === 1 ? "click" : "clicks"}</span>}
                      </td>
                      <td className="whitespace-nowrap text-right tabular-nums text-base-content/70">{visitLength(v.first_at, v.last_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-base-300 px-4 py-2 text-xs text-base-content/60">
            <span>Showing {rows.length} of {total} · hover a row for full details · IDs reset daily, so a return visit is a new row</span>
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

        <PasswordAttempts range={range} onLogout={onLogout} />

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
