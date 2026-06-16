"use client";

import { useGlobeStore } from "@/store/globeStore";

// Compact summary line under the wordmark: total quakes in the current
// window + how many of them cluster into swarms (matches the native
// app's "1719 quakes · 173 swarms").
export function HeaderStats() {
  const quakeCount = useGlobeStore((s) => s.quakes.length);
  const swarmCount = useGlobeStore((s) => s.swarmCount);

  return (
    <div className="flex items-center gap-2 text-[11px] text-white/45">
      <span>
        <span className="font-mono text-white/70">{quakeCount.toLocaleString()}</span> quakes
      </span>
      {swarmCount > 0 ? (
        <>
          <span className="text-white/25">·</span>
          <span className="text-accent-amber/80">
            <span className="font-mono">{swarmCount}</span> swarms
          </span>
        </>
      ) : null}
    </div>
  );
}
