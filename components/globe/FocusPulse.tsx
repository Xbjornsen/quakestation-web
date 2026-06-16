"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useGlobeStore } from "@/store/globeStore";
import { latLonToVec3 } from "@/lib/geo";

// When a quake becomes `selected` (via a pill, a swarm event, or any
// fly-to), we ping its location with a few large expanding rings for a
// few seconds so the eye lands on the right marker after the camera
// finishes moving. The ping auto-stops after PULSE_DURATION.

const PULSE_DURATION = 4.5; // seconds

const pulseVertex = /* glsl */ `
  uniform float uPixelRatio;
  varying float vFacing;
  void main() {
    vec3 worldPos = (modelMatrix * vec4(position, 1.0)).xyz;
    vec3 toCam = normalize(cameraPosition - worldPos);
    vFacing = dot(normalize(worldPos), toCam);
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    // A focused ping just big enough to draw the eye, not blanket the
    // region.
    float size = 62.0 * uPixelRatio * (4.5 / -mvPos.z);
    float horizonMask = smoothstep(-0.02, 0.08, vFacing);
    gl_PointSize = clamp(size, 26.0, 110.0) * horizonMask;
    gl_Position = projectionMatrix * mvPos;
  }
`;

const pulseFragment = /* glsl */ `
  precision highp float;
  uniform float uElapsed;
  uniform float uDuration;
  uniform vec3 uColor;
  varying float vFacing;

  float ring(float d, float r, float thickness) {
    return exp(-pow((d - r) / thickness, 2.0));
  }

  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float d = length(p) * 2.0;
    if (d > 1.0) discard;

    float a = 0.0;

    // Persistent selection marker: a steady white ring + centre dot that
    // stays for as long as the quake is selected. This is what marks the
    // real location of a swarm event (which otherwise only appears
    // stacked on its tower), so the spot doesn't go blank when the ping
    // finishes.
    float steadyRing = ring(d, 0.6, 0.05);
    float centreDot = smoothstep(0.16, 0.02, d);
    a = max(a, steadyRing * 0.85 + centreDot * 0.9);

    // Expanding sonar ping layered on top for the first few seconds to
    // pull the eye in after the camera fly-to.
    if (uElapsed <= uDuration) {
      float speed = 0.85;
      float ping = 0.0;
      for (int k = 0; k < 3; k++) {
        float phase = fract(uElapsed * speed - float(k) * 0.33);
        float r = mix(0.1, 1.0, phase);
        float fade = pow(1.0 - phase, 1.2);
        ping += ring(d, r, 0.06) * fade;
      }
      float envelope = 1.0 - smoothstep(uDuration - 1.2, uDuration, uElapsed);
      a = max(a, ping * envelope);
    }

    float horizon = smoothstep(0.0, 0.12, vFacing);
    a = clamp(a, 0.0, 1.0) * horizon;
    if (a < 0.01) discard;

    gl_FragColor = vec4(uColor, a);
  }
`;

export function FocusPulse() {
  const selected = useGlobeStore((s) => s.selected);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const idRef = useRef<string | null>(null);
  const startRef = useRef(0);
  const { gl } = useThree();

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    if (!selected) {
      g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(3), 3));
      return g;
    }
    // Sit on the same shell as the surface markers so the ping is
    // concentric with the quake's own marker rather than floating above
    // it (which reads as off-centre at oblique angles).
    const v = latLonToVec3(selected.lat, selected.lon, 1.004);
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array([v.x, v.y, v.z]), 3));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 2);
    return g;
  }, [selected]);

  const uniforms = useMemo(
    () => ({
      uElapsed: { value: 0 },
      uDuration: { value: PULSE_DURATION },
      // App's cyan accent (used for selected/interactive UI). Reads as
      // "this one is selected" without clashing with the magnitude ramp.
      uColor: { value: new THREE.Color(0.27, 0.83, 1.0) },
      uPixelRatio: { value: Math.min(gl.getPixelRatio(), 2) },
    }),
    [gl],
  );

  useFrame(({ clock }) => {
    if (!selected || !matRef.current) return;
    // Restart the timer whenever the selected quake changes.
    if (idRef.current !== selected.id) {
      idRef.current = selected.id;
      startRef.current = clock.elapsedTime;
    }
    matRef.current.uniforms.uElapsed.value = clock.elapsedTime - startRef.current;
  });

  if (!selected) return null;

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={matRef}
        vertexShader={pulseVertex}
        fragmentShader={pulseFragment}
        uniforms={uniforms}
        transparent
        depthTest={false}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}
