"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect } from "react";
import * as THREE from "three";
import { Earth } from "./Earth";
import { Atmosphere } from "./Atmosphere";
import { Stars } from "./Stars";
import { Markers } from "./Markers";
import { SwarmSpines } from "./SwarmSpines";
import { Plates } from "./Plates";
import { Volcanoes } from "./Volcanoes";
import { PoleMarkers } from "./PoleMarkers";
import { CameraController } from "./CameraController";
import { useMemo } from "react";
import { detectSwarms, type Swarm } from "@/lib/swarm";
import { useQuakes } from "@/hooks/useQuakes";
import { useIsMobile } from "@/hooks/useIsMobile";
import { REPLAY_MIN_MAG } from "@/lib/usgs";
import { useGlobeStore } from "@/store/globeStore";

// Stable empty reference so suppressing swarm towers during replay doesn't
// hand SwarmSpines a fresh array each render.
const NO_SWARMS: Swarm[] = [];

function FallbackEarth() {
  return (
    <mesh>
      <sphereGeometry args={[1, 96, 96]} />
      <meshStandardMaterial color="#1a3050" roughness={1} />
    </mesh>
  );
}

export default function GlobeScene() {
  const isMobile = useIsMobile();
  const minMag = useGlobeStore((s) => s.minMagnitude);
  const days = useGlobeStore((s) => s.days);
  const { data } = useQuakes({ minMagnitude: minMag, days });
  const setQuakes = useGlobeStore((s) => s.setQuakes);
  const setSwarmCount = useGlobeStore((s) => s.setSwarmCount);
  const showPlates = useGlobeStore((s) => s.showPlates);
  const showVolcanoes = useGlobeStore((s) => s.showVolcanoes);
  const replayTime = useGlobeStore((s) => s.replayTime);

  useEffect(() => {
    if (data?.quakes) setQuakes(data.quakes);
  }, [data, setQuakes]);

  const { swarms, loose } = useMemo(() => detectSwarms(data?.quakes ?? []), [data?.quakes]);

  useEffect(() => {
    setSwarmCount(swarms.length);
  }, [swarms, setSwarmCount]);

  // During replay, show only a rolling time window around the playhead (and
  // hide swarm towers), so events appear when their moment arrives and clear
  // shortly after — a sequence, not an ever-growing pile. Live view keeps the
  // normal loose-markers + swarm-towers split.
  const replaying = replayTime != null;
  const markerQuakes = useMemo(() => {
    if (!replaying || replayTime == null) return loose;
    const all = data?.quakes ?? [];
    if (all.length === 0) return all;
    let lo = Infinity;
    let hi = -Infinity;
    for (const q of all) {
      if (q.time < lo) lo = q.time;
      if (q.time > hi) hi = q.time;
    }
    // Each event stays visible for ~12% of the timeline, then ages out. Only
    // significant events (M4+) replay, so they read as a sparse sequence.
    const windowMs = Math.max(1, (hi - lo) * 0.12);
    return all.filter(
      (q) => q.mag >= REPLAY_MIN_MAG && q.time <= replayTime && q.time > replayTime - windowMs,
    );
  }, [replaying, replayTime, data, loose]);
  const spineSwarms = replaying ? NO_SWARMS : swarms;

  return (
    <Canvas
      className="absolute inset-0"
      camera={{ position: [0, 0, 3.2], fov: 45, near: 0.01, far: 200 }}
      // Lighter render budget on phones: cap the pixel ratio and drop MSAA.
      dpr={isMobile ? [1, 1.5] : [1, 2]}
      raycaster={{ params: { Points: { threshold: 0.02 } } as any }}
      gl={{ antialias: !isMobile, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.35;
      }}
    >
      <color attach="background" args={["#05070d"]} />
      <ambientLight intensity={0.05} />
      <Stars />
      <Suspense fallback={<FallbackEarth />}>
        <Earth segments={isMobile ? 192 : 512} />
      </Suspense>
      <Atmosphere />
      {showPlates && <Plates />}
      {showVolcanoes && <Volcanoes />}
      <Markers quakes={markerQuakes} />
      <SwarmSpines swarms={spineSwarms} />
      <PoleMarkers />
      <CameraController />
    </Canvas>
  );
}
