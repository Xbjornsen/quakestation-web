import { describe, expect, it } from "vitest";
import {
  greatCircleDistanceKm,
  interpolatePolePosition,
  latLonToVec3,
  subsolarPoint,
  vec3ToLatLon,
} from "./geo";

describe("latLonToVec3 / vec3ToLatLon", () => {
  it.each([
    [0, 0],
    [45, 90],
    [-33.9, 151.2],
    [-12.46, 130.84],
    [89, -179],
  ])("round-trips (%f, %f)", (lat, lon) => {
    const back = vec3ToLatLon(latLonToVec3(lat, lon).normalize());
    expect(back.lat).toBeCloseTo(lat, 6);
    expect(back.lon).toBeCloseTo(lon, 6);
  });

  it("puts the north pole on +Y", () => {
    const v = latLonToVec3(90, 0);
    expect(v.y).toBeCloseTo(1);
  });
});

describe("greatCircleDistanceKm", () => {
  it("is ~111 km per degree at the equator", () => {
    expect(greatCircleDistanceKm(0, 0, 0, 1)).toBeCloseTo(111.19, 1);
  });

  it("is short across the antimeridian", () => {
    expect(greatCircleDistanceKm(0, 179.5, 0, -179.5)).toBeCloseTo(111.19, 1);
  });

  it("Darwin to Sydney is ~3,150 km", () => {
    const d = greatCircleDistanceKm(-12.46, 130.84, -33.87, 151.21);
    expect(d).toBeGreaterThan(3100);
    expect(d).toBeLessThan(3200);
  });
});

describe("subsolarPoint", () => {
  it("is near the equator at the March equinox and on the antimeridian at 00 UTC", () => {
    const p = subsolarPoint(new Date(Date.UTC(2026, 2, 20, 0, 0, 0)));
    expect(Math.abs(p.lat)).toBeLessThan(1);
    expect(Math.abs(Math.abs(p.lon) - 180)).toBeLessThan(0.01);
  });

  it("is near the Tropic of Cancer at the June solstice", () => {
    const p = subsolarPoint(new Date(Date.UTC(2026, 5, 21, 12, 0, 0)));
    expect(p.lat).toBeCloseTo(23.44, 0);
  });
});

describe("interpolatePolePosition", () => {
  const series = [
    { year: 2000, lat: 80, lon: 170 },
    { year: 2010, lat: 85, lon: -170 }, // crosses the antimeridian
  ];

  it("clamps outside the series", () => {
    expect(interpolatePolePosition(series, new Date(Date.UTC(1990, 0, 1)))).toEqual({ lat: 80, lon: 170 });
    expect(interpolatePolePosition(series, new Date(Date.UTC(2030, 0, 1)))).toEqual({ lat: 85, lon: -170 });
  });

  it("takes the short way across ±180°", () => {
    const mid = interpolatePolePosition(series, new Date(2005, 0, 1));
    expect(mid.lat).toBeCloseTo(82.5, 1);
    expect(Math.abs(mid.lon)).toBeGreaterThan(175); // ~180, not ~0
  });
});
