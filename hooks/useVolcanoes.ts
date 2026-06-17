"use client";

import { useQuery } from "@tanstack/react-query";
import { loadVolcanoes } from "@/lib/features";

// Static volcano dataset (bundled JSON) — fetched once and cached forever.
export function useVolcanoes(enabled = true) {
  return useQuery({
    queryKey: ["volcanoes"],
    queryFn: loadVolcanoes,
    staleTime: Infinity,
    enabled,
  });
}
