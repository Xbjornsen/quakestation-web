"use client";

import { useGlobeStore } from "@/store/globeStore";
import { formatRelative } from "@/lib/utils";
import { useMemo } from "react";

export function HeaderPills() {
  const quakes = useGlobeStore((s) => s.quakes);
  const setSelected = useGlobeStore((s) => s.setSelected);

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
        <Pill label="LATEST" value="…" sub="loading" />
        <Pill label="BIGGEST" value="…" sub="loading" />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button onClick={() => setSelected(latest)} className="text-left">
        <Pill label="LATEST" value={`M${latest.mag.toFixed(1)}`} sub={formatRelative(latest.time)} />
      </button>
      <button onClick={() => setSelected(biggest)} className="text-left">
        <Pill
          label="BIGGEST"
          value={`M${biggest.mag.toFixed(1)}`}
          sub={biggest.place.split(" of ").at(-1) ?? biggest.place}
          accent
        />
      </button>
    </div>
  );
}

function Pill({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-full border px-3 py-1.5 backdrop-blur-md transition-colors ${
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
    </div>
  );
}
