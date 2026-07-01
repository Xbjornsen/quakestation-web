"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useGlobeStore } from "@/store/globeStore";
import { GLOBE_MAX_DAYS } from "@/lib/usgs";

// One-time application of a shared view's `?min=&days=&lat=&lon=` params
// (written by ShareButton) so opening a shared link reproduces the sender's
// filters and camera angle. Applies once on mount and never writes back —
// unlike DeepLinkSync's selection, the view itself doesn't need to stay
// reflected in the URL as the user pans around.
export function ShareViewSync() {
  const params = useSearchParams();
  const setMinMagnitude = useGlobeStore((s) => s.setMinMagnitude);
  const setDays = useGlobeStore((s) => s.setDays);
  const flyTo = useGlobeStore((s) => s.flyTo);
  const applied = useRef(false);

  useEffect(() => {
    if (applied.current) return;
    applied.current = true;

    const min = params.get("min");
    const days = params.get("days");
    const lat = params.get("lat");
    const lon = params.get("lon");

    if (min != null) {
      const n = Number(min);
      if (Number.isFinite(n)) setMinMagnitude(n);
    }
    if (days != null) {
      const n = Number(days);
      // Clamp: the live globe renders every event as geometry + a per-event
      // label, so an unbounded `days` from a crafted/shared URL could hang
      // the tab (a year of global data is thousands of labels).
      if (Number.isFinite(n)) setDays(Math.min(Math.max(n, 1), GLOBE_MAX_DAYS));
    }
    if (lat != null && lon != null) {
      const la = Number(lat);
      const lo = Number(lon);
      if (Number.isFinite(la) && Number.isFinite(lo)) flyTo(la, lo);
    }
  }, [params, setMinMagnitude, setDays, flyTo]);

  return null;
}
