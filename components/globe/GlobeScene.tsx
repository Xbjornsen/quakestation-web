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

  // During replay, flatten to individual markers up to the playhead and hide
  // swarm towers so the eye watches events appear chronologically. Live view
  // keeps the normal loose-markers + swarm-towers split.
  const replaying = replayTime != null;
  const markerQuakes = useMemo(() => {
    if (!replaying) return loose;
    const all = data?.quakes ?? [];
    return all.filter((q) => q.time <= replayTime!);
  }, [replaying, replayTime, data, loose]);
  const spineSwarms = replaying ? NO_SWARMS : swarms;

  return (
    <Canvas
      className="absolute inset-0"
      camera={{ position: [0, 0, 3.2], fov: 45, near: 0.01, far: 200 }}
      dpr={[1, 2]}
      raycaster={{ params: { Points: { threshold: 0.02 } } as any }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.35;
      }}
    >
      <color attach="background" args={["#05070d"]} />
      <ambientLight intensity={0.05} />
      <Stars />
      <Suspense fallback={<FallbackEarth />}>
        <Earth />
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
