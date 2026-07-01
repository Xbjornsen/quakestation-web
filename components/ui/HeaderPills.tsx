"use client";

import { useGlobeStore } from "@/store/globeStore";
import { formatRelative, magnitudeColor, rgbCss } from "@/lib/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Quake } from "@/lib/usgs";

const LIST_SIZE = 10;

type OpenPill = "latest" | "biggest" | null;

export function HeaderPills() {
  const quakes = useGlobeStore((s) => s.quakes);
  const focusQuake = useGlobeStore((s) => s.focusQuake);
  const [open, setOpen] = useState<OpenPill>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click/tap or Escape.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const { latest, biggest, latestList, biggestList } = useMemo(() => {
    if (quakes.length === 0) {
      return { latest: null, biggest: null, latestList: [] as Quake[], biggestList: [] as Quake[] };
    }
    const byTime = [...quakes].sort((a, b) => b.time - a.time);
    const byMag = [...quakes].sort((a, b) => b.mag - a.mag);
    return {
      latest: byTime[0],
      biggest: byMag[0],
      latestList: byTime.slice(0, LIST_SIZE),
      biggestList: byMag.slice(0, LIST_SIZE),
    };
  }, [quakes]);

  const select = (q: Quake) => {
    focusQuake(q);
    setOpen(null);
  };

  if (!latest || !biggest) {
    return (
      <div className="flex flex-wrap gap-2">
        <Pill label="LATEST" value="…" sub="loading" />
        <Pill label="BIGGEST" value="…" sub="loading" />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex flex-wrap gap-2">
      <Pill
        label="LATEST"
        value={`M${latest.mag.toFixed(1)}`}
        sub={formatRelative(latest.time)}
        isOpen={open === "latest"}
        onClick={() => setOpen(open === "latest" ? null : "latest")}
      >
        <PillDropdown title="Last 10 events" items={latestList} onSelect={select} />
      </Pill>
      <Pill
        label="BIGGEST"
        value={`M${biggest.mag.toFixed(1)}`}
        sub={biggest.place.split(" of ").at(-1) ?? biggest.place}
        accent
        isOpen={open === "biggest"}
        onClick={() => setOpen(open === "biggest" ? null : "biggest")}
      >
        <PillDropdown title="Top 10 by magnitude" items={biggestList} onSelect={select} />
      </Pill>
    </div>
  );
}

function Pill({
  label,
  value,
  sub,
  accent,
  isOpen,
  onClick,
  children,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
  isOpen?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="relative">
      <button
        onClick={onClick}
        disabled={!onClick}
        aria-expanded={isOpen}
        className={`rounded-full border px-3 py-1.5 backdrop-blur-md transition-colors disabled:cursor-default ${
          accent
            ? "border-accent-amber/40 bg-accent-amber/10 hover:bg-accent-amber/20"
            : "border-white/15 bg-white/5 hover:bg-white/10"
        } ${isOpen ? "ring-1 ring-white/30" : ""}`}
      >
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">
            {label}
          </span>
          <span className="font-mono text-sm font-semibold">{value}</span>
          <span className="max-w-[14ch] truncate text-[11px] text-white/60">{sub}</span>
        </div>
      </button>
      {isOpen ? children : null}
    </div>
  );
}

function PillDropdown({
  title,
  items,
  onSelect,
}: {
  title: string;
  items: Quake[];
  onSelect: (q: Quake) => void;
}) {
  return (
    <div
      role="listbox"
      className="absolute left-0 top-full z-30 mt-2 max-h-80 w-72 overflow-y-auto rounded-xl border border-white/10 bg-ink-900/95 p-2 shadow-2xl backdrop-blur-xl"
    >
      <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
        {title}
      </div>
      {items.length === 0 ? (
        <p className="px-2 py-2 text-sm text-white/40">No events.</p>
      ) : (
        items.map((q) => (
          <button
            key={q.id}
            role="option"
            aria-selected={false}
            onClick={() => onSelect(q)}
            className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/10"
          >
            <span
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full font-mono text-[11px] font-semibold text-black"
              style={{ background: rgbCss(magnitudeColor(q.mag)) }}
            >
              {q.mag.toFixed(1)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-white/85">{q.place}</span>
              <span className="block text-[11px] text-white/50">{formatRelative(q.time)}</span>
            </span>
          </button>
        ))
      )}
    </div>
  );
}
