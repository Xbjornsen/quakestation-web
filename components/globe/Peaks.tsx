"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { latLonToVec3 } from "@/lib/geo";
import { loadPeaks, type Peak } from "@/lib/features";
import { useGlobeStore } from "@/store/globeStore";

// Iconic mountains drawn as small pale pyramids standing on the surface.
// Visually distinct from the orange volcano cones: white/pale and a
// sharper, smaller four-sided pyramid. One InstancedMesh, opaque with
// depthTest on so the globe occludes the far-side peaks.

const BASE = 1.001;
const HEIGHT = 0.022;
const RADIUS = 0.009;

const UP = new THREE.Vector3(0, 1, 0);
const TMP_OBJ = new THREE.Object3D();
const TMP_QUAT = new THREE.Quaternion();
const COLOR = new THREE.Color("#e8eef7");
const COLOR_HOVER = new THREE.Color("#67e8f9"); // cyan accent on hover

export function Peaks() {
  const [peaks, setPeaks] = useState<Peak[]>([]);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const focusFeature = useGlobeStore((s) => s.focusFeature);
  const [hovered, setHovered] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadPeaks()
      .then((p) => {
        if (!cancelled) setPeaks(p);
      })
      .catch((err) => console.error("Failed to load peaks", err));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || peaks.length === 0) return;
    peaks.forEach((p, i) => {
      const dir = latLonToVec3(p.lat, p.lon, 1).normalize();
      const base = dir.clone().multiplyScalar(BASE);
      const centre = base.add(dir.clone().multiplyScalar(HEIGHT / 2));
      TMP_QUAT.setFromUnitVectors(UP, dir);
      TMP_OBJ.position.copy(centre);
      TMP_OBJ.quaternion.copy(TMP_QUAT);
      TMP_OBJ.scale.set(1, 1, 1);
      TMP_OBJ.updateMatrix();
      mesh.setMatrixAt(i, TMP_OBJ.matrix);
      mesh.setColorAt(i, COLOR);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.count = peaks.length;
  }, [peaks]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || peaks.length === 0) return;
    peaks.forEach((_, i) => {
      mesh.setColorAt(i, i === hovered ? COLOR_HOVER : COLOR);
    });
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [hovered, peaks]);

  const handleClick = (e: any) => {
    e.stopPropagation();
    const i = e.instanceId as number | undefined;
    if (i == null) return;
    const p = peaks[i];
    if (p) focusFeature({ kind: "peak", data: p });
  };

  const onMove = (e: any) => {
    e.stopPropagation();
    setHovered(e.instanceId ?? null);
  };
  const onOut = () => setHovered(null);

  const count = useMemo(() => Math.max(1, peaks.length), [peaks.length]);

  if (peaks.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, count]}
      frustumCulled={false}
      onClick={handleClick}
      onPointerMove={onMove}
      onPointerOut={onOut}
    >
      {/* 4-sided pyramid: a cone with 4 radial segments. */}
      <coneGeometry args={[RADIUS, HEIGHT, 4]} />
      <meshStandardMaterial
        emissive={COLOR}
        emissiveIntensity={0.4}
        roughness={0.6}
        metalness={0.0}
        toneMapped={false}
      />
    </instancedMesh>
  );
}
