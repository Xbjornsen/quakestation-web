import { describe, expect, it } from "vitest";
import { detectSwarms } from "./swarm";
import { q, HOUR } from "@/tests/helpers";

describe("detectSwarms", () => {
  it("groups 3+ nearby, close-in-time events into one swarm", () => {
    const events = [
      q({ lat: 63.9, lon: -22.4, time: 0, mag: 3.1 }),
      q({ lat: 63.91, lon: -22.38, time: 2 * HOUR, mag: 4.2 }),
      q({ lat: 63.92, lon: -22.36, time: 5 * HOUR, mag: 3.5 }),
    ];
    const { swarms, loose } = detectSwarms(events);
    expect(swarms).toHaveLength(1);
    expect(loose).toHaveLength(0);
    expect(swarms[0].events).toHaveLength(3);
    expect(swarms[0].maxMag).toBe(4.2);
    expect(swarms[0].startTime).toBe(0);
    expect(swarms[0].endTime).toBe(5 * HOUR);
  });

  it("leaves a 2-event cluster loose (MIN_EVENTS is 3)", () => {
    const { swarms, loose } = detectSwarms([
      q({ lat: 33, lon: -116, time: 0 }),
      q({ lat: 33.01, lon: -116, time: HOUR }),
    ]);
    expect(swarms).toHaveLength(0);
    expect(loose).toHaveLength(2);
  });

  it("does not join events more than 200 km apart", () => {
    const { swarms } = detectSwarms([
      q({ lat: 0, lon: 0, time: 0 }),
      q({ lat: 0, lon: 1, time: HOUR }), // ~111 km — joins
      q({ lat: 0, lon: 3, time: 2 * HOUR }), // ~333 km from the first — new cluster
    ]);
    expect(swarms).toHaveLength(0);
  });

  it("splits a cluster when the gap exceeds 48 h", () => {
    const { swarms } = detectSwarms([
      q({ time: 0 }),
      q({ time: HOUR }),
      q({ time: 60 * HOUR }), // 59 h after the last member
    ]);
    expect(swarms).toHaveLength(0);
  });

  it("is order-independent (sorts by time internally)", () => {
    const events = [q({ time: 5 * HOUR }), q({ time: 0 }), q({ time: 2 * HOUR })];
    expect(detectSwarms(events).swarms).toHaveLength(1);
    expect(detectSwarms([...events].reverse()).swarms).toHaveLength(1);
  });

  it("joins events across the antimeridian (haversine distance)", () => {
    const { swarms } = detectSwarms([
      q({ lat: -17.6, lon: 179.95, time: 0 }),
      q({ lat: -17.62, lon: 179.98, time: HOUR }),
      q({ lat: -17.65, lon: -179.98, time: 2 * HOUR }),
    ]);
    expect(swarms).toHaveLength(1);
  });

  // Known bug: the centroid is an arithmetic mean of longitudes, so a swarm
  // straddling ±180° gets a centroid near lon 60 (wrong side of the planet).
  // Remove `.fails` once centroids are averaged on the sphere.
  it.fails("puts an antimeridian swarm's centroid near ±180°", () => {
    const { swarms } = detectSwarms([
      q({ lat: -17.6, lon: 179.95, time: 0 }),
      q({ lat: -17.62, lon: 179.98, time: HOUR }),
      q({ lat: -17.65, lon: -179.98, time: 2 * HOUR }),
    ]);
    expect(Math.abs(swarms[0].centroidLon)).toBeGreaterThan(179);
  });
});
