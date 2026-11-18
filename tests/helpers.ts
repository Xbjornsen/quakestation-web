import type { Quake } from "@/lib/usgs";

let n = 0;
// Minimal valid Quake with overridable fields.
export function q(over: Partial<Quake> = {}): Quake {
  n += 1;
  return {
    id: `t${n}`,
    mag: 3,
    place: "Somewhere",
    time: 0,
    updated: 0,
    url: "",
    tsunami: 0,
    alert: null,
    felt: null,
    sig: 100,
    depth: 10,
    lat: 0,
    lon: 0,
    ...over,
  };
}

export const HOUR = 60 * 60 * 1000;
