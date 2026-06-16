"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Swarm } from "@/lib/swarm";
import { latLonToVec3 } from "@/lib/geo";
import { magnitudeColor } from "@/lib/utils";
import { useGlobeStore } from "@/store/globeStore";
import { rippleVertex, rippleFragment, rippleSizePx } from "./shaders/ripple";

// A swarm renders as a vertical tower of its individual events: each
// event is the same ripple marker we use for loose quakes, stacked
// radially out of the planet at the swarm's centroid. Largest magnitude
// sits at the base, smaller events climb upward, so the tower tapers
// naturally and the biggest event anchors it to the ground. A faint
// stem line connects them so the stack reads as one structure.

const STACK_BASE = 1.004; // radius the bottom marker sits at
const STACK_STEP = 0.045; // radial gap between stacked markers
// Cap how many events are drawn on a tower. Very active swarms can have
// hundreds of events; stacking hundreds of large overlapping ripple
// points at one screen location is pathological overdraw (GPU hang).
// The tower shows the strongest MAX_STACK; the detail panel lists all.
const MAX_STACK = 14;

const HIT_OBJ = new THREE.Object3D();
const HIT_QUAT = new THREE.Quaternion();
const HIT_UP = new THREE.Vector3(0, 1, 0);

// Stem shader: same horizon cull as the ripple markers so the
// connecting lines vanish when a tower rotates to the far side instead
// of bleeding through the globe (the towers render with depthTest off).
const stemVertex = /* glsl */ `
  attribute vec3 color;
  varying vec3 vColor;
  varying float vFacing;
  void main() {
    vColor = color;
    vec3 worldPos = (modelMatrix * vec4(position, 1.0)).xyz;
    vec3 toCam = normalize(cameraPosition - worldPos);
    vFacing = dot(normalize(worldPos), toCam);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const stemFragment = /* glsl */ `
  precision highp float;
  varying vec3 vColor;
  varying float vFacing;
  void main() {
    if (vFacing < 0.0) discard;
    float fade = smoothstep(0.0, 0.12, vFacing);
    gl_FragColor = vec4(vColor * fade, fade * 0.5);
  }
`;

interface StackEntry {
  swarmIndex: number;
  pos: THREE.Vector3;
  mag: number;
  color: [number, number, number];
}

export function SwarmSpines({ swarms }: { swarms: Swarm[] }) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const stemRef = useRef<THREE.LineSegments>(null);
  const hitRef = useRef<THREE.InstancedMesh>(null);
  const focusSwarm = useGlobeStore((s) => s.focusSwarm);
  const { gl } = useThree();

  // Flatten every swarm into a stack of ripple markers + remember which
  // swarm each marker belongs to (for click handling).
  const { entries, towerHeights } = useMemo(() => {
    const entries: StackEntry[] = [];
    const towerHeights: number[] = [];
    swarms.forEach((s, si) => {
      const dir = latLonToVec3(s.centroidLat, s.centroidLon, 1).normalize();
      // Biggest first so it anchors the base; cap the visible stack.
      const ordered = [...s.events].sort((a, b) => b.mag - a.mag).slice(0, MAX_STACK);
      ordered.forEach((q, idx) => {
        const radius = STACK_BASE + idx * STACK_STEP;
        entries.push({
          swarmIndex: si,
          pos: dir.clone().multiplyScalar(radius),
          mag: q.mag,
          color: magnitudeColor(q.mag),
        });
      });
      towerHeights[si] = STACK_BASE + (ordered.length - 1) * STACK_STEP;
    });
    return { entries, towerHeights };
  }, [swarms]);

  const markerGeometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const n = entries.length;
    const positions = new Float32Array(n * 3);
    const ripples = new Float32Array(n);
    const colors = new Float32Array(n * 3);
    const mags = new Float32Array(n);
    const phases = new Float32Array(n);
    entries.forEach((e, i) => {
      positions[i * 3] = e.pos.x;
      positions[i * 3 + 1] = e.pos.y;
      positions[i * 3 + 2] = e.pos.z;
      // Keep magnitude variation visible on the tower — only cap the
      // very largest so a big event doesn't swamp the stack. M3 ~14px,
      // M5 ~36px, M6 ~57px so the differences read.
      ripples[i] = Math.min(60, rippleSizePx(e.mag));
      colors[i * 3] = e.color[0];
      colors[i * 3 + 1] = e.color[1];
      colors[i * 3 + 2] = e.color[2];
      mags[i] = e.mag;
      phases[i] = Math.random();
    });
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("aMaxRipplePx", new THREE.BufferAttribute(ripples, 1));
    g.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
    g.setAttribute("aMag", new THREE.BufferAttribute(mags, 1));
    g.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 2);
    return g;
  }, [entries]);

  // Faint stem: a line from the surface up to the top of each tower.
  const stemGeometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const verts = new Float32Array(swarms.length * 2 * 3);
    const cols = new Float32Array(swarms.length * 2 * 3);
    swarms.forEach((s, si) => {
      const dir = latLonToVec3(s.centroidLat, s.centroidLon, 1).normalize();
      const bottom = dir.clone().multiplyScalar(STACK_BASE);
      const top = dir.clone().multiplyScalar(towerHeights[si] + STACK_STEP * 0.4);
      const [r, gC, b] = magnitudeColor(s.maxMag);
      verts.set([bottom.x, bottom.y, bottom.z], si * 6);
      verts.set([top.x, top.y, top.z], si * 6 + 3);
      // Brighter at base, dimmer at tip.
      cols.set([r, gC, b], si * 6);
      cols.set([r * 0.15, gC * 0.15, b * 0.15], si * 6 + 3);
    });
    g.setAttribute("position", new THREE.BufferAttribute(verts, 3));
    g.setAttribute("color", new THREE.BufferAttribute(cols, 3));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 2);
    return g;
  }, [swarms, towerHeights]);

  // Invisible click targets: one cylinder per swarm spanning the tower.
  useEffect(() => {
    const mesh = hitRef.current;
    if (!mesh || swarms.length === 0) return;
    swarms.forEach((s, si) => {
      const base = latLonToVec3(s.centroidLat, s.centroidLon, 1.0);
      const dir = base.clone().normalize();
      const height = Math.max(0.05, towerHeights[si] - 1.0 + STACK_STEP);
      const centre = base.clone().add(dir.clone().multiplyScalar(height / 2));
      HIT_OBJ.position.copy(centre);
      HIT_QUAT.setFromUnitVectors(HIT_UP, dir);
      HIT_OBJ.quaternion.copy(HIT_QUAT);
      HIT_OBJ.scale.set(0.04, height, 0.04);
      HIT_OBJ.updateMatrix();
      mesh.setMatrixAt(si, HIT_OBJ.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.count = swarms.length;
  }, [swarms, towerHeights]);

  useEffect(
    () => () => {
      markerGeometry.dispose();
      stemGeometry.dispose();
    },
    [markerGeometry, stemGeometry],
  );

  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uPixelRatio: { value: Math.min(gl.getPixelRatio(), 2) } }),
    [gl],
  );

  useFrame(({ clock }) => {
    if (matRef.current) matRef.current.uniforms.uTime.value = clock.elapsedTime;
  });

  const onHitClick = (e: any) => {
    e.stopPropagation();
    const i = e.instanceId as number | undefined;
    if (i == null) return;
    const s = swarms[i];
    if (s) focusSwarm(s);
  };

  if (swarms.length === 0) return null;

  return (
    <>
      {/* Faint connecting stems — horizon-culled like the markers */}
      <lineSegments ref={stemRef} geometry={stemGeometry} frustumCulled={false}>
        <shaderMaterial
          vertexShader={stemVertex}
          fragmentShader={stemFragment}
          transparent
          depthTest={false}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </lineSegments>

      {/* Stacked ripple markers */}
      <points geometry={markerGeometry} frustumCulled={false}>
        <shaderMaterial
          ref={matRef}
          vertexShader={rippleVertex}
          fragmentShader={rippleFragment}
          uniforms={uniforms}
          transparent
          depthTest={false}
          depthWrite={false}
          blending={THREE.NormalBlending}
          toneMapped={false}
        />
      </points>

      {/* Invisible click targets */}
      <instancedMesh
        ref={hitRef}
        args={[undefined, undefined, Math.max(1, swarms.length)]}
        onClick={onHitClick}
        frustumCulled={false}
      >
        <cylinderGeometry args={[1, 1, 1, 6, 1, true]} />
        <meshBasicMaterial colorWrite={false} depthWrite={false} />
      </instancedMesh>
    </>
  );
}
