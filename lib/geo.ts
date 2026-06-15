import * as THREE from "three";

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
