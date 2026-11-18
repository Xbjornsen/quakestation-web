"use client";

import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import * as THREE from "three";
import { useGlobeStore } from "@/store/globeStore";
import { latLonToVec3, vec3ToLatLon } from "@/lib/geo";
import { TEST_HOOKS_ENABLED, type QuakeStationTestApi } from "@/lib/testHooks";

// Marker shells sit just above the surface (see Markers.tsx).
const MARKER_RADIUS = 1.003;

// Mounted inside <Canvas>. See lib/testHooks.ts for what this exposes and why.
export function TestHooks() {
  const { camera, gl, invalidate } = useThree();

  // Quake count on <html>, so tests can wait for data without polling the store.
  useEffect(() => {
    const el = document.documentElement;
    const write = (n: number) => el.setAttribute("data-quake-count", String(n));
    write(useGlobeStore.getState().quakes.length);
    return useGlobeStore.subscribe((s) => write(s.quakes.length));
  }, []);

  useEffect(() => {
    if (!TEST_HOOKS_ENABLED) return;

    const project: QuakeStationTestApi["project"] = (lat, lon, radius = MARKER_RADIUS) => {
      const p = latLonToVec3(lat, lon, radius);
      const toCam = camera.position.clone().sub(p).normalize();
      const facing = p.clone().normalize().dot(toCam) > 0;
      const ndc = p.clone().project(camera);
      const rect = gl.domElement.getBoundingClientRect();
      const x = rect.left + ((ndc.x + 1) / 2) * rect.width;
      const y = rect.top + ((1 - ndc.y) / 2) * rect.height;
      const onScreen = Math.abs(ndc.x) <= 1 && Math.abs(ndc.y) <= 1;
      return { x, y, visible: facing && onScreen };
    };

    const api: QuakeStationTestApi = {
      store: useGlobeStore,
      project,
      projectQuake: (id) => {
        const q = useGlobeStore.getState().quakes.find((e) => e.id === id);
        return q ? project(q.lat, q.lon) : null;
      },
      cameraLatLon: () => vec3ToLatLon(camera.position.clone().normalize()),
      lookAt: (lat, lon) => {
        useGlobeStore.getState().clearFlyTo();
        const dist = camera.position.length();
        camera.position.copy(latLonToVec3(lat, lon, 1).normalize().multiplyScalar(dist));
        camera.lookAt(new THREE.Vector3(0, 0, 0));
        invalidate();
      },
    };
    window.__quakestation = api;
    return () => {
      if (window.__quakestation === api) delete window.__quakestation;
    };
  }, [camera, gl, invalidate]);

  return null;
}
