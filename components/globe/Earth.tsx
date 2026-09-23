"use client";

import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { earthFragment, earthVertex } from "./shaders/earth";
import { sunDirection } from "@/lib/geo";

const SPEC = "/textures/earth_spec.jpg";

// The 8K day/night maps are ~7.7 MB together and 8192px wide — larger than
// many phones' GL_MAX_TEXTURE_SIZE (often 4096), where three.js would decode
// the full image and then downscale it on the CPU anyway. Pick the 4K set
// (~1/4 the pixels) unless the GPU supports 8K *and* the screen is big enough
// to show the difference *and* the user hasn't asked to save data.
function pickTextureSet(maxTextureSize: number): { day: string; night: string } {
  const saveData =
    (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData ===
    true;
  const bigScreen = window.matchMedia("(min-width: 1024px)").matches;
  const hiRes = maxTextureSize >= 8192 && bigScreen && !saveData;
  return hiRes
    ? { day: "/textures/earth_day.jpg", night: "/textures/earth_night.jpg" }
    : { day: "/textures/earth_day_4k.jpg", night: "/textures/earth_night_4k.jpg" };
}

export function Earth({ segments = 512 }: { segments?: number }) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const { gl } = useThree();
  const maxAniso = gl.capabilities.getMaxAnisotropy();

  // Decided once per mount; useLoader caches by URL so this must be stable.
  const [{ day, night }] = useState(() => pickTextureSet(gl.capabilities.maxTextureSize));
  const [dayMap, nightMap, specMap] = useLoader(THREE.TextureLoader, [day, night, SPEC]);
  dayMap.colorSpace = THREE.SRGBColorSpace;
  nightMap.colorSpace = THREE.SRGBColorSpace;
  specMap.colorSpace = THREE.NoColorSpace;
  // Use the GPU's max anisotropic filtering so the texture stays sharp
  // at oblique angles (poles, terminator) and trilinear mipmap sampling
  // so it's clean at every zoom level without aliasing.
  for (const t of [dayMap, nightMap, specMap]) {
    t.anisotropy = maxAniso;
    t.minFilter = THREE.LinearMipMapLinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.generateMipmaps = true;
  }

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
      <sphereGeometry args={[1, segments, segments]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={earthVertex}
        fragmentShader={earthFragment}
        uniforms={uniforms}
      />
    </mesh>
  );
}
