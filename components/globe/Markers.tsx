"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Quake } from "@/lib/usgs";
import { latLonToVec3, facingOpacity } from "@/lib/geo";
import { magnitudeColor, rgbCss } from "@/lib/utils";
import { useGlobeStore } from "@/store/globeStore";
import { ringVertex, ringFragment, discRadius } from "./shaders/ring";

// Loose earthquakes (those not part of a swarm) render as ripple rings lying
// flat on the surface — a quad baked into world space in the tangent plane
// (disc normal = the radial axis), with the ripple drawn in the quad's UV
// space. So the rings hug the globe instead of billboarding at the camera.

const UP = new THREE.Vector3(0, 1, 0);
const ALT_UP = new THREE.Vector3(1, 0, 0);
const CORNERS: Array<[number, number, number, number]> = [
  [-1, -1, 0, 0],
  [1, -1, 1, 0],
  [1, 1, 1, 1],
  [-1, 1, 0, 1],
];

// Deterministic phase in [0,1) from a quake id (FNV-1a), so the ripple
// animation is stable across geometry rebuilds (replay) instead of strobing.
function stablePhase(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

export function Markers({ quakes }: { quakes: Quake[] }) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const focusQuake = useGlobeStore((s) => s.focusQuake);
  const labelMinMag = useGlobeStore((s) => s.labelMinMag);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const n = quakes.length;
    const positions = new Float32Array(n * 4 * 3);
    const uvs = new Float32Array(n * 4 * 2);
    const colors = new Float32Array(n * 4 * 3);
    const phases = new Float32Array(n * 4);
    const normals = new Float32Array(n * 4 * 3);
    const indices = new Uint32Array(n * 6);

    const nrm = new THREE.Vector3();
    const pos = new THREE.Vector3();
    const u = new THREE.Vector3();
    const v = new THREE.Vector3();

    quakes.forEach((q, i) => {
      nrm.copy(latLonToVec3(q.lat, q.lon, 1)).normalize();
      pos.copy(nrm).multiplyScalar(1.003);
      // Two axes spanning the tangent plane (perpendicular to the radial axis).
      u.crossVectors(nrm, Math.abs(nrm.y) > 0.95 ? ALT_UP : UP).normalize();
      v.crossVectors(nrm, u).normalize();
      const h = discRadius(q.mag);
      const phase = stablePhase(q.id);
      const [cr, cg, cb] = magnitudeColor(q.mag);
      CORNERS.forEach(([su, sv, tu, tv], c) => {
        const idx = i * 4 + c;
        positions[idx * 3] = pos.x + u.x * su * h + v.x * sv * h;
        positions[idx * 3 + 1] = pos.y + u.y * su * h + v.y * sv * h;
        positions[idx * 3 + 2] = pos.z + u.z * su * h + v.z * sv * h;
        uvs[idx * 2] = tu;
        uvs[idx * 2 + 1] = tv;
        colors[idx * 3] = cr;
        colors[idx * 3 + 1] = cg;
        colors[idx * 3 + 2] = cb;
        phases[idx] = phase;
        normals[idx * 3] = nrm.x;
        normals[idx * 3 + 1] = nrm.y;
        normals[idx * 3 + 2] = nrm.z;
      });
      const b = i * 4;
      indices.set([b, b + 1, b + 2, b, b + 2, b + 3], i * 6);
    });

    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
    g.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
    g.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
    g.setAttribute("aNormal", new THREE.BufferAttribute(normals, 3));
    g.setIndex(new THREE.BufferAttribute(indices, 1));
    g.computeBoundingSphere();
    return g;
  }, [quakes]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  // Fixed-size magnitude labels for quakes at or above the user's threshold.
  const labels = useMemo(
    () =>
      quakes
        .filter((q) => q.mag >= labelMinMag)
        .map((q) => {
          const dir = latLonToVec3(q.lat, q.lon, 1).normalize();
          return {
            id: q.id,
            mag: q.mag,
            dir,
            position: dir.clone().multiplyScalar(1.01).toArray() as [number, number, number],
          };
        }),
    [quakes, labelMinMag],
  );
  const labelRefs = useRef(new Map<string, HTMLDivElement>());
  const _labelPos = useRef(new THREE.Vector3());

  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);

  useFrame(({ clock, camera }) => {
    if (matRef.current) matRef.current.uniforms.uTime.value = clock.elapsedTime;
    // Fade labels out as their quake curves to the far side of the globe,
    // so numbers don't float through the sphere toward the camera.
    for (const l of labels) {
      const el = labelRefs.current.get(l.id);
      if (!el) continue;
      _labelPos.current.copy(l.dir).multiplyScalar(1.01);
      el.style.opacity = String(facingOpacity(l.dir, _labelPos.current, camera.position));
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    const f = e.faceIndex as number | undefined;
    if (f == null) return;
    // Two triangles per quad → quake index is faceIndex / 2.
    const q = quakes[Math.floor(f / 2)];
    if (q) focusQuake(q);
  };

  if (quakes.length === 0) return null;

  return (
    <>
      <mesh geometry={geometry} frustumCulled={false} onClick={handleClick}>
        <shaderMaterial
          ref={matRef}
          vertexShader={ringVertex}
          fragmentShader={ringFragment}
          uniforms={uniforms}
          transparent
          depthTest={false}
          depthWrite={false}
          blending={THREE.NormalBlending}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {labels.map((l) => (
        <Html key={l.id} position={l.position} center zIndexRange={[4, 0]}>
          <div
            ref={(el) => {
              if (el) labelRefs.current.set(l.id, el);
              else labelRefs.current.delete(l.id);
            }}
            className="pointer-events-none -translate-y-3 select-none whitespace-nowrap rounded-full border border-white/15 bg-ink-900/75 px-1.5 py-0.5 font-mono text-[10px] font-semibold backdrop-blur-sm"
            style={{ color: rgbCss(magnitudeColor(l.mag)) }}
          >
            M{l.mag.toFixed(1)}
          </div>
        </Html>
      ))}
    </>
  );
}
