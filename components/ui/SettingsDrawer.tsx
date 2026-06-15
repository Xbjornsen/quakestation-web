"use client";

import { useGlobeStore } from "@/store/globeStore";
import { X } from "lucide-react";

export function SettingsDrawer() {
  const s = useGlobeStore();

  return (
    <div className="pointer-events-auto fixed inset-y-0 right-0 z-30 flex w-full max-w-sm flex-col border-l border-white/10 bg-ink-900/95 backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.3em]">Settings</h2>
        <button
          onClick={() => s.setSettingsOpen(false)}
          className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/10"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-5">
        <Section title="Magnitude floor">
          <input
            type="range"
            min={1}
            max={7}
            step={0.5}
            value={s.minMagnitude}
            onChange={(e) => s.setMinMagnitude(Number(e.target.value))}
            className="w-full accent-accent-cyan"
          />
          <div className="mt-1 font-mono text-xs text-white/70">
            M ≥ {s.minMagnitude.toFixed(1)}
          </div>
        </Section>

        <Section title="Time window">
          <div className="grid grid-cols-3 gap-2">
            {[1, 7, 30].map((d) => (
              <button
                key={d}
                onClick={() => s.setDays(d)}
                className={`rounded-md border px-3 py-2 text-xs ${
                  s.days === d
                    ? "border-accent-cyan/60 bg-accent-cyan/10 text-accent-cyan"
                    : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </Section>

        <Section title="Marker colour">
          <div className="grid grid-cols-2 gap-2">
            {(["magnitude", "depth"] as const).map((m) => (
              <button
                key={m}
                onClick={() => s.setColorMode(m)}
                className={`rounded-md border px-3 py-2 text-xs capitalize ${
                  s.colorMode === m
                    ? "border-accent-cyan/60 bg-accent-cyan/10 text-accent-cyan"
                    : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </Section>

        <Section title="Layers">
          <Toggle
            label="Tectonic plates"
            checked={s.showPlates}
            onChange={() => s.toggle("showPlates")}
          />
          <Toggle
            label="Volcanoes"
            checked={s.showVolcanoes}
            onChange={() => s.toggle("showVolcanoes")}
          />
          <Toggle label="Major peaks" checked={s.showPeaks} onChange={() => s.toggle("showPeaks")} />
          <Toggle
            label="Seismic heatmap"
            checked={s.showHeatmap}
            onChange={() => s.toggle("showHeatmap")}
          />
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-white/50">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between py-2">
      <span className="text-sm text-white/80">{label}</span>
      <button
        type="button"
        onClick={onChange}
        className={`relative h-5 w-9 rounded-full transition-colors ${
          checked ? "bg-accent-cyan/60" : "bg-white/15"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </button>
    </label>
  );
}
