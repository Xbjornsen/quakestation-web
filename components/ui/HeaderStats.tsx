"use client";

import { useGlobeStore } from "@/store/globeStore";
import { useVolcanoes } from "@/hooks/useVolcanoes";

// Compact summary line under the wordmark: total quakes in the current
// window + how many cluster into swarms, plus a volcano count when that
// overlay is enabled.
export function HeaderStats() {
  const quakeCount = useGlobeStore((s) => s.quakes.length);
  const swarmCount = useGlobeStore((s) => s.swarmCount);
  const showVolcanoes = useGlobeStore((s) => s.showVolcanoes);
  const { data: volcanoes } = useVolcanoes(showVolcanoes);

  return (
    <div className="flex items-center gap-2 text-[11px] text-white/60">
      <span>
        <span className="font-mono text-white/85">{quakeCount.toLocaleString()}</span> quakes
      </span>
      {swarmCount > 0 ? (
        <>
          <span className="text-white/25">·</span>
          <span className="text-accent-amber">
            <span className="font-mono">{swarmCount}</span> swarms
          </span>
        </>
      ) : null}
      {showVolcanoes && volcanoes ? (
        <>
          <span className="text-white/25">·</span>
          <span className="text-[#ff8a3d]">
            <span className="font-mono">{volcanoes.length}</span> volcanoes
          </span>
        </>
      ) : null}
    </div>
  );
}
