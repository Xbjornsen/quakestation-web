"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { latLonToVec3 } from "@/lib/geo";
import { useGlobeStore } from "@/store/globeStore";
import { heatmapVertex, heatmapFragment, heatWeight } from "./shaders/heatmap";

// Seismic density heatmap. Renders every quake (loose + swarm members) as an
// additive glow splat hovering just above the surface, below the ripple
// markers. The accumulation of overlapping splats reveals where activity
// concentrates without drawing 2000 individual dots.

export function Heatmap() {
  const quakes = useGlobeStore((s) => s.quakes);
  const { gl } = useThree();

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const n = quakes.length;
    const positions = new Float32Array(n * 3);
    const weights = new Float32Array(n);
    quakes.forEach((q, i) => {
      // Sit between the surface and the ripple markers (1.003).
      const v = latLonToVec3(q.lat, q.lon, 1.0015);
      positions[i * 3] = v.x;
      positions[i * 3 + 1] = v.y;
      positions[i * 3 + 2] = v.z;
      weights[i] = heatWeight(q.mag);
    });
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("aWeight", new THREE.BufferAttribute(weights, 1));
    g.computeBoundingSphere();
    return g;
  }, [quakes]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(
    () => ({
      uPixelRatio: { value: Math.min(gl.getPixelRatio(), 2) },
      uRadiusPx: { value: 26 },
      uIntensity: { value: 0.42 },
      uColor: { value: new THREE.Color(1.0, 0.45, 0.16) },
    }),
    [gl],
  );

  if (quakes.length === 0) return null;

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        vertexShader={heatmapVertex}
        fragmentShader={heatmapFragment}
        uniforms={uniforms}
        transparent
        depthTest={false}
        depthWrite={false}
        blending={THREE.CustomBlending}
        blendEquation={THREE.AddEquation}
        blendSrc={THREE.OneFactor}
        blendDst={THREE.OneFactor}
      />
    </points>
  );
}
