"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { useGlobeStore } from "@/store/globeStore";
import { cameraSnapshot } from "@/lib/cameraSnapshot";

// Copies a link that reproduces the current view: magnitude floor, time
// window, and the globe's current look-at point (from the non-reactive
// camera snapshot CameraController writes every ~250ms). Any existing
// `?quake=` selection is preserved as-is — DeepLinkSync owns that param.
export function ShareButton() {
  const minMagnitude = useGlobeStore((s) => s.minMagnitude);
  const days = useGlobeStore((s) => s.days);
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set("min", String(minMagnitude));
    url.searchParams.set("days", String(days));
    url.searchParams.set("lat", cameraSnapshot.lat.toFixed(1));
    url.searchParams.set("lon", cameraSnapshot.lon.toFixed(1));
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard permission denied or unavailable — silently no-op rather
      // than surface an error for a non-critical convenience action.
    }
  };

  return (
    <button
      onClick={handleShare}
      aria-label="Copy link to this view"
      className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-white/5 backdrop-blur-md transition-colors hover:bg-white/10"
    >
      {copied ? (
        <Check className="h-4 w-4 text-accent-cyan" />
      ) : (
        <Share2 className="h-4 w-4 text-white/80" />
      )}
    </button>
  );
}
