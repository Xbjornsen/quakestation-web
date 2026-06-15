"use client";

import { useGlobeStore } from "@/store/globeStore";
import { formatRelative } from "@/lib/utils";
import { X, ExternalLink } from "lucide-react";

export function DetailPanel() {
  const selected = useGlobeStore((s) => s.selected);
  const clear = useGlobeStore((s) => s.setSelected);

  if (!selected) return null;

  return (
    <div className="pointer-events-auto fixed inset-x-3 bottom-3 z-20 mx-auto max-w-md rounded-2xl border border-white/10 bg-ink-900/95 p-4 shadow-2xl backdrop-blur-xl sm:inset-x-auto sm:bottom-6 sm:left-6 sm:max-w-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/50">
            Earthquake
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-semibold">M{selected.mag.toFixed(1)}</span>
            <span className="text-xs text-white/60">{formatRelative(selected.time)}</span>
          </div>
          <div className="mt-1 truncate text-sm text-white/80">{selected.place}</div>
        </div>
        <button
          onClick={() => clear(null)}
          aria-label="Close"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full hover:bg-white/10"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
        <Stat label="Depth" value={`${selected.depth.toFixed(1)} km`} />
        <Stat label="Lat" value={selected.lat.toFixed(2)} />
        <Stat label="Lon" value={selected.lon.toFixed(2)} />
        <Stat
          label="Felt"
          value={selected.felt != null ? String(selected.felt) : "—"}
        />
        <Stat label="Significance" value={String(selected.sig)} />
        <Stat label="Tsunami" value={selected.tsunami ? "Yes" : "No"} />
      </div>

      <a
        href={selected.url}
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-flex items-center gap-1.5 text-xs text-accent-cyan hover:underline"
      >
        USGS event page <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">{label}</div>
      <div className="mt-0.5 font-mono text-sm text-white/85">{value}</div>
    </div>
  );
}
