"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Quake } from "@/lib/usgs";
import { latLonToVec3 } from "@/lib/geo";
import { magnitudeColor } from "@/lib/utils";
import { useGlobeStore } from "@/store/globeStore";
import { rippleVertex, rippleFragment, rippleSizePx } from "./shaders/ripple";

// Loose earthquakes (those not part of a swarm) render as ripple
// markers anchored on the surface. The shared ripple shader draws an
// epicentre dot + magnitude-scaled concentric rings. Swarm events use
// the same shader, stacked up a tower in SwarmSpines.

export function Markers({ quakes }: { quakes: Quake[] }) {
  const pointsRef = useRef<THREE.Points>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const focusQuake = useGlobeStore((s) => s.focusQuake);
  const { gl } = useThree();

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const n = quakes.length;
    const positions = new Float32Array(n * 3);
    const ripples = new Float32Array(n);
    const colors = new Float32Array(n * 3);
    const mags = new Float32Array(n);
    const phases = new Float32Array(n);
    quakes.forEach((q, i) => {
      const v = latLonToVec3(q.lat, q.lon, 1.003);
      positions[i * 3] = v.x;
      positions[i * 3 + 1] = v.y;
      positions[i * 3 + 2] = v.z;
      ripples[i] = rippleSizePx(q.mag);
      const [r, gC, b] = magnitudeColor(q.mag);
      colors[i * 3] = r;
      colors[i * 3 + 1] = gC;
      colors[i * 3 + 2] = b;
      mags[i] = q.mag;
      phases[i] = Math.random();
    });
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("aMaxRipplePx", new THREE.BufferAttribute(ripples, 1));
    g.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
    g.setAttribute("aMag", new THREE.BufferAttribute(mags, 1));
    g.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
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
      // Loose markers get headroom so the largest quakes read clearly bigger.
      uMaxSizePx: { value: 180 },
    }),
    [gl],
  );

  const handleClick = (e: any) => {
    e.stopPropagation();
    const i = e.index as number | undefined;
    if (i == null) return;
    const q = quakes[i];
    // Same behaviour as pills / swarm towers: select the event and fly the
    // camera to it.
    if (q) focusQuake(q);
  };

  if (quakes.length === 0) return null;

  return (
    <points ref={pointsRef} geometry={geometry} onClick={handleClick} frustumCulled={false}>
      <shaderMaterial
        ref={matRef}
        vertexShader={rippleVertex}
        fragmentShader={rippleFragment}
        uniforms={uniforms}
        transparent
        depthTest={false}
        depthWrite={false}
        blending={THREE.NormalBlending}
        toneMapped={false}
      />
    </points>
  );
}
