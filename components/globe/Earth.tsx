"use client";

import { useFrame, useLoader } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { earthFragment, earthVertex } from "./shaders/earth";
import { sunDirection } from "@/lib/geo";

const DAY = "/textures/earth_day.jpg";
const NIGHT = "/textures/earth_night.jpg";
const SPEC = "/textures/earth_spec.jpg";

export function Earth() {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const [dayMap, nightMap, specMap] = useLoader(THREE.TextureLoader, [DAY, NIGHT, SPEC]);
  dayMap.colorSpace = THREE.SRGBColorSpace;
  nightMap.colorSpace = THREE.SRGBColorSpace;
  specMap.colorSpace = THREE.NoColorSpace;
  dayMap.anisotropy = 8;
  nightMap.anisotropy = 8;

  const uniforms = useMemo(
    () => ({
      uDayMap: { value: dayMap },
      uNightMap: { value: nightMap },
      uSpecMap: { value: specMap },
      uSunDirection: { value: sunDirection() },
      uHasMaps: { value: 1.0 },
    }),
    [dayMap, nightMap, specMap],
  );

  useFrame(({ clock }) => {
    if (!matRef.current) return;
    if (clock.elapsedTime % 1 < 0.02) {
      (matRef.current.uniforms.uSunDirection.value as THREE.Vector3).copy(sunDirection());
    }
  });

  return (
    <mesh>
      <sphereGeometry args={[1, 256, 256]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={earthVertex}
        fragmentShader={earthFragment}
        uniforms={uniforms}
      />
    </mesh>
  );
}
