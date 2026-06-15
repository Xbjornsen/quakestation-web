"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Quake } from "@/lib/usgs";
import { latLonToVec3 } from "@/lib/geo";
import { magnitudeColor } from "@/lib/utils";
import { useGlobeStore } from "@/store/globeStore";

// Cleaner marker design: a flat coloured disc with a thin dark outline,
// always facing the camera. Reads like a real map pin instead of a
// glowing bubble. Larger magnitudes get a slowly-expanding ring "ping"
// to draw the eye without obscuring the surface.
const markerVertex = /* glsl */ `
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aMag;
  uniform float uPixelRatio;
  varying vec3 vColor;
  varying float vMag;
  void main() {
    vColor = aColor;
    vMag = aMag;
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    float size = aSize * uPixelRatio * (6.5 / -mvPos.z);
    gl_PointSize = clamp(size, 4.0, 46.0);
    gl_Position = projectionMatrix * mvPos;
  }
`;

const markerFragment = /* glsl */ `
  precision highp float;
  varying vec3 vColor;
  varying float vMag;
  uniform float uTime;
  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float d = length(p) * 2.0;

    // Anti-aliased disc edge using screen-space derivatives so it stays
    // crisp at any zoom level without being a single hard pixel.
    float edge = fwidth(d) * 1.5;
    float disc = 1.0 - smoothstep(1.0 - edge, 1.0, d);
    if (disc < 0.01) discard;

    // Thin darker outline ring near the disc's edge.
    float outlineBand = smoothstep(0.78, 0.92, d) * (1.0 - smoothstep(0.92, 1.0, d));
    vec3 outlineCol = vColor * 0.22;
    vec3 fillCol = vColor;
    vec3 col = mix(fillCol, outlineCol, outlineBand);

    // Sonar-style outward ping for M5+ events.
    float a = disc;
    if (vMag >= 5.0) {
      float t = fract(uTime * 0.6);
      float ringRadius = mix(0.55, 1.6, t);
      float ringBand = exp(-pow((d - ringRadius) * 6.0, 2.0)) * (1.0 - t);
      a = max(a, ringBand * 0.6);
      col = mix(col, vColor, ringBand);
    }

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
    const mags = new Float32Array(n);
    quakes.forEach((q, i) => {
      const v = latLonToVec3(q.lat, q.lon, 1.003);
      positions[i * 3] = v.x;
      positions[i * 3 + 1] = v.y;
      positions[i * 3 + 2] = v.z;
      sizes[i] = Math.max(5, Math.pow(1.4, q.mag - 3) * 5);
      const [r, gC, b] = magnitudeColor(q.mag);
      colors[i * 3] = r;
      colors[i * 3 + 1] = gC;
      colors[i * 3 + 2] = b;
      mags[i] = q.mag;
    });
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    g.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
    g.setAttribute("aMag", new THREE.BufferAttribute(mags, 1));
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
