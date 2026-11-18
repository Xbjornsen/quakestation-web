// Generates fixtures/usgs-synthetic.json: a deterministic, hand-shaped quake
// catalogue in the same shape /api/usgs returns ({ generated, count, quakes }).
//
// Why synthetic: tests and screenshots need data that never changes, and that
// deliberately covers the edge cases the UI has to handle — swarms, an
// antimeridian pair, deep-focus events, every PAGER alert level, a tsunami
// flag, null "felt", events right on the M2.5 floor, and events spread over
// 30 days so the 1d / 7d / 30d windows all differ.
//
// Run: node scripts/make-usgs-fixture.mjs
// Real data instead: node scripts/record-usgs-fixture.mjs (needs USGS access).

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Frozen "now" every fixture time is relative to. Tests freeze the browser
// clock here (Playwright: page.clock.setFixedTime(FIXTURE_NOW)).
export const FIXTURE_NOW = Date.UTC(2026, 0, 15, 12, 0, 0);

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

// Small seeded PRNG (mulberry32) so background noise is stable across runs.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let seq = 0;
function quake({ ago, mag, place, lat, lon, depth, alert = null, tsunami = 0, felt = null, sig }) {
  seq += 1;
  const id = `fx${String(seq).padStart(4, "0")}`;
  const time = FIXTURE_NOW - ago;
  return {
    id,
    mag: Math.round(mag * 10) / 10,
    place,
    time,
    updated: time + 10 * MIN,
    url: `https://earthquake.usgs.gov/earthquakes/eventpage/${id}`,
    tsunami,
    alert,
    felt,
    sig: sig ?? Math.round(Math.max(0, mag - 2) * 110),
    depth: Math.round(depth * 10) / 10,
    lat: Math.round(lat * 1e4) / 1e4,
    lon: Math.round(lon * 1e4) / 1e4,
  };
}

const quakes = [];

// --- Named edge cases -------------------------------------------------------
quakes.push(
  // Biggest event: deep, orange alert, tsunami flag.
  quake({ ago: 3 * HOUR, mag: 7.1, place: "112 km NE of Neiafu, Tonga", lat: -17.9, lon: -173.2, depth: 548, alert: "orange", tsunami: 1, felt: 85, sig: 920 }),
  quake({ ago: 20 * HOUR, mag: 6.2, place: "41 km E of Namie, Japan", lat: 37.5, lon: 141.5, depth: 35, alert: "yellow", felt: 1240, sig: 780 }),
  quake({ ago: 2 * DAY, mag: 6.6, place: "Kermadec Islands region", lat: -29.8, lon: -177.6, depth: 22, alert: "green", felt: 3, sig: 670 }),
  quake({ ago: 12 * DAY, mag: 7.4, place: "98 km S of Sand Point, Alaska", lat: 54.4, lon: -160.3, depth: 28, alert: "red", tsunami: 1, felt: 410, sig: 1100 }),
  // Antimeridian pair (Fiji) — exercises lon wraparound in swarm/geo code.
  quake({ ago: 5 * HOUR, mag: 4.8, place: "Fiji region (east of 180)", lat: -17.6, lon: 179.95, depth: 590 }),
  quake({ ago: 6 * HOUR, mag: 4.6, place: "Fiji region (west of 180)", lat: -17.7, lon: -179.9, depth: 610 }),
  // Exactly on the default M2.5 floor, null felt.
  quake({ ago: 40 * MIN, mag: 2.5, place: "8 km NW of The Geysers, CA", lat: 38.83, lon: -122.82, depth: 2.1 }),
  // Very recent (drives "Latest" pill).
  quake({ ago: 4 * MIN, mag: 3.4, place: "15 km SSW of Volcano, Hawaii", lat: 19.3, lon: -155.3, depth: 31 }),
);

// --- Swarm A: Reykjanes, Iceland — 6 events within 30 h, 200 km radius ------
for (let i = 0; i < 6; i++) {
  quakes.push(
    quake({ ago: (2 + i * 5) * HOUR, mag: 3.0 + (i % 3) * 0.6, place: `${4 + i} km NE of Grindavík, Iceland`, lat: 63.88 + i * 0.01, lon: -22.4 + i * 0.02, depth: 4 + i }),
  );
}

// --- Swarm B: south-central Alaska — exactly MIN_EVENTS (3) -----------------
for (let i = 0; i < 3; i++) {
  quakes.push(
    quake({ ago: (8 + i * 5) * HOUR, mag: 2.8 + i * 0.3, place: `${20 + i * 3} km W of Skwentna, Alaska`, lat: 61.95 + i * 0.05, lon: -151.7 - i * 0.05, depth: 60 + i * 10 }),
  );
}

// --- Near-miss cluster: 2 events only — must stay loose ----------------------
quakes.push(
  quake({ ago: 9 * HOUR, mag: 3.1, place: "12 km S of Ocotillo Wells, CA", lat: 33.0, lon: -116.15, depth: 8 }),
  quake({ ago: 11 * HOUR, mag: 2.9, place: "14 km S of Ocotillo Wells, CA", lat: 32.98, lon: -116.14, depth: 9 }),
);

// --- Background noise along major subduction zones, spread over 30 days ----
const zones = [
  { name: "Chile", lat: -30, lon: -71.5, spread: 8 },
  { name: "Peru", lat: -12, lon: -77, spread: 5 },
  { name: "Mexico", lat: 16.5, lon: -98, spread: 4 },
  { name: "Indonesia", lat: -5, lon: 125, spread: 10 },
  { name: "Philippines", lat: 11, lon: 126, spread: 5 },
  { name: "Papua New Guinea", lat: -5.5, lon: 151, spread: 4 },
  { name: "Vanuatu", lat: -16, lon: 167.5, spread: 3 },
  { name: "Aleutian Islands, Alaska", lat: 51.5, lon: 178, spread: 6 },
  { name: "Kuril Islands", lat: 46, lon: 152, spread: 4 },
  { name: "Greece", lat: 38, lon: 22.5, spread: 3 },
  { name: "Türkiye", lat: 38.5, lon: 38, spread: 3 },
  { name: "Mid-Atlantic Ridge", lat: 0, lon: -25, spread: 12 },
];
const r = rng(20260115);
for (let i = 0; i < 48; i++) {
  const z = zones[i % zones.length];
  // Bias toward recent so the 1d window still has a healthy count.
  const ago = Math.floor(r() ** 2 * 30 * DAY) + 15 * MIN;
  const mag = 2.5 + r() ** 2.2 * 3.4;
  const deepRoll = r();
  const depth = deepRoll > 0.9 ? 300 + r() * 350 : deepRoll > 0.7 ? 70 + r() * 200 : 2 + r() * 60;
  quakes.push(
    quake({
      ago,
      mag,
      place: `${Math.floor(5 + r() * 150)} km ${["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.floor(r() * 8)]} of ${z.name}`,
      lat: z.lat + (r() - 0.5) * z.spread,
      lon: z.lon + (r() - 0.5) * z.spread,
      depth,
      felt: r() > 0.8 ? Math.floor(r() * 40) : null,
    }),
  );
}

quakes.sort((a, b) => b.time - a.time); // USGS orders newest first

const out = { generated: FIXTURE_NOW, count: quakes.length, quakes };
const dest = join(dirname(fileURLToPath(import.meta.url)), "..", "fixtures", "usgs-synthetic.json");
mkdirSync(dirname(dest), { recursive: true });
writeFileSync(dest, JSON.stringify(out, null, 1) + "\n");
console.log(`wrote ${quakes.length} quakes -> ${dest}`);
