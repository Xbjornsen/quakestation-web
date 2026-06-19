"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { latLonToVec3 } from "@/lib/geo";
import { loadVolcanoes, type Volcano } from "@/lib/features";
import { useGlobeStore } from "@/store/globeStore";

// Significant Holocene volcanoes. Each is a small cone standing along the
// surface normal. How it's rendered depends on how recently it erupted:
//
//   • Active  (erupted within the historical record, ~last 100 yrs) — a
//     glowing magma crater with a pulsing ember at the summit. Intensity
//     scales with recency: a 2024 eruption reads hot, a 1930s one is faint.
//   • Dormant / extinct (older, or only prehistoric eruptions) — a cold,
//     greyer rock cone with NO glow.
//
// Cones share one InstancedMesh; embers share one Points cloud — two draw
// calls total. Per-volcano `aActivity` (0..1) gates the glow/ember so
// inactive volcanoes are plainly dead rock.

const CONE_BASE = 1.001;
const CONE_HEIGHT = 0.011; // low and broad — a bump, not a spike
const CONE_RADIUS = 0.011; // base radius (wider than tall, like a real cone)
const CONE_TOP_RADIUS = 0.004; // truncated summit -> a real crater rim
const SUMMIT = CONE_BASE + CONE_HEIGHT; // where the ember sits

const UP = new THREE.Vector3(0, 1, 0);
const TMP_OBJ = new THREE.Object3D();
const TMP_QUAT = new THREE.Quaternion();

// Parse a `last_eruption` string ("2023", "1894", "750 CE", "70,000 BCE")
// into a signed year (BCE negative). Returns null if unparseable.
function eruptionYear(s: string): number | null {
  if (!s) return null;
  const bce = /BCE/i.test(s);
  const n = parseInt(s.replace(/[^0-9]/g, ""), 10);
  if (Number.isNaN(n)) return null;
  return bce ? -n : n;
}

const NOW_YEAR = new Date().getFullYear();

// Activity in [0,1]: 0 for anything that last erupted over a century ago (or
// only in prehistory), ramping to 1 for an eruption in the current decade.
// Historically-active volcanoes keep a visible floor so they still read as
// "alive" rather than blinking off at the 100-year edge.
function volcanoActivity(v: Volcano): number {
  const y = eruptionYear(v.last_eruption);
  if (y == null || y <= 0) return 0; // BCE / prehistoric -> extinct
  const age = NOW_YEAR - y;
  if (age > 100) return 0; // dormant -> no glow, no smoke
  return THREE.MathUtils.clamp(1 - age / 130, 0.3, 1);
}

// Magma gradient baked into a basic (unlit) material — the scene has almost
// no light, so colour is driven directly rather than via shading. The warm
// crater glow is gated by per-instance `aActivity`, so dormant cones are
// cold grey rock and active ones glow.
function useMagmaMaterial() {
  return useMemo(() => {
    const m = new THREE.MeshBasicMaterial({ toneMapped: false });
    m.onBeforeCompile = (shader) => {
      shader.vertexShader =
        "varying float vH;\nvarying float vAct;\nattribute float aActivity;\n" +
        shader.vertexShader.replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
           vAct = aActivity;
           vH = clamp((position.y + ${(CONE_HEIGHT / 2).toFixed(5)}) / ${CONE_HEIGHT.toFixed(
             5,
           )}, 0.0, 1.0);`,
        );
      shader.fragmentShader =
        "varying float vH;\nvarying float vAct;\n" +
        shader.fragmentShader.replace(
          "#include <dithering_fragment>",
          `// Rock cools from warm basalt (active) toward grey andesite (dead).
           vec3 rockCold = vec3(0.135, 0.135, 0.150);
           vec3 rockWarm = vec3(0.200, 0.130, 0.100);
           vec3 rock = mix(rockCold, rockWarm, vAct);
           vec3 emberLo = vec3(0.85, 0.28, 0.08);
           vec3 emberHi = vec3(1.0, 0.62, 0.22);
           // Walls warm faintly toward the top — only on active cones.
           float warm = smoothstep(0.55, 1.0, vH) * vAct;
           vec3 col = mix(rock, emberLo, warm * 0.6);
           // Crater rim: a bright molten band right at the truncated summit.
           float rimMask = smoothstep(0.86, 1.0, vH);
           float rim = rimMask * vAct;
           col = mix(col, emberHi, rim * 0.9);
           col += emberHi * pow(rimMask, 2.5) * 0.5 * vAct; // glow off the rim
           gl_FragColor.rgb = col;
           #include <dithering_fragment>`,
        );
    };
    return m;
  }, []);
}

const emberVertex = /* glsl */ `
  attribute float aPhase;
  attribute float aHover;
  attribute float aActivity;
  uniform float uPixelRatio;
  uniform float uTime;
  varying float vFacing;
  varying float vHover;
  varying float vAct;
  void main() {
    vHover = aHover;
    vAct = aActivity;
    vec3 worldPos = (modelMatrix * vec4(position, 1.0)).xyz;
    vec3 toCam = normalize(cameraPosition - worldPos);
    vFacing = dot(normalize(worldPos), toCam);
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    float pulse = 0.92 + 0.08 * sin(uTime * 1.6 + aPhase * 6.2831);
    float base = 5.5 * (1.0 + aHover * 0.7) * pulse;
    float size = base * uPixelRatio * (4.5 / -mvPos.z);
    float horizon = smoothstep(-0.05, 0.1, vFacing);
    gl_PointSize = clamp(size, 3.0, 18.0) * horizon * step(0.001, aActivity);
    gl_Position = projectionMatrix * mvPos;
  }
`;

const emberFragment = /* glsl */ `
  precision highp float;
  varying float vFacing;
  varying float vHover;
  varying float vAct;
  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float d = length(p) * 2.0;
    if (d > 1.0) discard;
    float core = exp(-d * d * 6.5);
    float halo = exp(-d * d * 2.5) * 0.2;
    // Ember brightness tracks activity: recent eruptions glow hot.
    float a = (core + halo) * smoothstep(0.0, 0.12, vFacing) * (0.22 + vHover * 0.4) * vAct;
    vec3 ember = mix(vec3(0.85, 0.34, 0.10), vec3(1.0, 0.66, 0.30), core);
    gl_FragColor = vec4(ember * a, a);
  }
`;

export function Volcanoes() {
  const [volcanoes, setVolcanoes] = useState<Volcano[]>([]);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const emberRef = useRef<THREE.Points>(null);
  const emberMatRef = useRef<THREE.ShaderMaterial>(null);
  const focusFeature = useGlobeStore((s) => s.focusFeature);
  const [hovered, setHovered] = useState<number | null>(null);
  const { gl } = useThree();
  const material = useMagmaMaterial();

  useEffect(() => {
    let cancelled = false;
    loadVolcanoes()
      .then((v) => {
        if (!cancelled) setVolcanoes(v);
      })
      .catch((err) => console.error("Failed to load volcanoes", err));
    return () => {
      cancelled = true;
    };
  }, []);

  // Per-volcano activity (0..1), computed once from `last_eruption`.
  const activity = useMemo(() => volcanoes.map(volcanoActivity), [volcanoes]);

  // Position the cones along the surface normal and tag each with its
  // activity as a per-instance attribute the magma shader reads.
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || volcanoes.length === 0) return;
    volcanoes.forEach((v, i) => {
      const dir = latLonToVec3(v.lat, v.lon, 1).normalize();
      const centre = dir.clone().multiplyScalar(CONE_BASE + CONE_HEIGHT / 2);
      TMP_QUAT.setFromUnitVectors(UP, dir);
      TMP_OBJ.position.copy(centre);
      TMP_OBJ.quaternion.copy(TMP_QUAT);
      TMP_OBJ.scale.set(1, 1, 1);
      TMP_OBJ.updateMatrix();
      mesh.setMatrixAt(i, TMP_OBJ.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    const act = new Float32Array(volcanoes.length);
    for (let i = 0; i < volcanoes.length; i++) act[i] = activity[i];
    mesh.geometry.setAttribute("aActivity", new THREE.InstancedBufferAttribute(act, 1));
    mesh.count = volcanoes.length;
  }, [volcanoes, activity]);

  // Ember glow geometry: one point per summit, carrying its activity.
  const emberGeometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const n = volcanoes.length;
    const positions = new Float32Array(Math.max(1, n) * 3);
    const phases = new Float32Array(Math.max(1, n));
    const hover = new Float32Array(Math.max(1, n));
    const act = new Float32Array(Math.max(1, n));
    volcanoes.forEach((v, i) => {
      const s = latLonToVec3(v.lat, v.lon, SUMMIT);
      positions[i * 3] = s.x;
      positions[i * 3 + 1] = s.y;
      positions[i * 3 + 2] = s.z;
      phases[i] = Math.random();
      act[i] = activity[i];
    });
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
    g.setAttribute("aHover", new THREE.BufferAttribute(hover, 1));
    g.setAttribute("aActivity", new THREE.BufferAttribute(act, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 2);
    return g;
  }, [volcanoes, activity]);

  useEffect(() => () => emberGeometry.dispose(), [emberGeometry]);

  // Push hover state into the ember `aHover` attribute.
  useEffect(() => {
    const geo = emberRef.current?.geometry;
    const attr = geo?.getAttribute("aHover") as THREE.BufferAttribute | undefined;
    if (!attr) return;
    for (let i = 0; i < attr.count; i++) attr.setX(i, i === hovered ? 1 : 0);
    attr.needsUpdate = true;
  }, [hovered, volcanoes]);

  const pixelRatio = useMemo(() => Math.min(gl.getPixelRatio(), 2), [gl]);
  const emberUniforms = useMemo(
    () => ({ uTime: { value: 0 }, uPixelRatio: { value: pixelRatio } }),
    [pixelRatio],
  );

  useFrame(({ clock }) => {
    if (emberMatRef.current) emberMatRef.current.uniforms.uTime.value = clock.elapsedTime;
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    const i = e.instanceId as number | undefined;
    if (i == null) return;
    const v = volcanoes[i];
    if (v) focusFeature({ kind: "volcano", data: v });
  };
  const onMove = (e: any) => {
    e.stopPropagation();
    setHovered(e.instanceId ?? null);
  };
  const onOut = () => setHovered(null);

  const count = useMemo(() => Math.max(1, volcanoes.length), [volcanoes.length]);

  if (volcanoes.length === 0) return null;

  return (
    <>
      <instancedMesh
        ref={meshRef}
        args={[undefined, material, count]}
        frustumCulled={false}
        onClick={handleClick}
        onPointerMove={onMove}
        onPointerOut={onOut}
      >
        <cylinderGeometry args={[CONE_TOP_RADIUS, CONE_RADIUS, CONE_HEIGHT, 20, 1]} />
      </instancedMesh>

      <points ref={emberRef} geometry={emberGeometry} frustumCulled={false}>
        <shaderMaterial
          ref={emberMatRef}
          vertexShader={emberVertex}
          fragmentShader={emberFragment}
          uniforms={emberUniforms}
          transparent
          depthTest={false}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </points>
    </>
  );
}
