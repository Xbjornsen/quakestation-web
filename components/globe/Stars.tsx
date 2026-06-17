"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function Stars({ count = 5000, radius = 80 }: { count?: number; radius?: number }) {
  const ref = useRef<THREE.Points>(null);
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      // Uniform distribution on a sphere
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.cos(phi);
      const z = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      // Skew brightness so a handful are notably brighter
      sizes[i] = Math.pow(Math.random(), 6) * 1.6 + 0.2;
    }
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
    return g;
  }, [count, radius]);

  const material = useMemo(() => {
    return new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.18,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
  }, []);

  // Turn the starfield with the camera's azimuth so it stays put in the
  // view instead of sweeping past during horizontal orbit (notably
  // auto-rotate, which is purely azimuthal). This exactly cancels the
  // azimuthal motion; elevation changes still parallax slightly, which
  // only happens on manual drag.
  useFrame(({ camera }) => {
    if (ref.current) {
      ref.current.rotation.y = Math.atan2(camera.position.x, camera.position.z);
    }
  });

  return <points ref={ref} geometry={geometry} material={material} />;
}
