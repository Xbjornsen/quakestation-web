import { describe, expect, it } from "vitest";
import { depthColor, formatRelative, magnitudeColor } from "./utils";

describe("formatRelative", () => {
  const now = 1_000_000_000;
  it.each([
    [0, "0s ago"],
    [59_000, "59s ago"],
    [60_000, "1m ago"],
    [3_600_000, "1h ago"],
    [86_400_000 * 3, "3d ago"],
  ])("%i ms -> %s", (diff, out) => {
    expect(formatRelative(now - diff, now)).toBe(out);
  });
  it("never goes negative for future timestamps", () => {
    expect(formatRelative(now + 5000, now)).toBe("0s ago");
  });
});

describe("colour bands", () => {
  it("magnitude bands change at whole magnitudes", () => {
    expect(magnitudeColor(3.99)).not.toEqual(magnitudeColor(4));
    expect(magnitudeColor(7)).toEqual(magnitudeColor(9));
  });
  it("depth bands match the stats page (70 / 300 km)", () => {
    expect(depthColor(69.9)).not.toEqual(depthColor(70));
    expect(depthColor(299.9)).not.toEqual(depthColor(300));
  });
});
