// Test/agent hooks for the WebGL globe. The globe is a single <canvas>, so
// neither Playwright nor an agent driving a browser can "see" a marker in the
// DOM. In dev (or with NEXT_PUBLIC_TEST_HOOKS=1) <TestHooks /> exposes
// `window.__quakestation` so scripts can read/drive state and find where a
// quake sits on screen instead of guessing pixel coordinates.
//
// Readiness signals on <html> (always set, cheap):
//   data-globe-ready="true"  textures loaded, loader overlay fading out
//   data-quake-count="N"     quakes currently in the store
//
// Example (Playwright):
//   await page.locator('html[data-globe-ready="true"]').waitFor();
//   const p = await page.evaluate(() => window.__quakestation!.projectQuake("fx0001"));
//   if (p?.visible) await page.mouse.click(p.x, p.y);

import type { useGlobeStore } from "@/store/globeStore";

export const TEST_HOOKS_ENABLED =
  process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_TEST_HOOKS === "1";

export interface ScreenPoint {
  // Viewport CSS pixels (what page.mouse.click expects).
  x: number;
  y: number;
  // False when the point is on the far side of the globe or off-screen.
  visible: boolean;
}

export interface QuakeStationTestApi {
  // The zustand store: .getState() to read, .getState().focusQuake(q) etc. to drive.
  store: typeof useGlobeStore;
  // Screen position of a surface point (radius 1 = globe surface).
  project: (lat: number, lon: number, radius?: number) => ScreenPoint;
  // Screen position of a loaded quake by USGS id, or null if not loaded.
  projectQuake: (id: string) => ScreenPoint | null;
  // Lat/lon currently at the centre of the view.
  cameraLatLon: () => { lat: number; lon: number };
  // Point the camera at lat/lon instantly (no fly animation) — for screenshots.
  lookAt: (lat: number, lon: number) => void;
}

declare global {
  interface Window {
    __quakestation?: QuakeStationTestApi;
  }
}
