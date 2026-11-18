import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_PREFS, DEPTH_MAX, filtersChanged, useGlobeStore } from "./globeStore";
import { q } from "@/tests/helpers";

describe("globeStore", () => {
  beforeEach(() => useGlobeStore.getState().resetPrefs());

  it("keeps the depth band ordered and clamped", () => {
    useGlobeStore.getState().setDepthRange(500, 100);
    expect(useGlobeStore.getState()).toMatchObject({ depthMin: 100, depthMax: 500 });
    useGlobeStore.getState().setDepthRange(-50, 9999);
    expect(useGlobeStore.getState()).toMatchObject({ depthMin: 0, depthMax: DEPTH_MAX });
  });

  it("focusQuake selects exclusively and requests a fly-to", () => {
    const quake = q({ lat: 10, lon: 20 });
    useGlobeStore.getState().focusQuake(quake);
    const s = useGlobeStore.getState();
    expect(s.selected).toBe(quake);
    expect(s.selectedSwarm).toBeNull();
    expect(s.selectedFeature).toBeNull();
    expect(s.flyToTarget).toEqual({ lat: 10, lon: 20 });
  });

  it("resetFilters restores only the data filters", () => {
    const st = useGlobeStore.getState();
    st.setMinMagnitude(5);
    st.toggle("showPlates");
    st.resetFilters();
    const s = useGlobeStore.getState();
    expect(filtersChanged(s)).toBe(false);
    expect(s.showPlates).toBe(!DEFAULT_PREFS.showPlates);
  });
});
