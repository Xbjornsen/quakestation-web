export interface Quake {
  id: string;
  mag: number;
  place: string;
  time: number;
  updated: number;
  url: string;
  tsunami: 0 | 1;
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
      felt: f.properties.felt,
      sig: f.properties.sig,
      lon: f.geometry.coordinates[0],
      lat: f.geometry.coordinates[1],
      depth: f.geometry.coordinates[2],
    }));
}
