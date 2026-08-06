"use client";

import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { latLonToVec3, buildLineSegmentsGeometry, createHorizonFadeMaterial } from "@/lib/geo";
import { loadPlateBoundaries, type PlateBoundary } from "@/lib/features";

// Tectonic plate boundaries (simplified PB2002) drawn as a single
// LineSegments geometry sitting just above the surface. The shared
// horizon-fade material (lib/geo.ts) fades the lines out on the far
// hemisphere (same horizon-cull trick as the swarm stems) so they never
// bleed through the globe, and gives them a subtle amber glow that
// brightens toward the camera.

const PLATE_RADIUS = 1.0015;

export function Plates() {
  const [boundaries, setBoundaries] = useState<PlateBoundary[] | null>(null);

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

  const geometry = useMemo(() => {
    if (!boundaries) return null;
    const polylines = boundaries.map((b) =>
      b.coordinates.map(([lon, lat]) => latLonToVec3(lat, lon, PLATE_RADIUS)),
    );
    return buildLineSegmentsGeometry(polylines, PLATE_RADIUS);
  }, [boundaries]);

  const material = useMemo(
    () => createHorizonFadeMaterial(new THREE.Color(1.0, 0.62, 0.25), 0.55),
    [],
  );

  useEffect(() => () => geometry?.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  if (!geometry) return null;

  return <lineSegments geometry={geometry} material={material} frustumCulled={false} />;
}
