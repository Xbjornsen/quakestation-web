"use client";

import { useProgress } from "@react-three/drei";
import { useEffect, useState } from "react";

// Full-bleed placeholder shown over the canvas until the Earth's 8K textures
// have finished loading. Without it the user stares at the flat fallback
// sphere while the textures stream in. Driven by drei's global loading store
// (THREE.DefaultLoadingManager), which is readable here outside <Canvas>.
export function GlobeLoader() {
  const { active, progress } = useProgress();
  const [done, setDone] = useState(false);
  const [hidden, setHidden] = useState(false);

  // Loaders have gone idle at 100% — the globe is ready, start the fade.
  useEffect(() => {
    if (!active && progress >= 100) setDone(true);
  }, [active, progress]);

  // Safety net: never trap the user behind the overlay if a texture stalls.
  useEffect(() => {
    const t = setTimeout(() => setDone(true), 12000);
    return () => clearTimeout(t);
  }, []);

  // Unmount once the fade-out transition has finished.
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setHidden(true), 700);
    return () => clearTimeout(t);
  }, [done]);

  if (hidden) return null;

  return (
    <div
      aria-hidden={done}
      className={`pointer-events-none absolute inset-0 z-20 grid place-items-center bg-ink-950 transition-opacity duration-700 ${
        done ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center gap-3 text-white/60">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
        <span className="text-xs uppercase tracking-[0.3em]">Loading globe</span>
        <span className="font-mono text-[10px] text-white/40">{Math.round(progress)}%</span>
      </div>
    </div>
  );
}
