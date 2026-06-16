// TypeScript port of QuakeStation Android's DetectSwarmsUseCase.
// Greedy single-pass clustering: each event joins the first existing
// cluster within RADIUS_KM and TIME_WINDOW_MS of any member, otherwise
// it seeds a new cluster. A cluster only becomes a swarm once it has
// MIN_EVENTS members.

import type { Quake } from "./usgs";

const RADIUS_KM = 200;
const TIME_WINDOW_MS = 48 * 60 * 60 * 1000;
const MIN_EVENTS = 3;
const EARTH_RADIUS_KM = 6371;

export interface Swarm {
  id: string;
  centroidLat: number;
  centroidLon: number;
  events: Quake[];
  maxMag: number;
  startTime: number;
  endTime: number;
}

function haversineKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

interface Cluster {
  events: Quake[];
  sumLat: number;
  sumLon: number;
  minTime: number;
  maxTime: number;
}

export function detectSwarms(quakes: Quake[]): { swarms: Swarm[]; loose: Quake[] } {
  const sorted = [...quakes].sort((a, b) => a.time - b.time);
  const clusters: Cluster[] = [];

  for (const q of sorted) {
    let joined: Cluster | null = null;
    for (const c of clusters) {
      // Time gate first — cheapest reject.
      if (q.time - c.maxTime > TIME_WINDOW_MS) continue;
      const cLat = c.sumLat / c.events.length;
      const cLon = c.sumLon / c.events.length;
      if (haversineKm(q.lat, q.lon, cLat, cLon) <= RADIUS_KM) {
        joined = c;
        break;
      }
    }
    if (joined) {
      joined.events.push(q);
      joined.sumLat += q.lat;
      joined.sumLon += q.lon;
      joined.maxTime = Math.max(joined.maxTime, q.time);
    } else {
      clusters.push({
        events: [q],
        sumLat: q.lat,
        sumLon: q.lon,
        minTime: q.time,
        maxTime: q.time,
      });
    }
  }

  const swarms: Swarm[] = [];
  const loose: Quake[] = [];
  for (const c of clusters) {
    if (c.events.length >= MIN_EVENTS) {
      const centroidLat = c.sumLat / c.events.length;
      const centroidLon = c.sumLon / c.events.length;
      const maxMag = c.events.reduce((m, q) => Math.max(m, q.mag), 0);
      swarms.push({
        id: `swarm-${centroidLat.toFixed(2)}-${centroidLon.toFixed(2)}-${c.minTime}`,
        centroidLat,
        centroidLon,
        events: c.events,
        maxMag,
        startTime: c.minTime,
        endTime: c.maxTime,
      });
    } else {
      loose.push(...c.events);
    }
  }

  return { swarms, loose };
}
