"use client";

import { useQuery } from "@tanstack/react-query";
import type { Quake } from "@/lib/usgs";

interface ApiResponse {
  quakes: Quake[];
  generated: number;
  count: number;
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
      const res = await fetch(`/api/usgs?min=${minMagnitude}&days=${days}`);
      if (!res.ok) throw new Error(`USGS proxy ${res.status}`);
      return res.json();
    },
    refetchInterval: 60_000,
  });
}
