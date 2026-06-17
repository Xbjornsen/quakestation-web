"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { GlobeMount } from "@/components/globe/GlobeMount";
import { useGlobeStore } from "@/store/globeStore";

const ALLOWED_DAYS = new Set([1, 7, 30]);

export function EmbedGlobe() {
  const params = useSearchParams();
  const setMinMagnitude = useGlobeStore((s) => s.setMinMagnitude);
  const setDays = useGlobeStore((s) => s.setDays);
  const toggle = useGlobeStore((s) => s.toggle);

  // Defer mounting the globe until the store reflects the URL params, so
  // GlobeScene reads the intended filters on its very first render.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const minRaw = params.get("min");
    const min = minRaw != null ? Number.parseFloat(minRaw) : NaN;
    if (Number.isFinite(min) && min >= 0) setMinMagnitude(min);

    const daysRaw = params.get("days");
    const days = daysRaw != null ? Number.parseInt(daysRaw, 10) : NaN;
    if (ALLOWED_DAYS.has(days)) setDays(days);

    const rotate = params.get("rotate") === "1";
    // `autoRotate` is a toggle in the store; only flip if it differs from
    // the requested state.
    if (rotate !== useGlobeStore.getState().autoRotate) toggle("autoRotate");

    setReady(true);
    // Run once on mount with the initial params.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready) {
    return (
      <div className="absolute inset-0 grid place-items-center text-white/50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
      </div>
    );
  }

  return (
    <>
      <GlobeMount />
      <a
        href="https://quakestation.com"
        target="_blank"
        rel="noreferrer"
        className="pointer-events-auto absolute bottom-3 right-3 z-10 rounded-full border border-white/10 bg-ink-900/70 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-white/50 backdrop-blur-md transition-colors hover:text-accent-cyan"
      >
        quakestation.com
      </a>
    </>
  );
}
