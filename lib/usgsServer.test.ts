import { describe, expect, it } from "vitest";
import { fixtureName, loadFixture, queryFixture } from "./usgsServer";
import { detectSwarms } from "./swarm";

describe("fixtureName", () => {
  it("is off by default", () => {
    expect(fixtureName(undefined)).toBeNull();
    expect(fixtureName("0")).toBeNull();
  });
  it("maps 1/true to the synthetic fixture", () => {
    expect(fixtureName("1")).toBe("synthetic");
    expect(fixtureName("true")).toBe("synthetic");
  });
  it("rejects path-like names", () => {
    expect(() => fixtureName("../secrets")).toThrow();
  });
});

describe("synthetic fixture", async () => {
  const fx = await loadFixture("synthetic");

  it("count matches its quakes", () => {
    expect(fx.count).toBe(fx.quakes.length);
  });

  it("windows differ: 1d < 7d < 30d", () => {
    const n = (days: number) => queryFixture(fx, { minMagnitude: 2.5, days, limit: 5000 }).length;
    expect(n(1)).toBeGreaterThan(10);
    expect(n(1)).toBeLessThan(n(7));
    expect(n(7)).toBeLessThan(n(30));
  });

  it("applies the magnitude floor and limit, newest first", () => {
    const r = queryFixture(fx, { minMagnitude: 5, days: 30, limit: 3 });
    expect(r).toHaveLength(3);
    expect(r.every((e) => e.mag >= 5)).toBe(true);
    expect(r[0].time).toBeGreaterThanOrEqual(r[1].time);
  });

  it("contains the edge cases the UI depends on", () => {
    const day = queryFixture(fx, { minMagnitude: 2.5, days: 1, limit: 5000 });
    expect(detectSwarms(day).swarms.length).toBeGreaterThanOrEqual(2);
    expect(fx.quakes.some((e) => e.tsunami === 1)).toBe(true);
    expect(new Set(fx.quakes.map((e) => e.alert))).toEqual(new Set([null, "green", "yellow", "orange", "red"]));
    expect(fx.quakes.some((e) => e.depth > 300)).toBe(true);
    expect(fx.quakes.some((e) => e.lon > 179) && fx.quakes.some((e) => e.lon < -179)).toBe(true);
  });
});
