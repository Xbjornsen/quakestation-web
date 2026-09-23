"use client";

import { useProgress } from "@react-three/drei";
import { useEffect, useState } from "react";
import { GlobeLoaderView } from "./GlobeLoaderView";

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

  return <GlobeLoaderView progress={progress} done={done} />;
}
