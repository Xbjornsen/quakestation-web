"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

// "N" / "S" badges pinned just off the globe's poles. They fade out as their
// pole curves to the far side, so the visible one always marks which way is
// north (or south) as the camera orbits.

const R = 1.06;
const NORTH = new THREE.Vector3(0, 1, 0);
const SOUTH = new THREE.Vector3(0, -1, 0);
const _pole = new THREE.Vector3();
const _toCam = new THREE.Vector3();

export function PoleMarkers() {
  const nRef = useRef<HTMLDivElement>(null);
  const sRef = useRef<HTMLDivElement>(null);

  useFrame(({ camera }) => {
    const pairs: Array<[React.RefObject<HTMLDivElement | null>, THREE.Vector3]> = [
      [nRef, NORTH],
      [sRef, SOUTH],
    ];
    for (const [ref, dir] of pairs) {
      const el = ref.current;
      if (!el) continue;
      _pole.copy(dir).multiplyScalar(R);
      _toCam.subVectors(camera.position, _pole).normalize();
      const facing = dir.dot(_toCam);
      el.style.opacity = String(THREE.MathUtils.clamp((facing + 0.05) / 0.35, 0, 1));
    }
  });

  return (
    <>
      <Html position={[0, R, 0]} center zIndexRange={[5, 0]}>
        <div
          ref={nRef}
          className="pointer-events-none grid h-6 w-6 select-none place-items-center rounded-full border border-accent-cyan/50 bg-ink-900/70 font-mono text-xs font-semibold text-accent-cyan backdrop-blur-sm"
        >
          N
        </div>
      </Html>
      <Html position={[0, -R, 0]} center zIndexRange={[5, 0]}>
        <div
          ref={sRef}
          className="pointer-events-none grid h-6 w-6 select-none place-items-center rounded-full border border-white/30 bg-ink-900/70 font-mono text-xs font-semibold text-white/70 backdrop-blur-sm"
        >
          S
        </div>
      </Html>
    </>
  );
}
