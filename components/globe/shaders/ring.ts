// Oriented ripple ring drawn in a baked quad's own UV space. The quad is
// placed in world space lying in the plane perpendicular to its radial axis
// (flat on the surface for loose quakes, perpendicular to the spine for swarm
// towers), so the ring relates to the globe rather than billboarding at the
// camera. aNormal (the radial axis) drives the horizon cull.

export const ringVertex = /* glsl */ `
  attribute vec3 aColor;
  attribute float aPhase;
  attribute vec3 aNormal;
  varying vec2 vUv;
  varying vec3 vColor;
  varying float vPhase;
  varying float vFacing;
  void main() {
    vUv = uv;
    vColor = aColor;
    vPhase = aPhase;
    vec3 worldPos = (modelMatrix * vec4(position, 1.0)).xyz;
    vec3 toCam = normalize(cameraPosition - worldPos);
    vFacing = dot(normalize(aNormal), toCam);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const ringFragment = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  varying vec3 vColor;
  varying float vPhase;
  varying float vFacing;
  uniform float uTime;
  float ring(float d, float r, float th) { return exp(-pow((d - r) / th, 2.0)); }
  void main() {
    vec2 p = vUv - 0.5;
    float d = length(p) * 2.0;       // 0 centre .. 1 edge
    if (d > 1.0) discard;
    // One expanding ring per event: fades in fast, holds, fades near the edge.
    float t = fract(uTime * 0.18 + vPhase);
    float r = mix(0.12, 0.94, t);
    float fade = smoothstep(0.0, 0.12, t) * (1.0 - smoothstep(0.75, 1.0, t));
    float ringA = ring(d, r, 0.06) * fade;
    float centre = 1.0 - smoothstep(0.07, 0.13, d);
    // Keep edge-on rings (vFacing ~ 0) visible; only cull the far hemisphere.
    float horizon = smoothstep(-0.2, 0.05, vFacing);
    float a = clamp(max(centre * 0.9, ringA * 0.85), 0.0, 1.0) * horizon;
    if (a < 0.02) discard;
    gl_FragColor = vec4(mix(vColor, vec3(1.0), centre * 0.3), a);
  }
`;

// World-unit radius of a surface ripple disc; scales with magnitude so a
// quake's ripple reads as its size (globe radius is 1).
export function discRadius(mag: number): number {
  return 0.022 + Math.min(6, Math.max(0, mag - 2)) * 0.008;
}
