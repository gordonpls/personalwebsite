import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { SectionHeading } from "./SectionHeading";

// ── Types ──────────────────────────────────────────────────────────────────

interface PublicSummary {
  totalPageViews: number;
  approximateUniqueVisitors: number;
  topPages: { path: string; views: number }[];
  topProjects: {
    slug: string;
    events: Record<string, number>;
  }[];
  deviceBreakdown: { device_type: string; count: number }[];
  browserBreakdown: { browser: string; count: number }[];
  osBreakdown: { os: string; count: number }[];
  dateRange: { start: string; end: string };
  range: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const RANGE_LABELS: Record<string, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  all: "All time",
};

const PROJECT_NAMES: Record<string, string> = {
  "investing-dashboard": "Investing Dashboard",
  "allocation-quiz": "Allocation Quiz",
  "stablecoin-dashboard": "Stablecoin Dashboard",
  "fortune-cookie": "Fortune Cookie",
};

const PAGE_LABELS: Record<string, string> = {
  "/": "Home",
  "/investments": "Investing Dashboard",
  "/allocation": "Allocation Quiz",
  "/stablecoin": "Stablecoin Dashboard",
  "/fortune": "Fortune Cookie",
  "/analytics": "Analytics",
};

function pageLabel(path: string): string {
  return PAGE_LABELS[path] ?? path;
}

const DEVICE_COLORS: Record<string, string> = {
  desktop: "#378ADD",
  mobile: "#1D9E75",
  tablet: "#E8A020",
};
const BROWSER_COLORS = ["#378ADD", "#1D9E75", "#E8A020", "#7F77DD", "#D85A30", "#E0607E"];

// ── Animated counter ───────────────────────────────────────────────────────

function useCountUp(target: number, duration = 1000) {
  const [val, setVal] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === 0) { setVal(0); return; }
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      // ease-out cubic
      setVal(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);

  return val;
}

// ── Stat card ──────────────────────────────────────────────────────────────

function BigStat({
  label,
  value,
  prefix = "",
  suffix = "",
  note,
  delay = 0,
}: {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  note?: string;
  delay?: number;
}) {
  const count = useCountUp(value, 900 + delay * 100);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: delay * 0.08 }}
      className="bg-base-200 rounded-2xl border border-base-300 p-6 flex flex-col gap-1"
    >
      <span className="text-xs text-base-content/50 uppercase tracking-wider">{label}</span>
      <span className="text-4xl font-extrabold text-base-content tabular-nums">
        {prefix}{count.toLocaleString()}{suffix}
      </span>
      {note && <span className="text-xs text-base-content/40 mt-1">{note}</span>}
    </motion.div>
  );
}

// ── Top pages list ─────────────────────────────────────────────────────────

function TopPagesList({ pages }: { pages: PublicSummary["topPages"] }) {
  const max = pages[0]?.views || 1;
  return (
    <div className="space-y-3">
      {pages.slice(0, 7).map((p, i) => (
        <motion.div
          key={p.path}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.06 }}
          className="flex items-center gap-3"
        >
          <span className="w-4 text-xs text-base-content/30 font-mono text-right shrink-0">{i + 1}</span>
          <span className="w-36 text-xs text-base-content/70 truncate shrink-0">{pageLabel(p.path)}</span>
          <div className="flex-1 bg-base-300 rounded-full h-1.5 overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${(p.views / max) * 100}%` }}
              transition={{ delay: i * 0.06 + 0.2, duration: 0.5 }}
            />
          </div>
          <span className="text-xs text-base-content/50 w-10 text-right shrink-0">{p.views}</span>
        </motion.div>
      ))}
    </div>
  );
}

// ── Top projects ───────────────────────────────────────────────────────────

function TopProjectsList({ projects }: { projects: PublicSummary["topProjects"] }) {
  if (!projects.length) return <p className="text-xs text-base-content/40">No project data yet.</p>;
  return (
    <div className="space-y-3">
      {projects.slice(0, 5).map((p, i) => {
        const totalClicks = (p.events.project_card_clicked || 0) + (p.events.project_demo_clicked || 0);
        const views = p.events.page_view || 0;
        return (
          <motion.div
            key={p.slug}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            className="flex items-center justify-between gap-3 py-2 border-b border-base-300 last:border-0"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xs text-base-content/30 font-mono w-4 shrink-0">{i + 1}</span>
              <span className="text-sm font-medium text-base-content truncate">
                {PROJECT_NAMES[p.slug] || p.slug}
              </span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {views > 0 && (
                <span className="text-xs text-base-content/50">{views} views</span>
              )}
              {totalClicks > 0 && (
                <span className="badge badge-sm badge-ghost text-xs">{totalClicks} clicks</span>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ── Device donut chart ─────────────────────────────────────────────────────

function DeviceDonut({ data }: { data: PublicSummary["deviceBreakdown"] }) {
  const total = data.reduce((s, d) => s + d.count, 0) || 1;
  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="device_type"
            cx="50%"
            cy="50%"
            innerRadius={46}
            outerRadius={70}
            strokeWidth={2}
            stroke="transparent"
          >
            {data.map((d, i) => (
              <Cell key={i} fill={DEVICE_COLORS[d.device_type] ?? BROWSER_COLORS[i % BROWSER_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: "var(--fallback-b2,oklch(var(--b2)))", border: "1px solid var(--fallback-b3,oklch(var(--b3)))", borderRadius: 8, fontSize: 12 }}
            formatter={(value: number, name: string) => [`${value} (${Math.round(value / total * 100)}%)`, name]}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-3 justify-center">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: DEVICE_COLORS[d.device_type] ?? BROWSER_COLORS[i % BROWSER_COLORS.length] }}
            />
            <span className="text-xs text-base-content/70 capitalize">{d.device_type}</span>
            <span className="text-xs text-base-content/40">{Math.round(d.count / total * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Browser / OS bar chart ─────────────────────────────────────────────────

function HorizBar({ data, labelKey, colorFn }: {
  data: Record<string, string | number>[];
  labelKey: string;
  colorFn: (i: number) => string;
}) {
  const max = Math.max(...data.map((d) => d.count as number), 1);
  return (
    <div className="space-y-2">
      {data.slice(0, 6).map((d, i) => {
        const pct = Math.round((d.count as number / max) * 100);
        return (
          <div key={i} className="flex items-center gap-3">
            <span className="w-20 text-xs text-base-content/70 truncate shrink-0">{String(d[labelKey] || "Other")}</span>
            <div className="flex-1 bg-base-300 rounded-full h-1.5 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: colorFn(i) }}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ delay: i * 0.06 + 0.1, duration: 0.4 }}
              />
            </div>
            <span className="text-xs text-base-content/40 w-8 text-right shrink-0">{d.count as number}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <div className="text-5xl opacity-30">📊</div>
      <h2 className="text-xl font-semibold text-base-content/50">No data yet</h2>
      <p className="text-sm text-base-content/40 max-w-xs">
        Analytics will appear here once visitors start exploring the portfolio.
      </p>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export function AnalyticsPage() {
  const [range, setRange] = useState<"7d" | "30d" | "all">("30d");
  const [data, setData] = useState<PublicSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    fetch(`/api/analytics/public-summary?range=${range}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: PublicSummary) => setData(d))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [range]);

  const isEmpty = !loading && !error && data && data.totalPageViews === 0;

  return (
    <div className="container mx-auto w-full pt-4 overflow-x-hidden pt-18 bg-base-100 rounded-md">
      <Navbar />
      <div className="mockup-window border bg-base-300 !border-neutral dark:border-white rounded-md !overflow-visible">
        <div className="border-t !border-neutral dark:border-white px-4 pt-4 pb-8 rounded-md space-y-6">

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <SectionHeading eyebrow="Analytics" title="Website Analytics" />
          {/* Range selector */}
          <div className="flex items-center gap-1.5 shrink-0">
            {(["7d", "30d", "all"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`btn btn-sm ${range === r ? "btn-primary" : "btn-ghost text-base-content/50"}`}
              >
                {r === "7d" ? "7d" : r === "30d" ? "30d" : "All"}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="flex justify-center py-20">
            <span className="loading loading-spinner loading-lg text-primary" />
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <span className="text-4xl opacity-40">⚠️</span>
            <p className="text-sm text-base-content/50">Couldn't load analytics right now.</p>
          </div>
        )}

        {isEmpty && <EmptyState />}

        {data && !loading && !error && !isEmpty && (
          <>
            {/* Big stats row */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <BigStat label="Page Views" value={data.totalPageViews} delay={0} />
              <BigStat
                label="~Unique Visitors"
                value={data.approximateUniqueVisitors}
                note="Daily-hashed approximation"
                delay={1}
              />
              <BigStat
                label="Top Device"
                value={data.deviceBreakdown[0]?.count ?? 0}
                note={data.deviceBreakdown[0]
                  ? `${data.deviceBreakdown[0].device_type} · ${Math.round(
                      (data.deviceBreakdown[0].count / (data.deviceBreakdown.reduce((s, d) => s + d.count, 0) || 1)) * 100
                    )}%`
                  : undefined}
                delay={2}
              />
              <BigStat
                label="Top Browser"
                value={data.browserBreakdown[0]?.count ?? 0}
                note={data.browserBreakdown[0]?.browser ?? undefined}
                delay={3}
              />
            </section>

            {/* Top pages + device donut */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-base-200 rounded-2xl border border-base-300 p-6"
              >
                <h2 className="text-sm font-semibold text-base-content/50 uppercase tracking-wider mb-4">
                  Top Pages
                </h2>
                {data.topPages.length ? (
                  <TopPagesList pages={data.topPages} />
                ) : (
                  <p className="text-xs text-base-content/40">No page data yet.</p>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-base-200 rounded-2xl border border-base-300 p-6"
              >
                <h2 className="text-sm font-semibold text-base-content/50 uppercase tracking-wider mb-4">
                  Devices
                </h2>
                {data.deviceBreakdown.length ? (
                  <DeviceDonut data={data.deviceBreakdown} />
                ) : (
                  <p className="text-xs text-base-content/40">No device data yet.</p>
                )}
              </motion.div>
            </section>

            {/* Top projects + browser breakdown */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="bg-base-200 rounded-2xl border border-base-300 p-6"
              >
                <h2 className="text-sm font-semibold text-base-content/50 uppercase tracking-wider mb-4">
                  Top Projects
                </h2>
                <TopProjectsList projects={data.topProjects} />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-base-200 rounded-2xl border border-base-300 p-6"
              >
                <h2 className="text-sm font-semibold text-base-content/50 uppercase tracking-wider mb-4">
                  Browsers
                </h2>
                {data.browserBreakdown.length ? (
                  <HorizBar
                    data={data.browserBreakdown as Record<string, string | number>[]}
                    labelKey="browser"
                    colorFn={(i) => BROWSER_COLORS[i % BROWSER_COLORS.length]}
                  />
                ) : (
                  <p className="text-xs text-base-content/40">No browser data yet.</p>
                )}
              </motion.div>
            </section>

            {/* OS breakdown */}
            {data.osBreakdown.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="bg-base-200 rounded-2xl border border-base-300 p-6"
              >
                <h2 className="text-sm font-semibold text-base-content/50 uppercase tracking-wider mb-4">
                  Operating Systems
                </h2>
                <div className="max-w-sm">
                  <HorizBar
                    data={data.osBreakdown as Record<string, string | number>[]}
                    labelKey="os"
                    colorFn={(i) => BROWSER_COLORS[i % BROWSER_COLORS.length]}
                  />
                </div>
              </motion.section>
            )}

            {/* Privacy note */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex items-start gap-3 bg-base-200/60 border border-base-300 rounded-xl p-5"
            >
              <span className="text-base mt-0.5 shrink-0 opacity-60">🔒</span>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-base-content/60">Privacy-conscious analytics</p>
                <p className="text-xs text-base-content/40 leading-relaxed">
                  No cookies or fingerprinting. Visitor counts are approximated by a daily-rotated
                  server-side hash — the same person visiting tomorrow counts separately, by design.
                  No personal data, referrer URLs, IP addresses, or exact timestamps are shown here.
                  Data is cached and updated every few minutes.
                </p>
              </div>
            </motion.div>

            {data.dateRange && (
              <p className="text-xs text-center text-base-content/30">
                {RANGE_LABELS[range]} · {data.dateRange.start} → {data.dateRange.end}
              </p>
            )}
          </>
        )}

        </div>
      </div>
      <Footer />
    </div>
  );
}
