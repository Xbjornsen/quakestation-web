"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Quake } from "@/lib/usgs";
import { latLonToVec3 } from "@/lib/geo";
import { magnitudeColor } from "@/lib/utils";
import { useGlobeStore } from "@/store/globeStore";

const markerVertex = /* glsl */ `
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aPulsePhase;
  uniform float uTime;
  uniform float uPixelRatio;
  varying vec3 vColor;
  void main() {
    vColor = aColor;
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    float pulse = 0.95 + 0.1 * sin(uTime * 2.0 + aPulsePhase);
    float size = aSize * pulse * uPixelRatio * (6.5 / -mvPos.z);
    // Cap below typical GPU max gl_PointSize (often 64) to avoid the
    // smearing/clipping artefacts that appear when WebGL silently
    // truncates oversize points.
    gl_PointSize = min(size, 48.0);
    gl_Position = projectionMatrix * mvPos;
  }
`;

const markerFragment = /* glsl */ `
  precision highp float;
  varying vec3 vColor;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c) * 2.0;
    if (d > 1.0) discard;

    // Tight bright core, then a soft falloff to the edge.
    float core = smoothstep(0.55, 0.05, d);
    float halo = smoothstep(1.0, 0.55, d) * 0.45;
    float a = clamp(core + halo, 0.0, 0.95);

    vec3 col = mix(vColor, mix(vColor, vec3(1.0), 0.7), smoothstep(0.4, 0.0, d));
    gl_FragColor = vec4(col, a);
  }
`;

export function Markers({ quakes }: { quakes: Quake[] }) {
  const pointsRef = useRef<THREE.Points>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const setSelected = useGlobeStore((s) => s.setSelected);
  const { gl } = useThree();

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const n = quakes.length;
    const positions = new Float32Array(n * 3);
    const sizes = new Float32Array(n);
    const colors = new Float32Array(n * 3);
    const phases = new Float32Array(n);
    quakes.forEach((q, i) => {
      const v = latLonToVec3(q.lat, q.lon, 1.003);
      positions[i * 3] = v.x;
      positions[i * 3 + 1] = v.y;
      positions[i * 3 + 2] = v.z;
      sizes[i] = Math.max(4, Math.pow(1.35, q.mag - 3) * 4);
      const [r, gC, b] = magnitudeColor(q.mag);
      colors[i * 3] = r;
      colors[i * 3 + 1] = gC;
      colors[i * 3 + 2] = b;
      phases[i] = Math.random() * Math.PI * 2;
    });
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    g.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
    g.setAttribute("aPulsePhase", new THREE.BufferAttribute(phases, 1));
    g.computeBoundingSphere();
    return g;
  }, [quakes]);

  useEffect(() => {
    return () => geometry.dispose();
  }, [geometry]);

  useFrame(({ clock }) => {
    if (!matRef.current) return;
    matRef.current.uniforms.uTime.value = clock.elapsedTime;
  });

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(gl.getPixelRatio(), 2) },
    }),
    [gl],
  );

  const handleClick = (e: any) => {
    e.stopPropagation();
    const i = e.index as number | undefined;
    if (i == null) return;
    setSelected(quakes[i] ?? null);
  };

  if (quakes.length === 0) return null;

  return (
    <points ref={pointsRef} geometry={geometry} onClick={handleClick} frustumCulled={false}>
      <shaderMaterial
        ref={matRef}
        vertexShader={markerVertex}
        fragmentShader={markerFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.NormalBlending}
        toneMapped={false}
      />
    </points>
  );
}
