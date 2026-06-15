"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { atmosphereFragment, atmosphereVertex } from "./shaders/earth";
import { sunDirection } from "@/lib/geo";

export function Atmosphere() {
  const uniforms = useMemo(
    () => ({
      uSunDirection: { value: sunDirection() },
    }),
    [],
  );
  return (
    <mesh scale={1.04}>
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
