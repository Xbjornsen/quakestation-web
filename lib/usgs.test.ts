import { describe, expect, it } from "vitest";
import { buildUsgsUrl, parseUsgs } from "./usgs";

const feature = (over: Record<string, unknown> = {}, coords: number[] = [130.8, -12.4, 10]) => ({
  id: "us1",
  properties: {
    mag: 4.5,
    place: "10 km N of Darwin",
    time: 1,
    updated: 2,
    url: "https://example.test",
    tsunami: 0,
    alert: null,
    felt: null,
    sig: 300,
    ...over,
  },
  geometry: { coordinates: coords },
});

const parse = (features: unknown[]) =>
  parseUsgs({ features, metadata: { generated: 0, count: features.length } } as Parameters<typeof parseUsgs>[0]);

describe("parseUsgs", () => {
  it("maps GeoJSON [lon, lat, depth] to named fields", () => {
    const [q] = parse([feature()]);
    expect(q).toMatchObject({ id: "us1", mag: 4.5, lon: 130.8, lat: -12.4, depth: 10 });
  });

  it("drops events with a null magnitude", () => {
    expect(parse([feature({ mag: null })])).toHaveLength(0);
  });

  it("drops events without 3 coordinates", () => {
    expect(parse([feature({}, [1, 2])])).toHaveLength(0);
  });

  it("normalises alert, tsunami and place", () => {
    const [a, b] = parse([
      feature({ alert: "orange", tsunami: 1 }),
      feature({ alert: "pending", place: null }),
    ]);
    expect(a.alert).toBe("orange");
    expect(a.tsunami).toBe(1);
    expect(b.alert).toBeNull();
    expect(b.place).toBe("Unknown location");
  });
});

describe("buildUsgsUrl", () => {
  it("builds a geojson query with defaults", () => {
    const u = new URL(buildUsgsUrl({}));
    expect(u.hostname).toBe("earthquake.usgs.gov");
    expect(u.searchParams.get("format")).toBe("geojson");
    expect(u.searchParams.get("minmagnitude")).toBe("2.5");
    expect(u.searchParams.get("limit")).toBe("2000");
    expect(u.searchParams.has("starttime")).toBe(false);
  });

  it("passes the time window through", () => {
    const u = new URL(buildUsgsUrl({ minMagnitude: 4, startTime: "2026-01-01T00:00:00Z", endTime: "2026-01-02T00:00:00Z" }));
    expect(u.searchParams.get("minmagnitude")).toBe("4");
    expect(u.searchParams.get("starttime")).toBe("2026-01-01T00:00:00Z");
  });
});
