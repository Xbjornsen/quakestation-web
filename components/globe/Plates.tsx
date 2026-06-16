"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { latLonToVec3 } from "@/lib/geo";
import { loadPlateBoundaries, type PlateBoundary } from "@/lib/features";

// Tectonic plate boundaries (simplified PB2002) drawn as a single
// LineSegments geometry sitting just above the surface. A small custom
// shader fades the lines out on the far hemisphere (same horizon-cull
// trick as the swarm stems) so they never bleed through the globe, and
// gives them a subtle amber glow that brightens toward the camera.

const PLATE_RADIUS = 1.0015;

const plateVertex = /* glsl */ `
  varying float vFacing;
  void main() {
    vec3 worldPos = (modelMatrix * vec4(position, 1.0)).xyz;
    vec3 toCam = normalize(cameraPosition - worldPos);
    vFacing = dot(normalize(worldPos), toCam);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const plateFragment = /* glsl */ `
  precision highp float;
  varying float vFacing;
  uniform vec3 uColor;
  uniform float uOpacity;
  void main() {
    if (vFacing < 0.0) discard;
    float fade = smoothstep(0.0, 0.18, vFacing);
    gl_FragColor = vec4(uColor, uOpacity * fade);
  }
`;

function buildSegmentsGeometry(boundaries: PlateBoundary[]): THREE.BufferGeometry {
  const verts: number[] = [];
  for (const b of boundaries) {
    const coords = b.coordinates;
    for (let i = 0; i < coords.length - 1; i++) {
      const a = latLonToVec3(coords[i][1], coords[i][0], PLATE_RADIUS);
      const c = latLonToVec3(coords[i + 1][1], coords[i + 1][0], PLATE_RADIUS);
      verts.push(a.x, a.y, a.z, c.x, c.y, c.z);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(verts), 3));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), PLATE_RADIUS + 0.01);
  return g;
}

export function Plates() {
  const [boundaries, setBoundaries] = useState<PlateBoundary[] | null>(null);
  const lineRef = useRef<THREE.LineSegments>(null);

  useEffect(() => {
    let cancelled = false;
    loadPlateBoundaries()
      .then((b) => {
        if (!cancelled) setBoundaries(b);
      })
      .catch((err) => console.error("Failed to load plate boundaries", err));
    return () => {
      cancelled = true;
    };
  }, []);

  const geometry = useMemo(
    () => (boundaries ? buildSegmentsGeometry(boundaries) : null),
    [boundaries],
  );

  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(1.0, 0.62, 0.25) },
      uOpacity: { value: 0.55 },
    }),
    [],
  );

  useEffect(() => () => geometry?.dispose(), [geometry]);

  if (!geometry) return null;

  return (
    <lineSegments ref={lineRef} geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        vertexShader={plateVertex}
        fragmentShader={plateFragment}
        uniforms={uniforms}
        transparent
        depthTest={false}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </lineSegments>
  );
}
