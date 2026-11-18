// Records a real USGS window into fixtures/usgs-recorded.json, in the same
// shape /api/usgs returns, so a snapshot of real-world data can be replayed
// offline with USGS_FIXTURE=recorded.
//
// Run: node scripts/record-usgs-fixture.mjs [days=7] [minMag=2.5]
// Needs network access to earthquake.usgs.gov. Mirrors parseUsgs() in
// lib/usgs.ts — keep the two in step if the Quake shape changes.

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const days = Number(process.argv[2] ?? 7);
const minMag = Number(process.argv[3] ?? 2.5);
const end = new Date();
const start = new Date(end.getTime() - days * 86_400_000);

const params = new URLSearchParams({
  format: "geojson",
  orderby: "time",
  minmagnitude: String(minMag),
  limit: "5000",
  starttime: start.toISOString(),
  endtime: end.toISOString(),
});
const res = await fetch(`https://earthquake.usgs.gov/fdsnws/event/1/query?${params}`);
if (!res.ok) throw new Error(`USGS ${res.status}`);
const raw = await res.json();

const ALERTS = new Set(["green", "yellow", "orange", "red"]);
const quakes = raw.features
  .filter((f) => f.properties.mag != null && f.geometry?.coordinates?.length === 3)
  .map((f) => ({
    id: f.id,
    mag: f.properties.mag,
    place: f.properties.place ?? "Unknown location",
    time: f.properties.time,
    updated: f.properties.updated,
    url: f.properties.url,
    tsunami: f.properties.tsunami ? 1 : 0,
    alert: ALERTS.has(f.properties.alert) ? f.properties.alert : null,
    felt: f.properties.felt,
    sig: f.properties.sig,
    lon: f.geometry.coordinates[0],
    lat: f.geometry.coordinates[1],
    depth: f.geometry.coordinates[2],
  }));

const out = { generated: raw.metadata?.generated ?? end.getTime(), count: quakes.length, quakes };
const dest = join(dirname(fileURLToPath(import.meta.url)), "..", "fixtures", "usgs-recorded.json");
mkdirSync(dirname(dest), { recursive: true });
writeFileSync(dest, JSON.stringify(out) + "\n");
console.log(`recorded ${quakes.length} quakes (${days}d, M${minMag}+) -> ${dest}`);
console.log(`freeze tests at generated = ${out.generated} (${new Date(out.generated).toISOString()})`);
