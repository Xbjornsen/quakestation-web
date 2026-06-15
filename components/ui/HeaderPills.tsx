"use client";

import { useGlobeStore } from "@/store/globeStore";
import { formatRelative } from "@/lib/utils";
import { useMemo } from "react";
import type { Quake } from "@/lib/usgs";

export function HeaderPills() {
  const quakes = useGlobeStore((s) => s.quakes);
  const focusQuake = useGlobeStore((s) => s.focusQuake);

  const { latest, biggest } = useMemo(() => {
    if (quakes.length === 0) return { latest: null, biggest: null };
    let latest = quakes[0];
    let biggest = quakes[0];
    for (const q of quakes) {
      if (q.time > latest.time) latest = q;
      if (q.mag > biggest.mag) biggest = q;
    }
    return { latest, biggest };
  }, [quakes]);

  if (!latest || !biggest) {
    return (
      <div className="flex flex-wrap gap-2">
        <Pill label="LATEST" value="…" sub="loading" quake={null} onClick={() => {}} />
        <Pill label="BIGGEST" value="…" sub="loading" quake={null} onClick={() => {}} />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Pill
        label="LATEST"
        value={`M${latest.mag.toFixed(1)}`}
        sub={formatRelative(latest.time)}
        quake={latest}
        onClick={() => focusQuake(latest)}
      />
      <Pill
        label="BIGGEST"
        value={`M${biggest.mag.toFixed(1)}`}
        sub={biggest.place.split(" of ").at(-1) ?? biggest.place}
        accent
        quake={biggest}
        onClick={() => focusQuake(biggest)}
      />
    </div>
  );
}

function Pill({
  label,
  value,
  sub,
  accent,
  quake,
  onClick,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
  quake: Quake | null;
  onClick: () => void;
}) {
  return (
    <div className="group relative">
      <button
        onClick={onClick}
        disabled={!quake}
        className={`rounded-full border px-3 py-1.5 backdrop-blur-md transition-colors disabled:cursor-default ${
          accent
            ? "border-accent-amber/40 bg-accent-amber/10 hover:bg-accent-amber/20"
            : "border-white/15 bg-white/5 hover:bg-white/10"
        }`}
      >
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">
            {label}
          </span>
          <span className="font-mono text-sm font-semibold">{value}</span>
          <span className="max-w-[14ch] truncate text-[11px] text-white/60">{sub}</span>
        </div>
      </button>
      {quake ? <PillTooltip quake={quake} /> : null}
    </div>
  );
}

function PillTooltip({ quake }: { quake: Quake }) {
  return (
    <div
      className="pointer-events-none absolute left-0 top-full z-30 mt-2 w-72 origin-top-left scale-95 rounded-xl border border-white/10 bg-ink-900/95 p-3.5 opacity-0 shadow-2xl backdrop-blur-xl transition-all duration-150 group-hover:pointer-events-auto group-hover:scale-100 group-hover:opacity-100"
      role="tooltip"
    >
      <div className="flex items-baseline justify-between gap-2">
        <div className="font-mono text-xl font-semibold">M{quake.mag.toFixed(1)}</div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">
          {formatRelative(quake.time)}
        </div>
      </div>
      <div className="mt-0.5 text-sm text-white/85">{quake.place}</div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <Stat label="Depth" value={`${quake.depth.toFixed(1)} km`} />
        <Stat label="Lat" value={quake.lat.toFixed(2)} />
        <Stat label="Lon" value={quake.lon.toFixed(2)} />
        <Stat label="Felt" value={quake.felt != null ? String(quake.felt) : "—"} />
        <Stat label="Sig" value={String(quake.sig)} />
        <Stat label="Tsunami" value={quake.tsunami ? "Yes" : "No"} />
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2.5">
        <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">
          Click to fly here
        </span>
        <a
          href={quake.url}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-[11px] text-accent-cyan hover:underline"
        >
          USGS event ↗
        </a>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">{label}</div>
      <div className="mt-0.5 font-mono text-[13px] text-white/85">{value}</div>
    </div>
  );
}
