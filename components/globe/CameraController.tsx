"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";
import { useGlobeStore } from "@/store/globeStore";
import { latLonToVec3 } from "@/lib/geo";

// Smooth camera fly-to. When `flyToTarget` is set in the store we ease
// the camera position toward a point at the same orbital distance but
// directly above the requested lat/lon, so the target ends up centred
// on screen. OrbitControls.update() is invoked each frame so its
// internal spherical coords stay in sync — once flight ends the user
// can grab and drag from the new vantage seamlessly.
export function CameraController() {
  const controlsRef = useRef<any>(null);
  const flyToTarget = useGlobeStore((s) => s.flyToTarget);
  const clearFlyTo = useGlobeStore((s) => s.clearFlyTo);
  const { camera } = useThree();

  useFrame((_, dt) => {
    if (!flyToTarget) return;
    const dist = camera.position.length();
    const target = latLonToVec3(flyToTarget.lat, flyToTarget.lon, dist);
    const k = Math.min(1, dt * 3.2);
    camera.position.lerp(target, k);
    camera.lookAt(0, 0, 0);
    if (controlsRef.current) controlsRef.current.update();
    if (camera.position.distanceTo(target) < 0.005) {
      camera.position.copy(target);
      camera.lookAt(0, 0, 0);
      controlsRef.current?.update();
      clearFlyTo();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.4}
      minDistance={1.4}
      maxDistance={6}
    />
  );
}
