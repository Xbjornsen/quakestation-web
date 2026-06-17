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
import { Heatmap } from "./Heatmap";
import { FocusPulse } from "./FocusPulse";
import { CameraController } from "./CameraController";
import { useMemo } from "react";
import { detectSwarms } from "@/lib/swarm";
import { useQuakes } from "@/hooks/useQuakes";
import { useGlobeStore } from "@/store/globeStore";

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
  const showHeatmap = useGlobeStore((s) => s.showHeatmap);

  useEffect(() => {
    if (data?.quakes) setQuakes(data.quakes);
  }, [data, setQuakes]);

  const { swarms, loose } = useMemo(() => detectSwarms(data?.quakes ?? []), [data?.quakes]);

  useEffect(() => {
    setSwarmCount(swarms.length);
  }, [swarms, setSwarmCount]);

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
      {showHeatmap && <Heatmap />}
      <Markers quakes={loose} />
      <SwarmSpines swarms={swarms} />
      <FocusPulse />
      <CameraController />
    </Canvas>
  );
}
