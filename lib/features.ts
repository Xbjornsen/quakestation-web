// Static overlay datasets (tectonic plates, volcanoes) live in
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

// A unit-of-selection for the detail panel. Mutually exclusive with a
// selected Quake / Swarm in the store.
export type SelectedFeature = { kind: "volcano"; data: Volcano } | { kind: "pole"; data: PoleInfo };

export interface PlateBoundary {
  name: string;
  // Array of [lon, lat] vertices.
  coordinates: [number, number][];
}

export interface PolePosition {
  year: number;
  lat: number;
  lon: number;
}

export interface MagneticPoles {
  northDip: PolePosition[];
  southDip: PolePosition[];
  northGeomagnetic: PolePosition[];
  southGeomagnetic: PolePosition[];
}

export interface PoleInfo {
  label: string;
  kind: "dip" | "geomagnetic";
  lat: number;
  lon: number;
  // Calendar year the shown position was interpolated for ("as of").
  year: number;
  // True once `year` falls in the WMM/IGRF forecast window (2025-2030) —
  // the model is extrapolating rather than fitting measured survey data.
  predicted: boolean;
  distanceFromGeographicPoleKm: number;
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

// Shared between PoleMarkers (always mounted) and GeomagneticPoles (mounted
// only when toggled on) — cache the promise so both get one fetch.
let magneticPolesPromise: Promise<MagneticPoles> | null = null;

export function loadMagneticPoles(): Promise<MagneticPoles> {
  if (!magneticPolesPromise) {
    magneticPolesPromise = fetchJson<MagneticPoles>("/data/magnetic-poles.json");
  }
  return magneticPolesPromise;
}
