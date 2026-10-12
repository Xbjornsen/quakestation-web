"use client";

import { RefreshCw, RotateCcw, SearchX, WifiOff } from "lucide-react";
import { useGlobeStore, filtersChanged } from "@/store/globeStore";
import { useQuakes } from "@/hooks/useQuakes";
import { GLOBE_MAX_DAYS, TIME_WINDOWS } from "@/lib/usgs";

function windowLabel(days: number): string {
  if (days === 1) return "24 hours";
  const preset = TIME_WINDOWS.find((w) => w.days === days);
  return preset ? `${preset.days} days` : `${days} days`;
}

// Explains an empty globe instead of leaving the user staring at a planet
// with no markers: the feed is unreachable, the window genuinely has no
// events at this magnitude floor, or the saved depth band filters everything
// out. Each case offers the one action that fixes it.
export function GlobeStatus() {
  const minMagnitude = useGlobeStore((s) => s.minMagnitude);
  // Same clamp as GlobeScene so this shares its React Query cache entry.
  const days = Math.min(useGlobeStore((s) => s.days), GLOBE_MAX_DAYS);
  const depthMin = useGlobeStore((s) => s.depthMin);
  const depthMax = useGlobeStore((s) => s.depthMax);
  const replaying = useGlobeStore((s) => s.replayTime != null);
  const resetFilters = useGlobeStore((s) => s.resetFilters);
  const canReset = filtersChanged({ minMagnitude, days, depthMin, depthMax });

  const { data, isError, isFetching, refetch } = useQuakes({ minMagnitude, days });

  if (replaying) return null;

  let card: { icon: React.ReactNode; title: string; body: string; action?: React.ReactNode } | null =
    null;

  if (isError && !data) {
    card = {
      icon: <WifiOff className="h-5 w-5 text-accent-rose" />,
      title: "Can\u2019t reach the earthquake feed",
      body: "USGS didn\u2019t respond. We\u2019ll keep retrying every minute.",
      action: (
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium text-white/85 transition-colors hover:bg-white/10 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          {isFetching ? "Retrying\u2026" : "Retry now"}
        </button>
      ),
    };
  } else if (data) {
    const total = data.quakes.length;
    const visible = data.quakes.filter((q) => q.depth >= depthMin && q.depth <= depthMax).length;
    const resetButton = canReset ? (
      <button
        onClick={resetFilters}
        className="inline-flex items-center gap-2 rounded-full border border-accent-cyan/40 bg-accent-cyan/10 px-4 py-2 text-xs font-medium text-accent-cyan transition-colors hover:bg-accent-cyan/20"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Reset filters
      </button>
    ) : undefined;

    if (total === 0) {
      card = {
        icon: <SearchX className="h-5 w-5 text-white/60" />,
        title: `No M${minMagnitude.toFixed(1)}+ quakes in the last ${windowLabel(days)}`,
        body: canReset
          ? "Lower the magnitude floor or widen the time window to see more."
          : "A quiet spell \u2014 the globe will update as new events come in.",
        action: resetButton,
      };
    } else if (visible === 0) {
      card = {
        icon: <SearchX className="h-5 w-5 text-white/60" />,
        title: "No quakes match your depth band",
        body: `All ${total.toLocaleString()} events are outside ${depthMin}\u2013${depthMax} km.`,
        action: resetButton,
      };
    }
  }

  if (!card) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center p-6">
      <div
        role="status"
        className="pointer-events-auto flex max-w-xs flex-col items-center gap-3 rounded-2xl border border-white/10 bg-ink-900/85 px-6 py-5 text-center shadow-2xl backdrop-blur-xl"
      >
        {card.icon}
        <div>
          <div className="text-sm font-semibold text-white/90">{card.title}</div>
          <p className="mt-1 text-xs leading-relaxed text-white/60">{card.body}</p>
        </div>
        {card.action}
      </div>
    </div>
  );
}
