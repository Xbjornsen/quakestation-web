import * as THREE from "three";
import type { PolePosition, PoleInfo } from "@/lib/features";

export const EARTH_RADIUS = 1;

export function latLonToVec3(latDeg: number, lonDeg: number, radius = EARTH_RADIUS): THREE.Vector3 {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  const cosLat = Math.cos(lat);
  return new THREE.Vector3(
    radius * cosLat * Math.cos(lon),
    radius * Math.sin(lat),
    -radius * cosLat * Math.sin(lon),
  );
}

// Inverse of latLonToVec3 for a unit-length direction vector.
export function vec3ToLatLon(dir: THREE.Vector3): { lat: number; lon: number } {
  const lat = Math.asin(THREE.MathUtils.clamp(dir.y, -1, 1)) * (180 / Math.PI);
  const lon = Math.atan2(-dir.z, dir.x) * (180 / Math.PI);
  return { lat, lon };
}

const EARTH_RADIUS_KM = 6371;

// Great-circle (haversine) distance between two lat/lon points, in km.
export function greatCircleDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

export function subsolarPoint(date: Date = new Date()): { lat: number; lon: number } {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const n = jd - 2451545.0;
  const L = (280.46 + 0.9856474 * n) % 360;
  const g = ((357.528 + 0.9856003 * n) % 360) * (Math.PI / 180);
  const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * (Math.PI / 180);
  const epsilon = 23.439 * (Math.PI / 180);
  const declination = Math.asin(Math.sin(epsilon) * Math.sin(lambda)) * (180 / Math.PI);
  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  const lon = -15 * (utcHours - 12);
  return { lat: declination, lon };
}

export function sunDirection(date: Date = new Date()): THREE.Vector3 {
  const { lat, lon } = subsolarPoint(date);
  return latLonToVec3(lat, lon, 1).normalize();
}

const _facingToCam = new THREE.Vector3();

// Opacity for a surface-anchored overlay (Html labels, etc.) that should
// fade out as its point curves to the far side of the globe, instead of
// floating through the sphere toward the camera. Same formula PoleMarkers
// uses for the N/S badges — a smooth fade band rather than a hard cutoff.
export function facingOpacity(
  surfaceDir: THREE.Vector3,
  surfacePos: THREE.Vector3,
  cameraPos: THREE.Vector3,
): number {
  _facingToCam.subVectors(cameraPos, surfacePos).normalize();
  const facing = surfaceDir.dot(_facingToCam);
  return THREE.MathUtils.clamp((facing + 0.05) / 0.35, 0, 1);
}

function decimalYear(date: Date): number {
  const yearStart = new Date(date.getFullYear(), 0, 1).getTime();
  const nextYearStart = new Date(date.getFullYear() + 1, 0, 1).getTime();
  return date.getFullYear() + (date.getTime() - yearStart) / (nextYearStart - yearStart);
}

// Interpolates a pole's position for `date` from its 5-year-epoch series
// (see public/data/magnetic-poles.json). Latitude lerps directly; longitude
// lerps via the shortest angular path so antimeridian-crossing segments
// (e.g. the north dip pole's 2015->2020 jump) don't produce a wraparound
// spike. Dates outside the series clamp to the nearest endpoint — past the
// last epoch this freezes at the model's prediction, an accepted limitation.
export function interpolatePolePosition(
  series: PolePosition[],
  date: Date = new Date(),
): { lat: number; lon: number } {
  const year = decimalYear(date);
  const first = series[0];
  const last = series[series.length - 1];
  if (year <= first.year) return { lat: first.lat, lon: first.lon };
  if (year >= last.year) return { lat: last.lat, lon: last.lon };

  let i = 0;
  while (series[i + 1].year <= year) i++;
  const a = series[i];
  const b = series[i + 1];
  const t = (year - a.year) / (b.year - a.year);

  const lat = a.lat + (b.lat - a.lat) * t;
  let dLon = b.lon - a.lon;
  if (dLon > 180) dLon -= 360;
  if (dLon < -180) dLon += 360;
  let lon = a.lon + dLon * t;
  if (lon > 180) lon -= 360;
  if (lon < -180) lon += 360;

  return { lat, lon };
}

// BGS/IGRF: pole positions from 1900.0-2020.0 are fit to measured surveys;
// 2025.0-2030.0 are the model's forecast, not measurements.
export const POLE_PREDICTION_CUTOFF_YEAR = 2025;

export interface PoleTrail {
  // Surface points for the "known" (measured-era) portion of the trail.
  historical: THREE.Vector3[];
  // Surface points from the prediction cutoff through today's interpolated
  // position — empty if `now` is still in the historical era.
  predicted: THREE.Vector3[];
  // One point per charted epoch up to `now` (excludes the interpolated
  // "today" point) — for drawing tick marks along the trail.
  epochTicks: THREE.Vector3[];
}

// Builds the drift-trail geometry inputs for a single pole series: splits
// the charted epochs into historical/predicted so callers can style them
// differently, and appends today's interpolated position as the live end
// of the predicted segment (or the historical segment, if `now` predates
// the prediction window).
export function buildPoleTrail(
  series: PolePosition[],
  current: { lat: number; lon: number },
  now: Date,
  radius: number,
): PoleTrail {
  const upToNow = series.filter((p) => p.year <= now.getFullYear());
  const historicalEpochs = upToNow.filter((p) => p.year <= POLE_PREDICTION_CUTOFF_YEAR);
  const predictedEpochs = upToNow.filter((p) => p.year >= POLE_PREDICTION_CUTOFF_YEAR);
  const toVec = (p: PolePosition) => latLonToVec3(p.lat, p.lon, radius);
  const currentVec = latLonToVec3(current.lat, current.lon, radius);

  const historical = historicalEpochs.map(toVec);
  const predicted = predictedEpochs.length > 0 ? [...predictedEpochs.map(toVec), currentVec] : [];
  if (predicted.length === 0) historical.push(currentVec);

  return { historical, predicted, epochTicks: upToNow.map(toVec) };
}

// Builds the click-to-select payload for a pole marker. The "true" pole
// (90N or 90S — longitude is meaningless there) is the reference point for
// the distance stat shown in the detail panel.
export function makePoleInfo(
  label: string,
  kind: PoleInfo["kind"],
  lat: number,
  lon: number,
  year: number,
): PoleInfo {
  const truePoleLat = lat >= 0 ? 90 : -90;
  return {
    label,
    kind,
    lat,
    lon,
    year,
    predicted: year >= POLE_PREDICTION_CUTOFF_YEAR,
    distanceFromGeographicPoleKm: greatCircleDistanceKm(lat, lon, truePoleLat, 0),
  };
}

const horizonFadeVertex = /* glsl */ `
  varying float vFacing;
  void main() {
    vec3 worldPos = (modelMatrix * vec4(position, 1.0)).xyz;
    vec3 toCam = normalize(cameraPosition - worldPos);
    vFacing = dot(normalize(worldPos), toCam);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const horizonFadeFragment = /* glsl */ `
  precision highp float;
  varying float vFacing;
  uniform vec3 uColor;
  uniform float uOpacity;
  void main() {
    if (vFacing < 0.0) discard;
    float fade = smoothstep(0.0, 0.18, vFacing);
    gl_FragColor = vec4(uColor, uOpacity * fade);
  }
`;

// Builds a lineSegments-ready BufferGeometry from one or more polylines
// (each an ordered list of surface points) — consecutive points within a
// polyline become a segment, polylines aren't connected to each other.
// Shared by Plates (many short boundary polylines) and the pole drift
// trails (one long polyline per pole).
export function buildLineSegmentsGeometry(
  polylines: THREE.Vector3[][],
  radius: number,
): THREE.BufferGeometry {
  const verts: number[] = [];
  for (const line of polylines) {
    for (let i = 0; i < line.length - 1; i++) {
      const a = line[i];
      const b = line[i + 1];
      verts.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(verts), 3));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), radius + 0.01);
  return g;
}

// Far-hemisphere-fade material: discards fragments on the globe's backside
// and fades in smoothly near the horizon. Shared by Plates and the pole
// drift trails. Additive blending (the default) sums the line's color into
// whatever's beneath it, which reads as a glow over dark terrain but washes
// straight out to white over bright surfaces like the polar ice caps — pass
// THREE.NormalBlending for lines that need to stay legible there.
export function createHorizonFadeMaterial(
  color: THREE.Color,
  opacity: number,
  blending: THREE.Blending = THREE.AdditiveBlending,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: horizonFadeVertex,
    fragmentShader: horizonFadeFragment,
    uniforms: { uColor: { value: color }, uOpacity: { value: opacity } },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending,
    toneMapped: false,
  });
}
