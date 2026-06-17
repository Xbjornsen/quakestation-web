"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Swarm } from "@/lib/swarm";
import { latLonToVec3 } from "@/lib/geo";
import { magnitudeColor } from "@/lib/utils";
import { useGlobeStore } from "@/store/globeStore";
import { ringVertex, ringFragment } from "./shaders/ring";

// A swarm renders as a vertical tower of its individual events climbing
// radially out of the planet at the swarm's centroid. Each event is an
// expanding ripple ring lying in the plane *perpendicular to the tower axis*
// (i.e. a horizontal halo around the spine), so the rings relate to the tower
// instead of billboarding flat at the camera. Largest magnitude sits at the
// base; a faint stem connects them so the stack reads as one structure.

const STACK_BASE = 1.004;
const STACK_STEP = 0.045;
const MAX_STACK = 14;

const HIT_OBJ = new THREE.Object3D();
const HIT_QUAT = new THREE.Quaternion();
const HIT_UP = new THREE.Vector3(0, 1, 0);

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

const UP = new THREE.Vector3(0, 1, 0);
const ALT_UP = new THREE.Vector3(1, 0, 0);

export function SwarmSpines({ swarms }: { swarms: Swarm[] }) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const stemRef = useRef<THREE.LineSegments>(null);
  const hitRef = useRef<THREE.InstancedMesh>(null);
  const focusSwarm = useGlobeStore((s) => s.focusSwarm);
  const { gl } = useThree();

  const { entries, towerHeights } = useMemo(() => {
    const entries: StackEntry[] = [];
    const towerHeights: number[] = [];
    swarms.forEach((s, si) => {
      const dir = latLonToVec3(s.centroidLat, s.centroidLon, 1).normalize();
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

  // Baked quads: one per event, each lying in the plane perpendicular to its
  // radial (tower) axis. The ripple is drawn in the quad's UV space.
  const markerGeometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const n = entries.length;
    const positions = new Float32Array(n * 4 * 3);
    const uvs = new Float32Array(n * 4 * 2);
    const colors = new Float32Array(n * 4 * 3);
    const phases = new Float32Array(n * 4);
    const normals = new Float32Array(n * 4 * 3);
    const indices = new Uint32Array(n * 6);

    const nrm = new THREE.Vector3();
    const u = new THREE.Vector3();
    const v = new THREE.Vector3();
    const corners: Array<[number, number, number, number]> = [
      [-1, -1, 0, 0],
      [1, -1, 1, 0],
      [1, 1, 1, 1],
      [-1, 1, 0, 1],
    ];

    entries.forEach((e, i) => {
      nrm.copy(e.pos).normalize();
      // Two axes spanning the disc plane (perpendicular to the tower axis).
      u.crossVectors(nrm, Math.abs(nrm.y) > 0.95 ? ALT_UP : UP).normalize();
      v.crossVectors(nrm, u).normalize();
      const h = 0.02 + Math.min(6, Math.max(0, e.mag - 2)) * 0.004; // size by magnitude
      const phase = (i * 0.137) % 1;
      corners.forEach(([su, sv, tu, tv], c) => {
        const idx = i * 4 + c;
        positions[idx * 3] = e.pos.x + u.x * su * h + v.x * sv * h;
        positions[idx * 3 + 1] = e.pos.y + u.y * su * h + v.y * sv * h;
        positions[idx * 3 + 2] = e.pos.z + u.z * su * h + v.z * sv * h;
        uvs[idx * 2] = tu;
        uvs[idx * 2 + 1] = tv;
        colors[idx * 3] = e.color[0];
        colors[idx * 3 + 1] = e.color[1];
        colors[idx * 3 + 2] = e.color[2];
        phases[idx] = phase;
        normals[idx * 3] = nrm.x;
        normals[idx * 3 + 1] = nrm.y;
        normals[idx * 3 + 2] = nrm.z;
      });
      const b = i * 4;
      indices.set([b, b + 1, b + 2, b, b + 2, b + 3], i * 6);
    });

    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
    g.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
    g.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
    g.setAttribute("aNormal", new THREE.BufferAttribute(normals, 3));
    g.setIndex(new THREE.BufferAttribute(indices, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 2);
    return g;
  }, [entries]);

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
      cols.set([r, gC, b], si * 6);
      cols.set([r * 0.15, gC * 0.15, b * 0.15], si * 6 + 3);
    });
    g.setAttribute("position", new THREE.BufferAttribute(verts, 3));
    g.setAttribute("color", new THREE.BufferAttribute(cols, 3));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 2);
    return g;
  }, [swarms, towerHeights]);

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

  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);

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

      {/* Oriented ripple rings, perpendicular to each tower axis */}
      <mesh geometry={markerGeometry} frustumCulled={false}>
        <shaderMaterial
          ref={matRef}
          vertexShader={ringVertex}
          fragmentShader={ringFragment}
          uniforms={uniforms}
          transparent
          depthTest={false}
          depthWrite={false}
          blending={THREE.NormalBlending}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>

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
