"use client";

import { useEffect, useState } from "react";
import GlobeScene from "./GlobeScene";

export function GlobeMount() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="absolute inset-0 grid place-items-center">
        <div className="flex flex-col items-center gap-3 text-white/60">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
          <span className="text-xs uppercase tracking-[0.3em]">Loading globe</span>
        </div>
      </div>
    );
  }

  return <GlobeScene />;
}
