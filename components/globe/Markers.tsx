"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Quake } from "@/lib/usgs";
import { latLonToVec3 } from "@/lib/geo";
import { magnitudeColor } from "@/lib/utils";
import { useGlobeStore } from "@/store/globeStore";

// Each marker is a single Point sized so its quad covers (epicentre +
// the largest ripple). Inside the fragment shader we draw:
//
//   1) a small bright epicentre dot that's the same screen size for
//      every quake — that pinpoint is where it actually happened
//   2) up to three concentric rings expanding outward and fading,
//      staggered in phase so they read as a continuous pulse. Bigger
//      magnitudes get more rings *and* a larger maximum radius, so an
//      M7 occupies real estate while an M3 stays tight.
//
// The base point size encodes the maximum ripple radius in CSS pixels
// at the camera's default dolly; the vertex shader scales it by
// distance and devicePixelRatio.

const markerVertex = /* glsl */ `
  attribute float aMaxRipplePx;
  attribute vec3 aColor;
  attribute float aMag;
  uniform float uPixelRatio;
  varying vec3 vColor;
  varying float vMag;
  varying float vPointSizePx;

  void main() {
    vColor = aColor;
    vMag = aMag;
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    float size = aMaxRipplePx * uPixelRatio * (4.5 / -mvPos.z);
    float clamped = clamp(size, 14.0, 78.0);
    vPointSizePx = clamped;
    gl_PointSize = clamped;
    gl_Position = projectionMatrix * mvPos;
  }
`;

const markerFragment = /* glsl */ `
  precision highp float;
  varying vec3 vColor;
  varying float vMag;
  varying float vPointSizePx;
  uniform float uTime;

  // A thin ring at radius r, falling off smoothly to either side.
  float ring(float d, float r, float thickness) {
    return exp(-pow((d - r) / thickness, 2.0));
  }

  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float d = length(p) * 2.0; // 0 at centre, 1 at quad edge
    if (d > 1.0) discard;

    // Epicentre dot — always ~3.5px regardless of total size, so it
    // reads as a pinpoint location not a magnitude-scaled blob.
    float dotRadiusNorm = 4.0 / vPointSizePx;
    float edge = fwidth(d);
    float epicentre = 1.0 - smoothstep(dotRadiusNorm, dotRadiusNorm + edge * 2.5, d);

    // Ring thickness is also fixed in pixel terms (~1.5px) so big and
    // small markers have equally crisp rings — only the radii differ.
    float ringThickness = 2.4 / vPointSizePx;
    float ringStartR = dotRadiusNorm + 0.08;
    float speed = 0.42;

    float ringAlpha = 0.0;

    // Ring 1 — every visible quake gets one ripple
    {
      float t = fract(uTime * speed);
      float r = mix(ringStartR, 0.97, t);
      float fade = pow(1.0 - t, 1.3);
      ringAlpha += ring(d, r, ringThickness) * fade * 0.85;
    }

    // Ring 2 — magnitude ≥ 4.5
    if (vMag >= 4.5) {
      float t = fract(uTime * speed + 0.33);
      float r = mix(ringStartR, 0.97, t);
      float fade = pow(1.0 - t, 1.3);
      ringAlpha += ring(d, r, ringThickness) * fade * 0.8;
    }

    // Ring 3 — magnitude ≥ 6.0
    if (vMag >= 6.0) {
      float t = fract(uTime * speed + 0.66);
      float r = mix(ringStartR, 0.97, t);
      float fade = pow(1.0 - t, 1.3);
      ringAlpha += ring(d, r, ringThickness) * fade * 0.8;
    }

    float dotA = epicentre * 0.95;
    float ringA = clamp(ringAlpha, 0.0, 0.9);
    float a = max(dotA, ringA);
    if (a < 0.015) discard;

    // Epicentre slightly lighter so the centre still feels "hot"; rings
    // stay in the magnitude colour so they're easy to identify.
    vec3 col = mix(vColor, vec3(1.0), epicentre * 0.35);
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
    const ripples = new Float32Array(n);
    const colors = new Float32Array(n * 3);
    const mags = new Float32Array(n);
    quakes.forEach((q, i) => {
      const v = latLonToVec3(q.lat, q.lon, 1.003);
      positions[i * 3] = v.x;
      positions[i * 3 + 1] = v.y;
      positions[i * 3 + 2] = v.z;
      // Max ripple radius in CSS pixels at default dolly. Tuned so an
      // M3 is tight (~18px), M5 noticeable (~32px), M7 commanding
      // (~58px) — the difference reads at a glance.
      ripples[i] = Math.max(16, Math.pow(1.45, q.mag - 3) * 16);
      const [r, gC, b] = magnitudeColor(q.mag);
      colors[i * 3] = r;
      colors[i * 3 + 1] = gC;
      colors[i * 3 + 2] = b;
      mags[i] = q.mag;
    });
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("aMaxRipplePx", new THREE.BufferAttribute(ripples, 1));
    g.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
    g.setAttribute("aMag", new THREE.BufferAttribute(mags, 1));
    g.computeBoundingSphere();
    return g;
  }, [quakes]);

  useEffect(() => () => geometry.dispose(), [geometry]);

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
