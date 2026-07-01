// Plain mutable module state (not zustand) holding the globe's current
// look-at point. CameraController writes to it every frame; the Share
// button reads it once at click time. Deliberately outside React state so
// the header (which lives outside the R3F tree) can read it without
// subscribing every component to 60fps updates.
export const cameraSnapshot = { lat: 0, lon: 0 };

export function setCameraSnapshot(lat: number, lon: number) {
  cameraSnapshot.lat = lat;
  cameraSnapshot.lon = lon;
}
