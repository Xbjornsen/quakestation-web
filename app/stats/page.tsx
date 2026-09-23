"use client";

import Link from "next/link";
import { useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Activity, Layers, Flame, Gauge, Mountain } from "lucide-react";
import { useGlobeStore } from "@/store/globeStore";
import { useQuakes } from "@/hooks/useQuakes";
import { useVolcanoes } from "@/hooks/useVolcanoes";
import { detectSwarms, type Swarm } from "@/lib/swarm";
import { magnitudeColor, rgbCss } from "@/lib/utils";
import { TIME_WINDOWS, type Quake } from "@/lib/usgs";
import type { Volcano } from "@/lib/features";

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
  // Bucket unit for `perDay`. A 1-day window bins by hour (a single daily bar
  // tells you nothing), long windows bin by week so the chart doesn't collapse
  // into hundreds of imperceptibly thin daily bars.
  trendUnit: TrendUnit;
  depth: { shallow: number; intermediate: number; deep: number };
  regions: Array<{ name: string; count: number; lat: number; lon: number }>;
}

type TrendUnit = "h" | "d" | "w";
const TREND_BUCKET_MS: Record<TrendUnit, number> = {
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
  w: 7 * 24 * 60 * 60 * 1000,
};
const TREND_UNIT_NAME: Record<TrendUnit, string> = { h: "hour", d: "day", w: "week" };

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
  // Centroid per region (for "fly there" links) — summed lat/lon, divided
  // once at the end.
  const regionCoords = new Map<string, { sumLat: number; sumLon: number }>();

  // Per-hour / per-day / per-week binning, anchored to now so the last
  // bucket is "now" regardless of clock skew between client and feed.
  const now = Date.now();
  const trendUnit: TrendUnit = days <= 1 ? "h" : days > 60 ? "w" : "d";
  const bucketMs = TREND_BUCKET_MS[trendUnit];
  // Whole buckets only: ceil() would add a leading week that's mostly outside
  // the window (365d = 52.1w) and draw a fake dip at the start of the chart.
  const buckets = Math.max(1, Math.floor((days * TREND_BUCKET_MS.d) / bucketMs));
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
    const coords = regionCoords.get(region);
    if (coords) {
      coords.sumLat += q.lat;
      coords.sumLon += q.lon;
    } else {
      regionCoords.set(region, { sumLat: q.lat, sumLon: q.lon });
    }

    const ageBuckets = Math.floor(Math.max(0, now - q.time) / bucketMs);
    const idx = buckets - 1 - ageBuckets;
    if (idx >= 0 && idx < buckets) perDayCounts[idx]++;
  }

  const regions = [...regionCounts.entries()]
    .map(([name, count]) => {
      const coords = regionCoords.get(name)!;
      return { name, count, lat: coords.sumLat / count, lon: coords.sumLon / count };
    })
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
    trendUnit,
    depth,
    regions,
  };
}

interface SwarmStats {
  total: number;
  totalEvents: number;
  largest: Swarm | null; // most events
  strongest: Swarm | null; // highest peak magnitude
  top: Array<{ name: string; count: number; lat: number; lon: number }>;
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
    .map((s) => ({
      name: swarmPlace(s),
      count: s.events.length,
      lat: s.centroidLat,
      lon: s.centroidLon,
    }));
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
  // The stats page's window is local, not the shared globe filter: charts
  // just aggregate counts, so a year of data is cheap here, but the same
  // window would hang the live 3D globe (thousands of per-event labels).
  // Seed from the globe's current window so the two start in sync, but
  // don't write back — picking "1y" here must never reach the globe.
  const [days, setDays] = useState(() => useGlobeStore.getState().days);
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
              {days === 365 ? (
                <span className="font-mono text-white/70">year</span>
              ) : (
                <>
                  <span className="font-mono text-white/70">{days}</span>{" "}
                  {days === 1 ? "day" : "days"}
                </>
              )}{" "}
              · magnitude <span className="font-mono text-white/70">{minMagnitude}+</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.25em] text-white/40">
              Window
            </span>
            <div className="flex gap-1.5">
              {TIME_WINDOWS.map((w) => (
                <button
                  key={w.days}
                  onClick={() => setDays(w.days)}
                  className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                    days === w.days
                      ? "border-accent-cyan/60 bg-accent-cyan/10 text-accent-cyan"
                      : "border-white/15 bg-white/5 text-white/65 hover:bg-white/10"
                  }`}
                >
                  {w.label}
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

              <Panel title={`Quakes per ${TREND_UNIT_NAME[stats.trendUnit]}`}>
                <TrendChart perDay={stats.perDay} unit={stats.trendUnit} />
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
            <section className="grid grid-cols-2 gap-3 lg:grid-cols-3 [&>*:last-child]:col-span-2 lg:[&>*:last-child]:col-span-1">
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
    <div className="flex h-44 items-stretch gap-2 pt-5 sm:gap-3">
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

const TREND_COLOR = "#5ce1ff"; // accent-cyan

// Tracks a element's rendered width so the trend chart can pick its own form
// factor (bars vs. line) from real available space rather than a guess.
function useContainerWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

// Below this many px per bucket, a bar reads as a hairline (and enough of
// them overflow the card on mobile) — a line/area reads a dense trend far
// better than packed bars, which is also the textbook form for "trend over
// time" regardless of density.
const MIN_BAR_PX = 16;

function bucketLabel(index: number, total: number, unit: TrendUnit): string {
  const ago = total - 1 - index;
  return ago === 0 ? "now" : `-${ago}${unit}`;
}

function TrendChart({
  perDay,
  unit,
}: {
  perDay: Array<{ day: number; count: number }>;
  unit: TrendUnit;
}) {
  const [containerRef, width] = useContainerWidth<HTMLDivElement>();
  const n = perDay.length;
  // Before the first real measurement (mount), guess from bucket count so
  // there's no flash of bars doomed to be replaced by a line a frame later.
  const useLine = width > 0 ? width / n < MIN_BAR_PX : n > 14;
  const max = Math.max(1, ...perDay.map((d) => d.count));
  // For wide windows labels get crowded; only label a few, based on how
  // many buckets actually render (not the raw day count).
  // Hourly buckets label every 6h (-18h, -12h, -6h, now) so the axis reads
  // as quarter-days rather than a wall of cramped numbers.
  const labelEvery = unit === "h" ? 6 : n > 40 ? 4 : n > 14 ? 2 : 1;
  // The line form is used precisely when space is tight, so also cap its
  // label count by the measured width (~56px per label).
  const maxLabels = Math.max(2, Math.floor((width || 300) / 56));
  const lineLabelEvery = Math.max(labelEvery, Math.ceil((n - 1) / (maxLabels - 1)));

  return (
    <div ref={containerRef} className="min-w-0">
      {useLine ? (
        <LineTrend perDay={perDay} max={max} unit={unit} labelEvery={lineLabelEvery} />
      ) : (
        <BarTrend perDay={perDay} max={max} unit={unit} labelEvery={labelEvery} />
      )}
    </div>
  );
}

function BarTrend({
  perDay,
  max,
  unit,
  labelEvery,
}: {
  perDay: Array<{ day: number; count: number }>;
  max: number;
  unit: TrendUnit;
  labelEvery: number;
}) {
  return (
    <div className="flex h-44 items-stretch gap-1">
      {perDay.map((d, i) => {
        const pct = (d.count / max) * 100;
        const showLabel = (perDay.length - 1 - i) % labelEvery === 0;
        return (
          <div key={d.day} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <div className="flex w-full flex-1 items-end">
              <div
                className="w-full rounded-t-sm bg-accent-cyan/70 transition-all hover:bg-accent-cyan"
                style={{ height: `${Math.max(pct, d.count > 0 ? 2 : 0)}%` }}
                title={`${d.count} quakes`}
              />
            </div>
            <span className="h-3 truncate font-mono text-[9px] text-white/40">
              {showLabel ? bucketLabel(i, perDay.length, unit) : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Line + area trend, used once bars would pack too tight to read. Straight
// (unsmoothed) segments so the line never overshoots a local min/max — an
// honest read of the same counts the bars would show. Hover (or the last
// touch position) snaps a crosshair to the nearest bucket; with nothing
// hovered it defaults to "now" so the headline number is visible at rest.
function LineTrend({
  perDay,
  max,
  unit,
  labelEvery,
}: {
  perDay: Array<{ day: number; count: number }>;
  max: number;
  unit: TrendUnit;
  labelEvery: number;
}) {
  const n = perDay.length;
  const W = 600;
  const H = 160;
  const PAD_TOP = 16;
  const PAD_BOTTOM = 2;
  const plotH = H - PAD_TOP - PAD_BOTTOM;

  const points = useMemo(
    () =>
      perDay.map((d, i) => ({
        x: n === 1 ? W / 2 : (i / (n - 1)) * W,
        y: PAD_TOP + plotH - (d.count / max) * plotH,
        count: d.count,
      })),
    [perDay, n, max, plotH],
  );
  const linePath = useMemo(
    () => points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" "),
    [points],
  );
  const areaPath = useMemo(() => {
    const base = H - PAD_BOTTOM;
    return `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${base} L ${points[0].x.toFixed(1)} ${base} Z`;
  }, [linePath, points]);

  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const gradientId = useId();
  const activeIndex = hoverIndex ?? n - 1;
  const active = points[activeIndex];

  const trackPointer = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * W;
    let nearest = 0;
    let bestDist = Infinity;
    points.forEach((p, i) => {
      const dist = Math.abs(p.x - relX);
      if (dist < bestDist) {
        bestDist = dist;
        nearest = i;
      }
    });
    setHoverIndex(nearest);
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="relative h-40 w-full">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="h-full w-full touch-none"
          onPointerMove={trackPointer}
          onPointerDown={trackPointer}
          onPointerLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={TREND_COLOR} stopOpacity={0.22} />
              <stop offset="100%" stopColor={TREND_COLOR} stopOpacity={0} />
            </linearGradient>
          </defs>
          <line
            x1={0}
            y1={H - PAD_BOTTOM}
            x2={W}
            y2={H - PAD_BOTTOM}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={1}
          />
          <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
          <path
            d={linePath}
            fill="none"
            stroke={TREND_COLOR}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <line
            x1={active.x}
            y1={PAD_TOP}
            x2={active.x}
            y2={H - PAD_BOTTOM}
            stroke="rgba(255,255,255,0.18)"
            strokeWidth={1}
          />
          <circle
            cx={active.x}
            cy={active.y}
            r={4}
            fill={TREND_COLOR}
            stroke="#0a0d18"
            strokeWidth={2}
          />
        </svg>
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-white/10 bg-ink-900/95 px-2 py-1 shadow-lg"
          style={{
            left: `${Math.min(92, Math.max(8, (active.x / W) * 100))}%`,
            top: `${(active.y / H) * 100}%`,
            marginTop: -10,
          }}
        >
          <div className="font-mono text-xs font-semibold text-white/90">{active.count}</div>
          <div className="text-[10px] text-white/45">
            {bucketLabel(activeIndex, n, unit) === "now" ? "Now" : bucketLabel(activeIndex, n, unit)}
          </div>
        </div>
      </div>
      {/* Labels sit at each point's x position (not in equal-width slots),
          so dense hourly/daily axes don't truncate to "-…" on narrow cards. */}
      <div className="relative h-3">
        {perDay.map((d, i) => {
          if ((n - 1 - i) % labelEvery !== 0) return null;
          const pct = n === 1 ? 50 : (i / (n - 1)) * 100;
          const shift = i === 0 ? "0%" : i === n - 1 ? "-100%" : "-50%";
          return (
            <span
              key={d.day}
              className="absolute top-0 whitespace-nowrap font-mono text-[9px] text-white/40"
              style={{ left: `${pct}%`, transform: `translateX(${shift})` }}
            >
              {bucketLabel(i, n, unit)}
            </span>
          );
        })}
      </div>
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

interface RegionRow {
  name: string;
  count: number;
  lat?: number;
  lon?: number;
}

function TopRegions({ regions }: { regions: RegionRow[] }) {
  if (regions.length === 0) {
    return <p className="text-sm text-white/40">No data.</p>;
  }
  const max = Math.max(1, ...regions.map((r) => r.count));
  return (
    <div className="flex flex-col gap-2.5">
      {regions.map((r, i) => {
        // Names aren't unique (two swarms can share a region), so key by
        // position too.
        const key = `${i}-${r.name}`;
        const bar = (
          <div className="relative h-5 flex-1 overflow-hidden rounded-md bg-white/5">
            <div
              className="h-full rounded-md bg-gradient-to-r from-accent-cyan/40 to-accent-cyan/80"
              style={{ width: `${(r.count / max) * 100}%` }}
            />
          </div>
        );
        const countLabel = (
          <span className="w-8 shrink-0 text-right font-mono text-sm text-white/70">
            {r.count}
          </span>
        );
        const nameLabel = (
          <span className="w-32 shrink-0 truncate text-sm text-white/75 sm:w-40" title={r.name}>
            {r.name}
          </span>
        );

        if (r.lat != null && r.lon != null) {
          return (
            <Link
              key={key}
              href={`/?lat=${r.lat.toFixed(2)}&lon=${r.lon.toFixed(2)}`}
              className="group flex items-center gap-3 rounded-md transition-colors hover:bg-white/5"
              title={`Fly to ${r.name} on the globe`}
            >
              {nameLabel}
              {bar}
              {countLabel}
            </Link>
          );
        }
        return (
          <div key={key} className="flex items-center gap-3">
            {nameLabel}
            {bar}
            {countLabel}
          </div>
        );
      })}
    </div>
  );
}
