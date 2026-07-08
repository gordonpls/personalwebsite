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

function groupProjects(rows: ProjectRow[]) {
  const map: Record<string, Record<string, number>> = {};
  for (const r of rows) {
    if (!map[r.project_slug]) map[r.project_slug] = {};
    map[r.project_slug][r.event_type] = r.count;
  }
  return Object.entries(map).map(([slug, events]) => ({ slug, ...events }));
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
        <div className="flex items-center gap-2">
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
                          <td className="text-right text-sm">{(p.page_view as number) || 0}</td>
                          <td className="text-right text-sm">{(p.project_card_clicked as number) || 0}</td>
                          <td className="text-right text-sm">{(p.project_demo_clicked as number) || 0}</td>
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

            {/* Location */}
            {summary.locationBreakdown.length > 0 && (
              <section>
                <SectionTitle>Locations</SectionTitle>
                <div className="bg-base-200 rounded-xl border border-base-300 overflow-hidden">
                  <table className="table table-sm w-full">
                    <thead>
                      <tr className="text-base-content/50 text-xs">
                        <th>Country</th>
                        <th>Region</th>
                        <th className="text-right">Views</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.locationBreakdown.map((r, i) => (
                        <tr key={i} className="hover:bg-base-300/40">
                          <td className="text-xs">{String(r.country || "Unknown")}</td>
                          <td className="text-xs text-base-content/50">{String(r.region || "—")}</td>
                          <td className="text-right text-sm">{r.count as number}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

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
