"use client";

import { useEffect, useState } from "react";
import { useGlobeStore } from "@/store/globeStore";
import { useQuakes } from "@/hooks/useQuakes";

// Small status chip making the 60s auto-refresh visible: a pulsing dot plus
// how long ago the feed last updated. Re-reads the same React Query cache
// entry as the globe (deduped by key), so it costs nothing extra.
function ago(ts: number): string {
  if (!ts) return "just now";
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.round(m / 60)}h ago`;
}

export function LiveIndicator() {
  const minMagnitude = useGlobeStore((s) => s.minMagnitude);
  const days = useGlobeStore((s) => s.days);
  const { dataUpdatedAt, isFetching, isError } = useQuakes({ minMagnitude, days });

  // Tick every 10s so the relative label stays fresh between refetches.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 10_000);
    return () => clearInterval(id);
  }, []);

  const offline = isError;
  const dotColor = offline ? "bg-accent-rose" : "bg-emerald-400";
  const label = offline
    ? "Offline"
    : isFetching
      ? "Updating…"
      : `Live · ${ago(dataUpdatedAt)}`;

  return (
    <div className="flex items-center gap-1.5 text-[11px] text-white/45">
      <span className="relative flex h-1.5 w-1.5">
        {!offline && !isFetching ? (
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full ${dotColor} opacity-75`}
          />
        ) : null}
        <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${dotColor}`} />
      </span>
      <span className="uppercase tracking-[0.18em]">{label}</span>
    </div>
  );
}
