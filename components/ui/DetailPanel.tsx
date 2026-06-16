"use client";

import { useGlobeStore } from "@/store/globeStore";
import { formatRelative, magnitudeColor } from "@/lib/utils";
import type { Quake } from "@/lib/usgs";
import { X, ExternalLink, ArrowDownWideNarrow, Clock, ChevronLeft } from "lucide-react";
import { useMemo, useState } from "react";

// One bottom-left surface handles both detail modes:
//   - a single selected quake  -> QuakeDetail
//   - a selected swarm         -> SwarmDetail (sortable event list)
// They are mutually exclusive in the store (focusQuake / focusSwarm
// each clear the other), so only one renders at a time.
export function DetailPanel() {
  const selected = useGlobeStore((s) => s.selected);
  const selectedSwarm = useGlobeStore((s) => s.selectedSwarm);

  if (!selected && !selectedSwarm) return null;

  return (
    <div className="pointer-events-auto fixed inset-x-3 bottom-3 z-20 mx-auto flex max-h-[72vh] max-w-md flex-col overflow-hidden rounded-2xl border border-white/10 bg-ink-900/95 shadow-2xl backdrop-blur-xl sm:inset-x-auto sm:bottom-6 sm:left-6 sm:max-w-sm">
      {selectedSwarm ? <SwarmDetail /> : selected ? <QuakeDetail quake={selected} /> : null}
    </div>
  );
}

function QuakeDetail({ quake }: { quake: Quake }) {
  const clear = useGlobeStore((s) => s.setSelected);
  const fromSwarm = useGlobeStore((s) => s.swarmReturn);
  const setSelectedSwarm = useGlobeStore((s) => s.setSelectedSwarm);

  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {fromSwarm ? (
            <button
              onClick={() => {
                clear(null);
                setSelectedSwarm(fromSwarm);
              }}
              className="mb-1 inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.2em] text-accent-cyan hover:underline"
            >
              <ChevronLeft className="h-3 w-3" /> Back to swarm
            </button>
          ) : (
            <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/50">
              Earthquake
            </div>
          )}
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-semibold">M{quake.mag.toFixed(1)}</span>
            <span className="text-xs text-white/60">{formatRelative(quake.time)}</span>
          </div>
          <div className="mt-1 truncate text-sm text-white/80">{quake.place}</div>
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
        <Stat label="Depth" value={`${quake.depth.toFixed(1)} km`} />
        <Stat label="Lat" value={quake.lat.toFixed(2)} />
        <Stat label="Lon" value={quake.lon.toFixed(2)} />
        <Stat label="Felt" value={quake.felt != null ? String(quake.felt) : "—"} />
        <Stat label="Significance" value={String(quake.sig)} />
        <Stat label="Tsunami" value={quake.tsunami ? "Yes" : "No"} />
      </div>

      <a
        href={quake.url}
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-flex items-center gap-1.5 text-xs text-accent-cyan hover:underline"
      >
        USGS event page <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}

type SortKey = "magnitude" | "time";

function SwarmDetail() {
  const swarm = useGlobeStore((s) => s.selectedSwarm)!;
  const close = useGlobeStore((s) => s.setSelectedSwarm);
  const drillInto = useGlobeStore((s) => s.drillIntoQuake);
  const [sort, setSort] = useState<SortKey>("magnitude");

  const sortedEvents = useMemo(() => {
    const arr = [...swarm.events];
    if (sort === "magnitude") arr.sort((a, b) => b.mag - a.mag);
    else arr.sort((a, b) => b.time - a.time);
    return arr;
  }, [swarm, sort]);

  const spanHours = Math.max(1, Math.round((swarm.endTime - swarm.startTime) / 3_600_000));
  const spanLabel = spanHours >= 48 ? `${Math.round(spanHours / 24)}d` : `${spanHours}h`;
  const place = swarm.events.reduce((m, q) => (q.mag > m.mag ? q : m), swarm.events[0]).place;

  return (
    <>
      <div className="flex items-start justify-between gap-3 border-b border-white/10 p-4">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-accent-amber/80">
            Earthquake Swarm
          </div>
          <h2 className="mt-1 truncate text-base font-semibold">{place}</h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/60">
            <span>
              <span className="font-mono text-white/85">{swarm.events.length}</span> events
            </span>
            <span>
              peak <span className="font-mono text-white/85">M{swarm.maxMag.toFixed(1)}</span>
            </span>
            <span>
              over <span className="font-mono text-white/85">{spanLabel}</span>
            </span>
          </div>
        </div>
        <button
          onClick={() => close(null)}
          aria-label="Close"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full hover:bg-white/10"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-center gap-2 px-4 py-2.5">
        <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">Sort</span>
        <SortButton
          active={sort === "magnitude"}
          onClick={() => setSort("magnitude")}
          icon={<ArrowDownWideNarrow className="h-3.5 w-3.5" />}
          label="Magnitude"
        />
        <SortButton
          active={sort === "time"}
          onClick={() => setSort("time")}
          icon={<Clock className="h-3.5 w-3.5" />}
          label="Recent"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {sortedEvents.map((q) => (
          <EventRow key={q.id} quake={q} onClick={() => drillInto(q, swarm)} />
        ))}
      </div>
    </>
  );
}

function SortButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-colors ${
        active
          ? "border-accent-cyan/60 bg-accent-cyan/10 text-accent-cyan"
          : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function EventRow({ quake, onClick }: { quake: Quake; onClick: () => void }) {
  const [r, g, b] = magnitudeColor(quake.mag);
  const color = `rgb(${r * 255}, ${g * 255}, ${b * 255})`;
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white/5"
    >
      <span
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full font-mono text-xs font-semibold text-black"
        style={{ background: color }}
      >
        {quake.mag.toFixed(1)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-white/85">{quake.place}</span>
        <span className="block text-[11px] text-white/50">
          {quake.depth.toFixed(0)} km deep · {formatRelative(quake.time)}
        </span>
      </span>
    </button>
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
