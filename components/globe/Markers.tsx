"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Quake } from "@/lib/usgs";
import { latLonToVec3 } from "@/lib/geo";
import { magnitudeColor } from "@/lib/utils";
import { useGlobeStore } from "@/store/globeStore";

const TMP_OBJECT = new THREE.Object3D();

export function Markers({ quakes }: { quakes: Quake[] }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const setSelected = useGlobeStore((s) => s.setSelected);

  const count = quakes.length;

  const data = useMemo(() => {
    return quakes.map((q) => {
      const pos = latLonToVec3(q.lat, q.lon, 1.005);
      const scale = Math.max(0.014, Math.pow(1.7, q.mag - 3) * 0.014);
      const [r, g, b] = magnitudeColor(q.mag);
      return { pos, scale, color: new THREE.Color(r, g, b) };
    });
  }, [quakes]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || count === 0) return;

    data.forEach((d, i) => {
      TMP_OBJECT.position.copy(d.pos);
      TMP_OBJECT.lookAt(0, 0, 0);
      TMP_OBJECT.scale.setScalar(d.scale);
      TMP_OBJECT.updateMatrix();
      mesh.setMatrixAt(i, TMP_OBJECT.matrix);
      mesh.setColorAt(i, d.color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.count = count;
  }, [data, count]);

  useFrame(({ clock }) => {
    if (!meshRef.current || count === 0) return;
    const t = clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      const d = data[i];
      const pulse = 1 + Math.sin(t * 2 + i * 0.7) * 0.2 * Math.min(1, d.scale * 25);
      TMP_OBJECT.position.copy(d.pos);
      TMP_OBJECT.lookAt(0, 0, 0);
      TMP_OBJECT.scale.setScalar(d.scale * pulse);
      TMP_OBJECT.updateMatrix();
      meshRef.current.setMatrixAt(i, TMP_OBJECT.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    const i = e.instanceId as number | undefined;
    if (i == null) return;
    setSelected(quakes[i] ?? null);
  };

  if (count === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, count]}
      onClick={handleClick}
      frustumCulled={false}
    >
      <sphereGeometry args={[1, 16, 16]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}
