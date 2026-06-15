"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { atmosphereFragment, atmosphereVertex } from "./shaders/earth";
import { sunDirection } from "@/lib/geo";

export function Atmosphere() {
  const ATMO_SCALE = 1.15;
  const uniforms = useMemo(
    () => ({
      uSunDirection: { value: sunDirection() },
      uPlanetRadius: { value: 1.0 },
      uAtmoRadius: { value: ATMO_SCALE },
    }),
    [],
  );
  return (
    <mesh scale={ATMO_SCALE}>
      <sphereGeometry args={[1, 96, 96]} />
      <shaderMaterial
        vertexShader={atmosphereVertex}
        fragmentShader={atmosphereFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.BackSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}
