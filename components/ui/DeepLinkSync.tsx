"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useGlobeStore } from "@/store/globeStore";

// Two-way sync between the selected quake and the `?quake=<id>` URL param, so
// a selection is shareable and survives reload. Renders nothing.
//
// Order matters: we capture the inbound id up front and hold off writing the
// URL until that initial deep link has been resolved, otherwise the empty
// initial selection would strip the param before the data arrives.
export function DeepLinkSync() {
  const params = useSearchParams();
  const quakes = useGlobeStore((s) => s.quakes);
  const selected = useGlobeStore((s) => s.selected);
  const focusQuake = useGlobeStore((s) => s.focusQuake);

  const initialId = useRef<string | null>(params.get("quake"));
  // If there's no inbound deep link, URL writing can start immediately.
  const ready = useRef(initialId.current === null);

  // Apply the inbound ?quake=<id> once the feed has loaded.
  useEffect(() => {
    if (ready.current || quakes.length === 0) return;
    const id = initialId.current;
    const q = id ? quakes.find((x) => x.id === id) : null;
    if (q) {
      focusQuake(q);
    } else {
      // Stale / filtered-out id: drop it so the URL doesn't lie.
      const url = new URL(window.location.href);
      url.searchParams.delete("quake");
      window.history.replaceState(null, "", url.toString());
    }
    ready.current = true;
  }, [quakes, focusQuake]);

  // Reflect the live selection back into the URL (shallow — no navigation).
  useEffect(() => {
    if (!ready.current) return;
    const url = new URL(window.location.href);
    if (selected) url.searchParams.set("quake", selected.id);
    else url.searchParams.delete("quake");
    window.history.replaceState(null, "", url.toString());
  }, [selected]);

  return null;
}
