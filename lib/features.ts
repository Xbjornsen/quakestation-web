// Static overlay datasets (tectonic plates, volcanoes, peaks) live in
// /public/data and are fetched once on demand. These are small, bundled
// JSON files — no external API — so a layer toggles on instantly after
// its first load.

export interface Volcano {
  name: string;
  country: string;
  type: string;
  elevation_m: number;
  last_eruption: string;
  lat: number;
  lon: number;
}

export interface Peak {
  name: string;
  range: string;
  elevation_m: number;
  prominence_m: number;
  lat: number;
  lon: number;
}

// A unit-of-selection for the detail panel. Mutually exclusive with a
// selected Quake / Swarm in the store.
export type SelectedFeature =
  | { kind: "volcano"; data: Volcano }
  | { kind: "peak"; data: Peak };

export interface PlateBoundary {
  name: string;
  // Array of [lon, lat] vertices.
  coordinates: [number, number][];
}

interface PlateGeoJSON {
  features: {
    // Real PB2002 (Bird 2003) uses `Name` (a plate-pair code, e.g.
    // "AF-AN"); tolerate a lowercase `name` too.
    properties?: { Name?: string; name?: string };
    geometry: { type: string; coordinates: [number, number][] };
  }[];
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  return (await res.json()) as T;
}

export async function loadPlateBoundaries(): Promise<PlateBoundary[]> {
  const geo = await fetchJson<PlateGeoJSON>("/data/plate_boundaries.json");
  return geo.features
    .filter((f) => f.geometry?.type === "LineString")
    .map((f) => ({
      name: f.properties?.Name ?? f.properties?.name ?? "Plate boundary",
      coordinates: f.geometry.coordinates,
    }));
}

export function loadVolcanoes(): Promise<Volcano[]> {
  return fetchJson<Volcano[]>("/data/volcanoes.json");
}

export function loadPeaks(): Promise<Peak[]> {
  return fetchJson<Peak[]>("/data/peaks.json");
}
