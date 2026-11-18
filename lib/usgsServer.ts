// Server-only USGS helpers (uses node:fs — never import from a client
// component; lib/usgs.ts is the shared, client-safe module).
//
// Offline fixture mode for the USGS proxy. With USGS_FIXTURE set, /api/usgs
// and deep-link metadata read a committed JSON catalogue instead of the live
// feed, so tests, screenshots and agents see identical data on every run.
//
//   USGS_FIXTURE=1 | synthetic  -> fixtures/usgs-synthetic.json (default)
//   USGS_FIXTURE=recorded       -> fixtures/usgs-recorded.json
//
// Each fixture carries a `generated` timestamp: the frozen "now" its events
// are relative to. Freeze the browser clock there too, or relative times
// ("35m ago") and the replay bar will drift.

import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Quake } from "./usgs";

export interface FixtureFile {
  generated: number;
  count: number;
  quakes: Quake[];
}

export function fixtureName(env: string | undefined = process.env.USGS_FIXTURE): string | null {
  if (!env || env === "0" || env === "false") return null;
  if (env === "1" || env === "true") return "synthetic";
  if (!/^[a-z0-9-]+$/i.test(env)) throw new Error(`Invalid USGS_FIXTURE name: ${env}`);
  return env;
}

const cache = new Map<string, Promise<FixtureFile>>();

export function loadFixture(name: string): Promise<FixtureFile> {
  let p = cache.get(name);
  if (!p) {
    const file = path.join(process.cwd(), "fixtures", `usgs-${name}.json`);
    p = readFile(file, "utf8").then((s) => JSON.parse(s) as FixtureFile);
    cache.set(name, p);
  }
  return p;
}

// Same filtering the live query applies: magnitude floor, a window of `days`
// ending at the fixture's own "now", newest first, capped at `limit`.
export function queryFixture(
  fx: FixtureFile,
  { minMagnitude, days, limit }: { minMagnitude: number; days: number; limit: number },
): Quake[] {
  const start = fx.generated - days * 24 * 60 * 60 * 1000;
  return fx.quakes
    .filter((q) => q.mag >= minMagnitude && q.time >= start && q.time <= fx.generated)
    .sort((a, b) => b.time - a.time)
    .slice(0, limit);
}

// Fetch a single event's headline fields by USGS id, for server-side deep-link
// metadata (so a shared ?quake=<id> link gets a relevant title/description).
export async function fetchQuakeById(
  id: string,
): Promise<{ mag: number; place: string } | null> {
  const fixture = fixtureName();
  if (fixture) {
    const q = (await loadFixture(fixture)).quakes.find((e) => e.id === id);
    return q ? { mag: q.mag, place: q.place } : null;
  }
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
