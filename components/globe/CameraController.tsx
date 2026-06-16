"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useGlobeStore } from "@/store/globeStore";
import { latLonToVec3 } from "@/lib/geo";

// Smooth fly-to that *rotates* the camera around the origin instead of
// translating it through space. We capture the orbital distance at the
// moment the fly starts, then each frame slerp the camera's unit
// direction toward the target's unit direction and rescale to that
// fixed distance. The user keeps whatever zoom they had before clicking
// the pill — no surprise dolly-in.
export function CameraController() {
  const controlsRef = useRef<any>(null);
  const flyToTarget = useGlobeStore((s) => s.flyToTarget);
  const clearFlyTo = useGlobeStore((s) => s.clearFlyTo);
  const autoRotate = useGlobeStore((s) => s.autoRotate);
  const { camera } = useThree();

  const flightRef = useRef<{ dist: number; target: THREE.Vector3 } | null>(null);

  // Capture the orbital distance once at the start of each fly, and
  // pre-compute the target direction as a unit vector.
  useEffect(() => {
    if (flyToTarget) {
      flightRef.current = {
        dist: camera.position.length(),
        target: latLonToVec3(flyToTarget.lat, flyToTarget.lon, 1),
      };
    } else {
      flightRef.current = null;
    }
  }, [flyToTarget, camera]);

  useFrame((_, dt) => {
    const flight = flightRef.current;
    if (!flight) return;

    const currentDir = camera.position.clone().normalize();
    const k = Math.min(1, dt * 3.2);

    // Direction-only lerp: normalise after the linear step so the
    // intermediate vectors stay on the unit sphere.
    const nextDir = currentDir.lerp(flight.target, k).normalize();
    camera.position.copy(nextDir).multiplyScalar(flight.dist);
    camera.lookAt(0, 0, 0);
    controlsRef.current?.update();

    const angle = currentDir.angleTo(flight.target);
    if (angle < 0.002) {
      camera.position.copy(flight.target).multiplyScalar(flight.dist);
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
      // Pause auto-rotation during a fly-to so the two don't fight.
      autoRotate={autoRotate && !flyToTarget}
      autoRotateSpeed={0.35}
    />
  );
}
