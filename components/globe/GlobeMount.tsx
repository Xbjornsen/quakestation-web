"use client";

import dynamic from "next/dynamic";

const GlobeScene = dynamic(() => import("./GlobeScene"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 grid place-items-center">
      <div className="flex flex-col items-center gap-3 text-white/60">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
        <span className="text-xs uppercase tracking-[0.3em]">Loading globe</span>
      </div>
    </div>
  ),
});

export function GlobeMount() {
  return <GlobeScene />;
}
