"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  latLonToVec3,
  facingOpacity,
  interpolatePolePosition,
  buildLineSegmentsGeometry,
  createHorizonFadeMaterial,
  buildPoleTrail,
  makePoleInfo,
} from "@/lib/geo";
import { loadMagneticPoles, type MagneticPoles } from "@/lib/features";
import { useGlobeStore } from "@/store/globeStore";

// Unlabeled violet dots marking the geomagnetic poles — the poles of the
// idealized dipole model of Earth's field. Deliberately styled differently
// from PoleMarkers' lettered "N"/"S" badges (which track the magnetic dip
// poles) so the two distinct concepts never get visually confused; this
// layer is optional and off by default. Same trail/tick/click treatment as
// PoleMarkers — see that file for the historical-vs-predicted rationale.

const DOT_R = 1.05;
const TRAIL_R = 1.0025;
const TICK_SCALE = 0.006;
const COLOR = new THREE.Color(0.68, 0.45, 0.98);

const _tickObj = new THREE.Object3D();

function applyTicks(mesh: THREE.InstancedMesh | null, points: THREE.Vector3[]) {
  if (!mesh) return;
  points.forEach((p, i) => {
    _tickObj.position.copy(p);
    _tickObj.scale.setScalar(TICK_SCALE);
    _tickObj.updateMatrix();
    mesh.setMatrixAt(i, _tickObj.matrix);
  });
  mesh.count = points.length;
  mesh.instanceMatrix.needsUpdate = true;
}

export function GeomagneticPoles() {
  const [poles, setPoles] = useState<MagneticPoles | null>(null);
  const nRef = useRef<HTMLDivElement>(null);
  const sRef = useRef<HTMLDivElement>(null);
  const tickRef = useRef<THREE.InstancedMesh>(null);
  const focusFeature = useGlobeStore((s) => s.focusFeature);

  useEffect(() => {
    let cancelled = false;
    loadMagneticPoles()
      .then((p) => {
        if (!cancelled) setPoles(p);
      })
      .catch((err) => console.error("Failed to load magnetic pole data", err));
    return () => {
      cancelled = true;
    };
  }, []);

  const derived = useMemo(() => {
    if (!poles) return null;
    const now = new Date();
    const year = now.getFullYear();
    const north = interpolatePolePosition(poles.northGeomagnetic, now);
    const south = interpolatePolePosition(poles.southGeomagnetic, now);
    const northDir = latLonToVec3(north.lat, north.lon, 1).normalize();
    const southDir = latLonToVec3(south.lat, south.lon, 1).normalize();
    return {
      year,
      north,
      south,
      northDir,
      southDir,
      northPos: northDir.clone().multiplyScalar(DOT_R),
      southPos: southDir.clone().multiplyScalar(DOT_R),
      northTrail: buildPoleTrail(poles.northGeomagnetic, north, now, TRAIL_R),
      southTrail: buildPoleTrail(poles.southGeomagnetic, south, now, TRAIL_R),
    };
  }, [poles]);

  const histGeometry = useMemo(
    () =>
      derived
        ? buildLineSegmentsGeometry([derived.northTrail.historical, derived.southTrail.historical], TRAIL_R)
        : null,
    [derived],
  );
  const predGeometry = useMemo(() => {
    if (!derived) return null;
    const lines = [derived.northTrail.predicted, derived.southTrail.predicted].filter((l) => l.length > 0);
    return lines.length > 0 ? buildLineSegmentsGeometry(lines, TRAIL_R) : null;
  }, [derived]);

  // Normal blending keeps the violet visible over bright polar ice instead
  // of additively washing out to white (see PoleMarkers for the same fix).
  const histMaterial = useMemo(() => createHorizonFadeMaterial(COLOR, 0.55, THREE.NormalBlending), []);
  const predMaterial = useMemo(() => createHorizonFadeMaterial(COLOR, 0.22, THREE.NormalBlending), []);

  useEffect(() => () => histGeometry?.dispose(), [histGeometry]);
  useEffect(() => () => predGeometry?.dispose(), [predGeometry]);
  useEffect(() => () => histMaterial.dispose(), [histMaterial]);
  useEffect(() => () => predMaterial.dispose(), [predMaterial]);

  useEffect(() => {
    if (!derived) return;
    applyTicks(tickRef.current, [...derived.northTrail.epochTicks, ...derived.southTrail.epochTicks]);
  }, [derived]);

  useFrame(({ camera }) => {
    if (!derived) return;
    const pairs: Array<[React.RefObject<HTMLDivElement | null>, THREE.Vector3, THREE.Vector3]> = [
      [nRef, derived.northDir, derived.northPos],
      [sRef, derived.southDir, derived.southPos],
    ];
    for (const [ref, dir, pos] of pairs) {
      const el = ref.current;
      if (!el) continue;
      el.style.opacity = String(facingOpacity(dir, pos, camera.position));
    }
  });

  if (!poles || !derived) return null;

  const onDotClick = (hemisphere: "north" | "south") => (e: React.MouseEvent) => {
    e.stopPropagation();
    const latlon = hemisphere === "north" ? derived.north : derived.south;
    const label = hemisphere === "north" ? "Geomagnetic North Pole" : "Geomagnetic South Pole";
    focusFeature({
      kind: "pole",
      data: makePoleInfo(label, "geomagnetic", latlon.lat, latlon.lon, derived.year),
    });
  };

  const dotClass =
    "h-2.5 w-2.5 cursor-pointer select-none rounded-full bg-[#ad73fa] shadow-[0_0_6px_2px_rgba(173,115,250,0.7)] transition-transform hover:scale-125";

  return (
    <>
      <instancedMesh
        ref={tickRef}
        args={[undefined, undefined, poles.northGeomagnetic.length + poles.southGeomagnetic.length]}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial color={COLOR} />
      </instancedMesh>

      {histGeometry && <lineSegments geometry={histGeometry} material={histMaterial} frustumCulled={false} />}
      {predGeometry && <lineSegments geometry={predGeometry} material={predMaterial} frustumCulled={false} />}

      <Html position={derived.northPos} center zIndexRange={[5, 0]}>
        <div ref={nRef} onClick={onDotClick("north")} className={dotClass} />
      </Html>
      <Html position={derived.southPos} center zIndexRange={[5, 0]}>
        <div ref={sRef} onClick={onDotClick("south")} className={dotClass} />
      </Html>
    </>
  );
}
