"use client";

import { useGlobeStore } from "@/store/globeStore";
import { useIsMobile } from "@/hooks/useIsMobile";
import { depthColor, rgbCss } from "@/lib/utils";

const MAG_STOPS: Array<{ label: string; color: string }> = [
  { label: "M2", color: "rgb(92,236,255)" },
  { label: "M3", color: "rgb(140,235,148)" },
  { label: "M4", color: "rgb(255,237,107)" },
  { label: "M5", color: "rgb(255,181,71)" },
  { label: "M6", color: "rgb(255,115,64)" },
  { label: "M7+", color: "rgb(255,64,89)" },
];

// Mirrors depthColor()'s bands so the key matches the markers when
// Settings → Marker colour is set to Depth.
const DEPTH_STOPS: Array<{ label: string; color: string }> = [
  { label: "<70", color: rgbCss(depthColor(0)) },
  { label: "70–300", color: rgbCss(depthColor(100)) },
  { label: "300+", color: rgbCss(depthColor(400)) },
];

export function Legend() {
  const colorMode = useGlobeStore((s) => s.colorMode);
  const replayActive = useGlobeStore((s) => s.replayTime != null);
  const isMobile = useIsMobile();
  const panelOpen = useGlobeStore(
    (s) => !!(s.selected || s.selectedSwarm || s.selectedFeature),
  );

  // On phones the detail panel fills the bottom — don't stack the legend under it.
  if (isMobile && panelOpen) return null;

  const byDepth = colorMode === "depth";
  const stops = byDepth ? DEPTH_STOPS : MAG_STOPS;

  // The replay control is centred along the bottom edge; below lg there isn't
  // room beside it, so lift the legend clear of the pill (or the taller
  // scrubber bar while a replay is running).
  const lift = replayActive ? "mb-28 lg:mb-6" : "mb-20 lg:mb-6";

  return (
    <div
      className={`pointer-events-auto mx-4 self-end rounded-xl border border-white/10 bg-ink-900/80 px-3 py-2 text-xs backdrop-blur-md sm:mx-6 ${lift}`}
    >
      <div className="mb-1.5 text-[10px] uppercase tracking-[0.25em] text-white/50">
        {byDepth ? "Depth · km" : "Magnitude"}
      </div>
      <div className={`flex items-center ${byDepth ? "gap-2.5" : "gap-1"}`}>
        {stops.map((s) => (
          <div key={s.label} className="flex flex-col items-center">
            <span className="h-3 w-3 rounded-full" style={{ background: s.color }} />
            <span className="mt-1 font-mono text-[9px] text-white/60">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
