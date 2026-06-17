"use client";

import { useGlobeStore } from "@/store/globeStore";
import { useIsMobile } from "@/hooks/useIsMobile";

const MAG_STOPS: Array<{ label: string; color: string }> = [
  { label: "M2", color: "rgb(92,236,255)" },
  { label: "M3", color: "rgb(140,235,148)" },
  { label: "M4", color: "rgb(255,237,107)" },
  { label: "M5", color: "rgb(255,181,71)" },
  { label: "M6", color: "rgb(255,115,64)" },
  { label: "M7+", color: "rgb(255,64,89)" },
];

export function Legend() {
  const count = useGlobeStore((s) => s.quakes.length);
  const isMobile = useIsMobile();
  const panelOpen = useGlobeStore(
    (s) => !!(s.selected || s.selectedSwarm || s.selectedFeature),
  );

  // On phones the detail panel fills the bottom — don't stack the legend under it.
  if (isMobile && panelOpen) return null;

  return (
    <div className="pointer-events-auto m-4 self-end rounded-xl border border-white/10 bg-ink-900/80 px-3 py-2 text-xs backdrop-blur-md sm:m-6">
      <div className="mb-1.5 text-[10px] uppercase tracking-[0.25em] text-white/50">
        {count} events
      </div>
      <div className="flex items-center gap-1">
        {MAG_STOPS.map((s) => (
          <div key={s.label} className="flex flex-col items-center">
            <span className="h-3 w-3 rounded-full" style={{ background: s.color }} />
            <span className="mt-1 font-mono text-[9px] text-white/60">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
