"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Suspense, useEffect } from "react";
import * as THREE from "three";
import { Earth } from "./Earth";
import { Atmosphere } from "./Atmosphere";
import { Stars } from "./Stars";
import { Markers } from "./Markers";
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

  useEffect(() => {
    if (data?.quakes) setQuakes(data.quakes);
  }, [data, setQuakes]);

  return (
    <Canvas
      className="absolute inset-0"
      camera={{ position: [0, 0, 3.2], fov: 45, near: 0.01, far: 200 }}
      dpr={[1, 2]}
      raycaster={{ params: { Points: { threshold: 0.02 } } as any }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
    >
      <color attach="background" args={["#05070d"]} />
      <ambientLight intensity={0.05} />
      <Stars />
      <Suspense fallback={<FallbackEarth />}>
        <Earth />
      </Suspense>
      <Atmosphere />
      <Markers quakes={data?.quakes ?? []} />
      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.4}
        minDistance={1.4}
        maxDistance={6}
      />
    </Canvas>
  );
}
