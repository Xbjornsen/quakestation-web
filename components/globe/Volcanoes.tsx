"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { latLonToVec3 } from "@/lib/geo";
import { loadVolcanoes, type Volcano } from "@/lib/features";
import { useGlobeStore } from "@/store/globeStore";

// Significant Holocene volcanoes drawn as small orange cones standing up
// along the surface normal. One InstancedMesh keeps this to a single
// draw call. Cones are opaque with depthTest on, so the globe naturally
// occludes the ones on the far hemisphere — no shader cull needed.

const CONE_BASE = 1.001; // where the base of the cone meets the surface
const CONE_HEIGHT = 0.028;
const CONE_RADIUS = 0.011;

const UP = new THREE.Vector3(0, 1, 0);
const TMP_OBJ = new THREE.Object3D();
const TMP_QUAT = new THREE.Quaternion();
const COLOR = new THREE.Color("#ff7a2f");
const COLOR_HOVER = new THREE.Color("#ffb066");

export function Volcanoes() {
  const [volcanoes, setVolcanoes] = useState<Volcano[]>([]);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const focusFeature = useGlobeStore((s) => s.focusFeature);
  const [hovered, setHovered] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadVolcanoes()
      .then((v) => {
        if (!cancelled) setVolcanoes(v);
      })
      .catch((err) => console.error("Failed to load volcanoes", err));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || volcanoes.length === 0) return;
    volcanoes.forEach((v, i) => {
      const dir = latLonToVec3(v.lat, v.lon, 1).normalize();
      // Place the cone so its base sits on the surface and it points up.
      const base = dir.clone().multiplyScalar(CONE_BASE);
      const centre = base.add(dir.clone().multiplyScalar(CONE_HEIGHT / 2));
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
    mesh.count = volcanoes.length;
  }, [volcanoes]);

  // Recolour the hovered instance.
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || volcanoes.length === 0) return;
    volcanoes.forEach((_, i) => {
      mesh.setColorAt(i, i === hovered ? COLOR_HOVER : COLOR);
    });
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [hovered, volcanoes]);

  const handleClick = (e: any) => {
    e.stopPropagation();
    const i = e.instanceId as number | undefined;
    if (i == null) return;
    const v = volcanoes[i];
    if (v) focusFeature({ kind: "volcano", data: v });
  };

  const onMove = (e: any) => {
    e.stopPropagation();
    setHovered(e.instanceId ?? null);
  };
  const onOut = () => setHovered(null);

  const count = useMemo(() => Math.max(1, volcanoes.length), [volcanoes.length]);

  if (volcanoes.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, count]}
      frustumCulled={false}
      onClick={handleClick}
      onPointerMove={onMove}
      onPointerOut={onOut}
    >
      <coneGeometry args={[CONE_RADIUS, CONE_HEIGHT, 12]} />
      <meshStandardMaterial
        emissive={COLOR}
        emissiveIntensity={0.55}
        roughness={0.5}
        metalness={0.0}
        toneMapped={false}
      />
    </instancedMesh>
  );
}
