"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowLeft, Activity, Layers, Flame, Gauge, Mountain } from "lucide-react";
import { useGlobeStore } from "@/store/globeStore";
import { useQuakes } from "@/hooks/useQuakes";
import { useVolcanoes } from "@/hooks/useVolcanoes";
import { detectSwarms, type Swarm } from "@/lib/swarm";
import { magnitudeColor } from "@/lib/utils";
import type { Quake } from "@/lib/usgs";
import type { Volcano } from "@/lib/features";

function rgbCss([r, g, b]: [number, number, number], alpha = 1): string {
  const to = (v: number) => Math.round(v * 255);
  return `rgba(${to(r)}, ${to(g)}, ${to(b)}, ${alpha})`;
}

const MAG_BUCKETS: Array<{ label: string; min: number; max: number; mid: number }> = [
  { label: "2–3", min: 2, max: 3, mid: 2.5 },
  { label: "3–4", min: 3, max: 4, mid: 3.5 },
  { label: "4–5", min: 4, max: 5, mid: 4.5 },
  { label: "5–6", min: 5, max: 6, mid: 5.5 },
  { label: "6–7", min: 6, max: 7, mid: 6.5 },
  { label: "7+", min: 7, max: Infinity, mid: 7.5 },
];

interface Stats {
  total: number;
  swarms: number;
  biggest: Quake | null;
  m5plus: number;
  magHistogram: number[];
  perDay: Array<{ day: number; count: number }>;
  depth: { shallow: number; intermediate: number; deep: number };
  regions: Array<{ name: string; count: number }>;
}

function regionOf(place: string): string {
  const idx = place.toLowerCase().lastIndexOf(" of ");
  if (idx === -1) return place.trim();
  return place.slice(idx + 4).trim();
}

function computeStats(quakes: Quake[], days: number): Stats {
  const magHistogram = MAG_BUCKETS.map(() => 0);
  let biggest: Quake | null = null;
  let m5plus = 0;
  const depth = { shallow: 0, intermediate: 0, deep: 0 };
  const regionCounts = new Map<string, number>();

  // Per-day binning, anchored to the most recent event so the last bucket
  // is "today" regardless of clock skew between client and feed.
  const dayMs = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const buckets = Math.max(1, Math.round(days));
  const perDayCounts = new Array<number>(buckets).fill(0);

  for (const q of quakes) {
    for (let i = 0; i < MAG_BUCKETS.length; i++) {
      const b = MAG_BUCKETS[i];
      if (q.mag >= b.min && q.mag < b.max) {
        magHistogram[i]++;
        break;
      }
    }
    if (!biggest || q.mag > biggest.mag) biggest = q;
    if (q.mag >= 5) m5plus++;

    if (q.depth < 70) depth.shallow++;
    else if (q.depth < 300) depth.intermediate++;
    else depth.deep++;

    const region = regionOf(q.place);
    regionCounts.set(region, (regionCounts.get(region) ?? 0) + 1);

    const ageDays = Math.floor((now - q.time) / dayMs);
    const idx = buckets - 1 - ageDays;
    if (idx >= 0 && idx < buckets) perDayCounts[idx]++;
  }

  const regions = [...regionCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const { swarms } = detectSwarms(quakes);

  return {
    total: quakes.length,
    swarms: swarms.length,
    biggest,
    m5plus,
    magHistogram,
    perDay: perDayCounts.map((count, day) => ({ day, count })),
    depth,
    regions,
  };
}

interface SwarmStats {
  total: number;
  totalEvents: number;
  largest: Swarm | null; // most events
  strongest: Swarm | null; // highest peak magnitude
  top: Array<{ name: string; count: number }>;
}

function swarmPlace(s: Swarm): string {
  const biggest = s.events.reduce((m, q) => (q.mag > m.mag ? q : m), s.events[0]);
  return regionOf(biggest.place);
}

function computeSwarmStats(swarms: Swarm[]): SwarmStats {
  let largest: Swarm | null = null;
  let strongest: Swarm | null = null;
  let totalEvents = 0;
  for (const s of swarms) {
    totalEvents += s.events.length;
    if (!largest || s.events.length > largest.events.length) largest = s;
    if (!strongest || s.maxMag > strongest.maxMag) strongest = s;
  }
  const top = [...swarms]
    .sort((a, b) => b.events.length - a.events.length)
    .slice(0, 6)
    .map((s) => ({ name: swarmPlace(s), count: s.events.length }));
  return { total: swarms.length, totalEvents, largest, strongest, top };
}

interface VolcanoStats {
  total: number;
  highest: Volcano | null;
  types: Array<{ name: string; count: number }>;
  countries: Array<{ name: string; count: number }>;
}

function computeVolcanoStats(volcanoes: Volcano[]): VolcanoStats {
  const byType = new Map<string, number>();
  const byCountry = new Map<string, number>();
  let highest: Volcano | null = null;
  for (const v of volcanoes) {
    byType.set(v.type, (byType.get(v.type) ?? 0) + 1);
    byCountry.set(v.country, (byCountry.get(v.country) ?? 0) + 1);
    if (!highest || v.elevation_m > highest.elevation_m) highest = v;
  }
  const top = (m: Map<string, number>, n: number) =>
    [...m.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, n);
  return { total: volcanoes.length, highest, types: top(byType, 8), countries: top(byCountry, 8) };
}

export default function StatsPage() {
  const minMagnitude = useGlobeStore((s) => s.minMagnitude);
  const days = useGlobeStore((s) => s.days);
  const setDays = useGlobeStore((s) => s.setDays);
  const { data, isLoading, isError } = useQuakes({ minMagnitude, days });
  const { data: volcanoData } = useVolcanoes(true);

  const quakes = useMemo(() => data?.quakes ?? [], [data]);
  const stats = useMemo(() => computeStats(quakes, days), [quakes, days]);
  const swarms = useMemo(() => detectSwarms(quakes).swarms, [quakes]);
  const swarmStats = useMemo(() => computeSwarmStats(swarms), [swarms]);
  const volcanoes = useMemo(() => volcanoData ?? [], [volcanoData]);
  const vStats = useMemo(() => computeVolcanoStats(volcanoes), [volcanoes]);

  return (
    <main className="min-h-dvh w-full bg-ink-950 text-white">
      <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-2">
            <Link
              href="/"
              className="inline-flex w-fit items-center gap-1.5 text-[11px] uppercase tracking-[0.25em] text-white/45 transition-colors hover:text-accent-cyan"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to globe
            </Link>
            <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              Seismic Statistics
            </h1>
            <p className="text-sm text-white/45">
              Over the last{" "}
              <span className="font-mono text-white/70">{days}</span>{" "}
              {days === 1 ? "day" : "days"} · magnitude{" "}
              <span className="font-mono text-white/70">{minMagnitude}+</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.25em] text-white/40">
              Window
            </span>
            <div className="flex gap-1.5">
              {[1, 7, 30].map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                    days === d
                      ? "border-accent-cyan/60 bg-accent-cyan/10 text-accent-cyan"
                      : "border-white/15 bg-white/5 text-white/65 hover:bg-white/10"
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>
        </header>

        {isError ? (
          <Panel>
            <p className="text-sm text-accent-rose">
              Failed to load earthquake data. Try again shortly.
            </p>
          </Panel>
        ) : isLoading ? (
          <div className="grid place-items-center py-24 text-white/50">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
              <span className="text-xs uppercase tracking-[0.3em]">Loading stats</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Headline
                icon={<Activity className="h-4 w-4" />}
                label="Total quakes"
                value={stats.total.toLocaleString()}
              />
              <Headline
                icon={<Layers className="h-4 w-4" />}
                label="Swarms"
                value={stats.swarms.toLocaleString()}
                accent="amber"
              />
              <Headline
                icon={<Gauge className="h-4 w-4" />}
                label="Biggest"
                value={stats.biggest ? `M${stats.biggest.mag.toFixed(1)}` : "—"}
                sub={
                  stats.biggest
                    ? regionOf(stats.biggest.place)
                    : undefined
                }
                accent="rose"
              />
              <Headline
                icon={<Flame className="h-4 w-4" />}
                label="M5+ events"
                value={stats.m5plus.toLocaleString()}
              />
            </section>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <Panel title="Magnitude distribution">
                <MagHistogram histogram={stats.magHistogram} />
              </Panel>

              <Panel title="Quakes per day">
                <PerDayChart perDay={stats.perDay} days={days} />
              </Panel>

              <Panel title="Depth distribution">
                <DepthChart depth={stats.depth} total={stats.total} />
              </Panel>

              <Panel title="Top regions">
                <TopRegions regions={stats.regions} />
              </Panel>
            </div>
          </div>
        )}

        {swarmStats.total > 0 ? (
          <div className="mt-8 flex flex-col gap-5">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.25em] text-accent-amber/70">
              Swarms
            </h2>
            <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Headline
                icon={<Layers className="h-4 w-4" />}
                label="Swarms"
                value={swarmStats.total.toLocaleString()}
                accent="amber"
              />
              <Headline
                icon={<Activity className="h-4 w-4" />}
                label="Events in swarms"
                value={swarmStats.totalEvents.toLocaleString()}
              />
              <Headline
                icon={<Gauge className="h-4 w-4" />}
                label="Most active"
                value={swarmStats.largest ? `${swarmStats.largest.events.length}` : "—"}
                sub={swarmStats.largest ? swarmPlace(swarmStats.largest) : undefined}
              />
              <Headline
                icon={<Flame className="h-4 w-4" />}
                label="Strongest"
                value={swarmStats.strongest ? `M${swarmStats.strongest.maxMag.toFixed(1)}` : "—"}
                sub={swarmStats.strongest ? swarmPlace(swarmStats.strongest) : undefined}
                accent="rose"
              />
            </section>
            <Panel title="Most active swarms">
              <TopRegions regions={swarmStats.top} />
            </Panel>
          </div>
        ) : null}

        {volcanoes.length > 0 ? (
          <div className="mt-8 flex flex-col gap-5">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#ff8a3d]">
              Volcanoes
            </h2>
            <section className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              <Headline
                icon={<Flame className="h-4 w-4" />}
                label="Holocene volcanoes"
                value={vStats.total.toLocaleString()}
                accent="amber"
              />
              <Headline
                icon={<Mountain className="h-4 w-4" />}
                label="Highest"
                value={
                  vStats.highest ? `${vStats.highest.elevation_m.toLocaleString()} m` : "—"
                }
                sub={vStats.highest?.name}
              />
              <Headline
                icon={<Layers className="h-4 w-4" />}
                label="Types"
                value={vStats.types.length.toLocaleString()}
              />
            </section>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <Panel title="By type">
                <TopRegions regions={vStats.types} />
              </Panel>
              <Panel title="Top countries">
                <TopRegions regions={vStats.countries} />
              </Panel>
            </div>
          </div>
        ) : null}

        <footer className="mt-10 border-t border-white/10 pt-5 text-[11px] leading-relaxed text-white/40">
          Earthquake data from the free, public{" "}
          <a
            href="https://earthquake.usgs.gov/fdsnws/event/1/"
            target="_blank"
            rel="noreferrer"
            className="text-white/60 underline decoration-white/20 underline-offset-2 transition-colors hover:text-accent-cyan"
          >
            USGS Earthquake API
          </a>
          . Updated live; no account required. Volcano data: Smithsonian Global Volcanism Program.
        </footer>
      </div>
    </main>
  );
}

function Panel({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-ink-900/60 p-5 backdrop-blur-md">
      {title ? (
        <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.25em] text-white/45">
          {title}
        </h2>
      ) : null}
      {children}
    </div>
  );
}

function Headline({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent?: "amber" | "rose";
}) {
  const accentColor =
    accent === "amber"
      ? "text-accent-amber"
      : accent === "rose"
        ? "text-accent-rose"
        : "text-accent-cyan";
  return (
    <div className="rounded-2xl border border-white/10 bg-ink-900/60 p-4 backdrop-blur-md">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-white/45">
        <span className={accentColor}>{icon}</span>
        {label}
      </div>
      <div className="mt-2 font-mono text-2xl font-semibold tracking-tight sm:text-3xl">
        {value}
      </div>
      {sub ? (
        <div className="mt-0.5 truncate text-xs text-white/45">{sub}</div>
      ) : null}
    </div>
  );
}

function MagHistogram({ histogram }: { histogram: number[] }) {
  const max = Math.max(1, ...histogram);
  return (
    <div className="flex h-44 items-stretch gap-2 sm:gap-3">
      {MAG_BUCKETS.map((b, i) => {
        const count = histogram[i];
        const pct = (count / max) * 100;
        const color = rgbCss(magnitudeColor(b.mid));
        return (
          <div key={b.label} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex w-full flex-1 items-end">
              <div
                className="group relative w-full rounded-t-md transition-all"
                style={{
                  height: `${Math.max(pct, count > 0 ? 3 : 0)}%`,
                  background: `linear-gradient(to top, ${rgbCss(
                    magnitudeColor(b.mid),
                    0.35,
                  )}, ${color})`,
                }}
              >
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 font-mono text-[11px] text-white/70">
                  {count}
                </span>
              </div>
            </div>
            <span className="font-mono text-[10px] text-white/45">M{b.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function PerDayChart({
  perDay,
  days,
}: {
  perDay: Array<{ day: number; count: number }>;
  days: number;
}) {
  const max = Math.max(1, ...perDay.map((d) => d.count));
  // For wide windows (30d) labels get crowded; only label a few.
  const labelEvery = days > 14 ? 5 : days > 7 ? 2 : 1;
  return (
    <div className="flex h-44 items-stretch gap-1">
      {perDay.map((d) => {
        const pct = (d.count / max) * 100;
        const ago = perDay.length - 1 - d.day;
        const showLabel = ago % labelEvery === 0;
        const label = ago === 0 ? "now" : `-${ago}d`;
        return (
          <div key={d.day} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex w-full flex-1 items-end">
              <div
                className="w-full rounded-t-sm bg-accent-cyan/70 transition-all hover:bg-accent-cyan"
                style={{ height: `${Math.max(pct, d.count > 0 ? 2 : 0)}%` }}
                title={`${d.count} quakes`}
              />
            </div>
            <span className="h-3 font-mono text-[9px] text-white/40">
              {showLabel ? label : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function DepthChart({
  depth,
  total,
}: {
  depth: { shallow: number; intermediate: number; deep: number };
  total: number;
}) {
  const rows: Array<{ label: string; sub: string; count: number; color: string }> = [
    {
      label: "Shallow",
      sub: "< 70 km",
      count: depth.shallow,
      color: "rgb(255,89,89)",
    },
    {
      label: "Intermediate",
      sub: "70–300 km",
      count: depth.intermediate,
      color: "rgb(255,199,82)",
    },
    {
      label: "Deep",
      sub: "> 300 km",
      count: depth.deep,
      color: "rgb(92,199,255)",
    },
  ];
  const safeTotal = Math.max(1, total);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-white/5">
        {rows.map((r) =>
          r.count > 0 ? (
            <div
              key={r.label}
              style={{
                width: `${(r.count / safeTotal) * 100}%`,
                background: r.color,
              }}
            />
          ) : null,
        )}
      </div>
      <div className="flex flex-col gap-2.5">
        {rows.map((r) => {
          const pct = (r.count / safeTotal) * 100;
          return (
            <div key={r.label} className="flex items-center gap-3">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: r.color }}
              />
              <div className="flex flex-1 items-baseline justify-between gap-2">
                <span className="text-sm text-white/80">
                  {r.label}{" "}
                  <span className="text-xs text-white/35">{r.sub}</span>
                </span>
                <span className="font-mono text-sm text-white/70">
                  {r.count.toLocaleString()}
                  <span className="ml-1.5 text-xs text-white/35">
                    {pct.toFixed(0)}%
                  </span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TopRegions({ regions }: { regions: Array<{ name: string; count: number }> }) {
  if (regions.length === 0) {
    return <p className="text-sm text-white/40">No data.</p>;
  }
  const max = Math.max(1, ...regions.map((r) => r.count));
  return (
    <div className="flex flex-col gap-2.5">
      {regions.map((r) => (
        <div key={r.name} className="flex items-center gap-3">
          <span className="w-32 shrink-0 truncate text-sm text-white/75 sm:w-40" title={r.name}>
            {r.name}
          </span>
          <div className="relative h-5 flex-1 overflow-hidden rounded-md bg-white/5">
            <div
              className="h-full rounded-md bg-gradient-to-r from-accent-cyan/40 to-accent-cyan/80"
              style={{ width: `${(r.count / max) * 100}%` }}
            />
          </div>
          <span className="w-8 shrink-0 text-right font-mono text-sm text-white/70">
            {r.count}
          </span>
        </div>
      ))}
    </div>
  );
}
