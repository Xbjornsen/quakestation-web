"use client";

import { useGlobeStore, DEPTH_MIN, DEPTH_MAX } from "@/store/globeStore";
import { X } from "lucide-react";

export function SettingsDrawer() {
  const s = useGlobeStore();

  return (
    <>
      {/* Transparent scrim — clicking the globe (or anywhere outside the
          drawer) closes Settings. */}
      <div
        className="pointer-events-auto fixed inset-0 z-20"
        onClick={() => s.setSettingsOpen(false)}
        aria-hidden
      />
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

        <Section title="Magnitude labels">
          <input
            type="range"
            min={1}
            max={7}
            step={0.5}
            value={s.labelMinMag}
            onChange={(e) => s.setLabelMinMag(Number(e.target.value))}
            className="w-full accent-accent-cyan"
          />
          <div className="mt-1 font-mono text-xs text-white/70">
            Show number on M ≥ {s.labelMinMag.toFixed(1)}
          </div>
        </Section>

        <Section title="Depth band">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <input
                type="range"
                min={DEPTH_MIN}
                max={DEPTH_MAX}
                step={10}
                value={s.depthMin}
                onChange={(e) => s.setDepthRange(Number(e.target.value), s.depthMax)}
                className="w-full accent-accent-cyan"
                aria-label="Minimum depth"
              />
              <input
                type="range"
                min={DEPTH_MIN}
                max={DEPTH_MAX}
                step={10}
                value={s.depthMax}
                onChange={(e) => s.setDepthRange(s.depthMin, Number(e.target.value))}
                className="mt-2 w-full accent-accent-cyan"
                aria-label="Maximum depth"
              />
            </div>
          </div>
          <div className="mt-1 flex items-center justify-between font-mono text-xs text-white/70">
            <span>{s.depthMin} km</span>
            <span>{s.depthMax} km</span>
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
          <Toggle
            label="Swarm towers"
            checked={s.showSwarms}
            onChange={() => s.toggle("showSwarms")}
          />
        </Section>

        <Section title="Globe">
          <Toggle
            label="Auto-rotate"
            checked={s.autoRotate}
            onChange={() => s.toggle("autoRotate")}
          />
          {s.autoRotate && (
            <div className="mt-2">
              <input
                type="range"
                min={0.1}
                max={2}
                step={0.05}
                value={s.autoRotateSpeed}
                onChange={(e) => s.setAutoRotateSpeed(Number(e.target.value))}
                className="w-full accent-accent-cyan"
                aria-label="Auto-rotate speed"
              />
              <div className="mt-1 font-mono text-xs text-white/70">
                Speed {s.autoRotateSpeed.toFixed(2)}×
              </div>
            </div>
          )}
        </Section>

        <div className="mt-2 border-t border-white/10 pt-4 text-[11px] leading-relaxed text-white/40">
          Earthquake data from the free, public{" "}
          <a
            href="https://earthquake.usgs.gov/fdsnws/event/1/"
            target="_blank"
            rel="noreferrer"
            className="text-white/60 underline decoration-white/20 underline-offset-2 transition-colors hover:text-accent-cyan"
          >
            USGS Earthquake API
          </a>
          . Updated live; no account required.
        </div>
      </div>
    </div>
    </>
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
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ${
          checked ? "bg-accent-cyan/70" : "bg-white/15"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
            checked ? "translate-x-[22px]" : "translate-x-0.5"
          }`}
        />
      </button>
    </label>
  );
}
