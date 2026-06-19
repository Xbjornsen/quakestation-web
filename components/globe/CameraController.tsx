"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useGlobeStore } from "@/store/globeStore";
import { latLonToVec3 } from "@/lib/geo";

// Fixed wall-clock duration of a fly-to (seconds).
const FLY_DURATION = 0.9;

// Spherical-lerp between two unit direction vectors.
function slerpDir(a: THREE.Vector3, b: THREE.Vector3, t: number, out: THREE.Vector3): THREE.Vector3 {
  const dot = THREE.MathUtils.clamp(a.dot(b), -1, 1);
  if (dot > 0.9999) return out.copy(b); // already aligned
  const theta = Math.acos(dot) * t;
  // Component of b orthogonal to a, normalised.
  out.copy(b).addScaledVector(a, -dot).normalize();
  return out.multiplyScalar(Math.sin(theta)).addScaledVector(a, Math.cos(theta));
}

// Smooth fly-to that *rotates* the camera around the origin (keeping the
// user's current zoom). The flight is driven by a progress counter so it
// always finishes after FLY_DURATION and hands control back to OrbitControls —
// no asymptotic loop that could fight the user's drag.
export function CameraController() {
  const controlsRef = useRef<any>(null);
  const flyToTarget = useGlobeStore((s) => s.flyToTarget);
  const clearFlyTo = useGlobeStore((s) => s.clearFlyTo);
  const autoRotate = useGlobeStore((s) => s.autoRotate);
  const autoRotateSpeed = useGlobeStore((s) => s.autoRotateSpeed);
  const { camera } = useThree();

  const flightRef = useRef<{
    start: THREE.Vector3;
    target: THREE.Vector3;
    dist: number;
    p: number;
  } | null>(null);

  useEffect(() => {
    if (flyToTarget) {
      flightRef.current = {
        start: camera.position.clone().normalize(),
        target: latLonToVec3(flyToTarget.lat, flyToTarget.lon, 1).normalize(),
        dist: camera.position.length(),
        p: 0,
      };
    } else {
      flightRef.current = null;
    }
  }, [flyToTarget, camera]);

  const dirRef = useRef(new THREE.Vector3());

  useFrame((_, dt) => {
    const f = flightRef.current;
    if (!f) return;

    f.p = Math.min(1, f.p + dt / FLY_DURATION);
    // easeInOutQuad
    const e = f.p < 0.5 ? 2 * f.p * f.p : 1 - Math.pow(-2 * f.p + 2, 2) / 2;

    const dir = slerpDir(f.start, f.target, e, dirRef.current);
    camera.position.copy(dir).multiplyScalar(f.dist);
    camera.lookAt(0, 0, 0);
    controlsRef.current?.update();

    if (f.p >= 1) {
      camera.position.copy(f.target).multiplyScalar(f.dist);
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
      autoRotateSpeed={autoRotateSpeed}
    />
  );
}
