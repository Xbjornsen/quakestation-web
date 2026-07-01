// Replay tours only significant events so they appear sparsely and in
// sequence rather than flooding the globe with M2.5 background noise.
export const REPLAY_MIN_MAG = 4;

// PAGER alert level USGS assigns to significant events (estimated impact),
// not to be confused with magnitude. Most events have no alert at all.
export type AlertLevel = "green" | "yellow" | "orange" | "red";

export interface Quake {
  id: string;
  mag: number;
  place: string;
  time: number;
  updated: number;
  url: string;
  tsunami: 0 | 1;
  alert: AlertLevel | null;
  felt: number | null;
  sig: number;
  depth: number;
  lat: number;
  lon: number;
}

interface UsgsFeature {
  id: string;
  properties: {
    mag: number | null;
    place: string | null;
    time: number;
    updated: number;
    url: string;
    tsunami: number;
    alert: string | null;
    felt: number | null;
    sig: number;
  };
  geometry: { coordinates: [number, number, number] };
}

interface UsgsResponse {
  features: UsgsFeature[];
  metadata: { generated: number; count: number };
}

export interface QuakeQuery {
  minMagnitude?: number;
  startTime?: string;
  endTime?: string;
  limit?: number;
}

export function buildUsgsUrl(q: QuakeQuery): string {
  const params = new URLSearchParams({
    format: "geojson",
    orderby: "time",
    minmagnitude: String(q.minMagnitude ?? 2.5),
    limit: String(q.limit ?? 2000),
  });
  if (q.startTime) params.set("starttime", q.startTime);
  if (q.endTime) params.set("endtime", q.endTime);
  return `https://earthquake.usgs.gov/fdsnws/event/1/query?${params.toString()}`;
}

// Fetch a single event's headline fields by USGS id, for server-side deep-link
// metadata (so a shared ?quake=<id> link gets a relevant title/description).
export async function fetchQuakeById(
  id: string,
): Promise<{ mag: number; place: string } | null> {
  const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?eventid=${encodeURIComponent(
    id,
  )}&format=geojson`;
  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) return null;
  const j = (await res.json()) as {
    properties?: { mag: number | null; place: string | null };
  };
  if (!j.properties || j.properties.mag == null) return null;
  return { mag: j.properties.mag, place: j.properties.place ?? "Unknown location" };
}

function isAlertLevel(v: string | null): v is AlertLevel {
  return v === "green" || v === "yellow" || v === "orange" || v === "red";
}

export function parseUsgs(raw: UsgsResponse): Quake[] {
  return raw.features
    .filter((f) => f.properties.mag != null && f.geometry?.coordinates?.length === 3)
    .map((f) => ({
      id: f.id,
      mag: f.properties.mag as number,
      place: f.properties.place ?? "Unknown location",
      time: f.properties.time,
      updated: f.properties.updated,
      url: f.properties.url,
      tsunami: (f.properties.tsunami ? 1 : 0) as 0 | 1,
      alert: isAlertLevel(f.properties.alert) ? f.properties.alert : null,
      felt: f.properties.felt,
      sig: f.properties.sig,
      lon: f.geometry.coordinates[0],
      lat: f.geometry.coordinates[1],
      depth: f.geometry.coordinates[2],
    }));
}
