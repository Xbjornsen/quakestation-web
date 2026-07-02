"use client";

import { useQuery } from "@tanstack/react-query";
import type { Quake } from "@/lib/usgs";

interface ApiResponse {
  quakes: Quake[];
  generated: number;
  count: number;
}

// USGS returns results ordered by recency with a fixed result cap, so a
// long window needs a bigger cap or it silently collapses into "the most
// recent handful of days" instead of actually spanning the window.
function limitFor(days: number): number {
  if (days <= 1) return 2000;
  if (days <= 7) return 3000;
  if (days <= 30) return 5000;
  return 10_000;
}

export function useQuakes({
  minMagnitude,
  days,
}: {
  minMagnitude: number;
  days: number;
}) {
  return useQuery<ApiResponse>({
    queryKey: ["quakes", minMagnitude, days],
    queryFn: async () => {
      const res = await fetch(
        `/api/usgs?min=${minMagnitude}&days=${days}&limit=${limitFor(days)}`,
      );
      if (!res.ok) throw new Error(`USGS proxy ${res.status}`);
      return res.json();
    },
    refetchInterval: 60_000,
  });
}
