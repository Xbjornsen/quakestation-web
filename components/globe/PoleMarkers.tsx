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

// "N" / "S" badges pinned at the (drifting) magnetic dip poles — where a
// compass needle points straight down — rather than the fixed geographic
// poles. A trail traces each pole's charted position back to 1900, dimmer
// past 2025 where the data is a model forecast rather than a measurement.
// Small ticks mark each 5-year epoch along the way. Clicking a badge opens
// the detail panel with its current coordinates.

const BADGE_R = 1.06;
const TRAIL_R = 1.0015;
const TICK_SCALE = 0.007;

const NORTH_COLOR = new THREE.Color(0.1, 0.85, 0.95);
const SOUTH_COLOR = new THREE.Color(0.95, 0.45, 0.55);

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

export function PoleMarkers() {
  const [poles, setPoles] = useState<MagneticPoles | null>(null);
  const nRef = useRef<HTMLDivElement>(null);
  const sRef = useRef<HTMLDivElement>(null);
  const northTickRef = useRef<THREE.InstancedMesh>(null);
  const southTickRef = useRef<THREE.InstancedMesh>(null);
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
    const north = interpolatePolePosition(poles.northDip, now);
    const south = interpolatePolePosition(poles.southDip, now);
    const northDir = latLonToVec3(north.lat, north.lon, 1).normalize();
    const southDir = latLonToVec3(south.lat, south.lon, 1).normalize();
    return {
      year,
      north,
      south,
      northDir,
      southDir,
      northPos: northDir.clone().multiplyScalar(BADGE_R),
      southPos: southDir.clone().multiplyScalar(BADGE_R),
      northTrail: buildPoleTrail(poles.northDip, north, now, TRAIL_R),
      southTrail: buildPoleTrail(poles.southDip, south, now, TRAIL_R),
    };
  }, [poles]);

  const northHistGeometry = useMemo(
    () => (derived ? buildLineSegmentsGeometry([derived.northTrail.historical], TRAIL_R) : null),
    [derived],
  );
  const northPredGeometry = useMemo(
    () =>
      derived && derived.northTrail.predicted.length > 0
        ? buildLineSegmentsGeometry([derived.northTrail.predicted], TRAIL_R)
        : null,
    [derived],
  );
  const southHistGeometry = useMemo(
    () => (derived ? buildLineSegmentsGeometry([derived.southTrail.historical], TRAIL_R) : null),
    [derived],
  );
  const southPredGeometry = useMemo(
    () =>
      derived && derived.southTrail.predicted.length > 0
        ? buildLineSegmentsGeometry([derived.southTrail.predicted], TRAIL_R)
        : null,
    [derived],
  );

  // Normal (not additive) blending so the trail keeps its color over the
  // bright polar ice caps instead of washing out to white; the predicted
  // segment is the same hue at lower opacity to read as "less certain."
  const northHistMaterial = useMemo(
    () => createHorizonFadeMaterial(NORTH_COLOR, 0.65, THREE.NormalBlending),
    [],
  );
  const northPredMaterial = useMemo(
    () => createHorizonFadeMaterial(NORTH_COLOR, 0.28, THREE.NormalBlending),
    [],
  );
  const southHistMaterial = useMemo(
    () => createHorizonFadeMaterial(SOUTH_COLOR, 0.6, THREE.NormalBlending),
    [],
  );
  const southPredMaterial = useMemo(
    () => createHorizonFadeMaterial(SOUTH_COLOR, 0.25, THREE.NormalBlending),
    [],
  );

  useEffect(() => () => northHistGeometry?.dispose(), [northHistGeometry]);
  useEffect(() => () => northPredGeometry?.dispose(), [northPredGeometry]);
  useEffect(() => () => southHistGeometry?.dispose(), [southHistGeometry]);
  useEffect(() => () => southPredGeometry?.dispose(), [southPredGeometry]);
  useEffect(() => () => northHistMaterial.dispose(), [northHistMaterial]);
  useEffect(() => () => northPredMaterial.dispose(), [northPredMaterial]);
  useEffect(() => () => southHistMaterial.dispose(), [southHistMaterial]);
  useEffect(() => () => southPredMaterial.dispose(), [southPredMaterial]);

  useEffect(() => {
    if (!derived) return;
    applyTicks(northTickRef.current, derived.northTrail.epochTicks);
    applyTicks(southTickRef.current, derived.southTrail.epochTicks);
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

  const onBadgeClick = (hemisphere: "north" | "south") => (e: React.MouseEvent) => {
    e.stopPropagation();
    const latlon = hemisphere === "north" ? derived.north : derived.south;
    const label = hemisphere === "north" ? "Magnetic North Pole" : "Magnetic South Pole";
    focusFeature({ kind: "pole", data: makePoleInfo(label, "dip", latlon.lat, latlon.lon, derived.year) });
  };

  const badgeClass =
    "grid h-6 w-6 cursor-pointer select-none place-items-center rounded-full border bg-ink-900/70 font-mono text-xs font-semibold backdrop-blur-sm transition-transform hover:scale-110";

  return (
    <>
      <instancedMesh ref={northTickRef} args={[undefined, undefined, poles.northDip.length]} frustumCulled={false}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial color={NORTH_COLOR} />
      </instancedMesh>
      <instancedMesh ref={southTickRef} args={[undefined, undefined, poles.southDip.length]} frustumCulled={false}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial color={SOUTH_COLOR} />
      </instancedMesh>

      {northHistGeometry && (
        <lineSegments geometry={northHistGeometry} material={northHistMaterial} frustumCulled={false} />
      )}
      {northPredGeometry && (
        <lineSegments geometry={northPredGeometry} material={northPredMaterial} frustumCulled={false} />
      )}
      {southHistGeometry && (
        <lineSegments geometry={southHistGeometry} material={southHistMaterial} frustumCulled={false} />
      )}
      {southPredGeometry && (
        <lineSegments geometry={southPredGeometry} material={southPredMaterial} frustumCulled={false} />
      )}

      <Html position={derived.northPos} center zIndexRange={[5, 0]}>
        <div
          ref={nRef}
          onClick={onBadgeClick("north")}
          className={`${badgeClass} border-accent-cyan/50 text-accent-cyan`}
        >
          N
        </div>
      </Html>
      <Html position={derived.southPos} center zIndexRange={[5, 0]}>
        <div
          ref={sRef}
          onClick={onBadgeClick("south")}
          className={`${badgeClass} border-white/30 text-white/70`}
        >
          S
        </div>
      </Html>
    </>
  );
}
