"use client";

import { useFrame, useLoader } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { sunDirection } from "@/lib/geo";

const CLOUDS = "/textures/earth_clouds.png";

const cloudsVertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  void main() {
    vUv = uv;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const cloudsFragment = /* glsl */ `
  precision highp float;
  uniform sampler2D uMap;
  uniform vec3 uSunDirection;
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  void main() {
    float a = texture2D(uMap, vUv).r;
    if (a < 0.04) discard;
    float lit = clamp(dot(normalize(vWorldNormal), normalize(uSunDirection)) * 0.5 + 0.5, 0.0, 1.0);
    vec3 color = mix(vec3(0.35, 0.4, 0.5), vec3(1.0, 0.98, 0.95), smoothstep(0.0, 0.7, lit));
    gl_FragColor = vec4(color, a * 0.7);
  }
`;

export function Clouds() {
  const meshRef = useRef<THREE.Mesh>(null);
  const tex = useLoader(THREE.TextureLoader, CLOUDS);
  tex.colorSpace = THREE.NoColorSpace;
  tex.anisotropy = 8;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;

  const uniforms = useMemo(
    () => ({
      uMap: { value: tex },
      uSunDirection: { value: sunDirection() },
    }),
    [tex],
  );

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y += delta * 0.008;
    (uniforms.uSunDirection.value as THREE.Vector3).copy(sunDirection());
  });

  return (
    <mesh ref={meshRef} scale={1.012}>
      <sphereGeometry args={[1, 96, 96]} />
      <shaderMaterial
        vertexShader={cloudsVertex}
        fragmentShader={cloudsFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}
