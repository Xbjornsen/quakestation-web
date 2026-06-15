"use client";

import { useFrame, useLoader } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { earthFragment, earthVertex } from "./shaders/earth";
import { sunDirection } from "@/lib/geo";

const DAY = "/textures/earth_day_4k.jpg";
const NIGHT = "/textures/earth_night_4k.jpg";
const SPEC = "/textures/earth_spec_2k.jpg";

function tryLoad(url: string): THREE.Texture | null {
  try {
    // useLoader will suspend; we handle missing via ErrorBoundary in parent
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const tex = useLoader(THREE.TextureLoader, url);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  } catch {
    return null;
  }
}

export function Earth() {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  // Texture loading is best-effort; if files are missing we render the procedural fallback.
  let dayMap: THREE.Texture | null = null;
  let nightMap: THREE.Texture | null = null;
  let specMap: THREE.Texture | null = null;
  try {
    dayMap = tryLoad(DAY);
    nightMap = tryLoad(NIGHT);
    specMap = tryLoad(SPEC);
  } catch {
    // suspense fallback path
  }

  const uniforms = useMemo(
    () => ({
      uDayMap: { value: dayMap },
      uNightMap: { value: nightMap },
      uSpecMap: { value: specMap },
      uSunDirection: { value: sunDirection() },
      uHasMaps: { value: dayMap && nightMap && specMap ? 1.0 : 0.0 },
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
