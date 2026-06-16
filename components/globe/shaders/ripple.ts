// Shared ripple-marker shader used both for loose earthquakes (anchored
// on the surface) and for the events stacked up a swarm tower. Each
// point draws a small bright epicentre dot plus N concentric rings
// expanding outward, where N and the max radius both scale with
// magnitude — an M6 throws ~5 wide rings, an M3 a single tight one.
//
// Attributes expected on the geometry:
//   position      vec3   world-space anchor of the marker
//   aMaxRipplePx  float   max ripple radius in CSS px at default dolly
//   aColor        vec3    magnitude colour
//   aMag          float   magnitude (drives ring count)
//   aPhase        float   per-marker random phase so they don't pulse
//                         in lockstep

export const rippleVertex = /* glsl */ `
  attribute float aMaxRipplePx;
  attribute vec3 aColor;
  attribute float aMag;
  attribute float aPhase;
  uniform float uPixelRatio;
  varying vec3 vColor;
  varying float vMag;
  varying float vPhase;
  varying float vPointSizePx;
  varying float vFacing;

  void main() {
    vColor = aColor;
    vMag = aMag;
    vPhase = aPhase;
    vec3 worldPos = (modelMatrix * vec4(position, 1.0)).xyz;
    vec3 toCam = normalize(cameraPosition - worldPos);
    vec3 worldNorm = normalize(worldPos);
    float facing = dot(worldNorm, toCam);
    vFacing = facing;

    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    float size = aMaxRipplePx * uPixelRatio * (4.5 / -mvPos.z);
    float clamped = clamp(size, 12.0, 120.0);
    vPointSizePx = clamped;

    float horizonMask = smoothstep(-0.02, 0.08, facing);
    gl_PointSize = clamped * horizonMask;
    gl_Position = projectionMatrix * mvPos;
  }
`;

export const rippleFragment = /* glsl */ `
  precision highp float;
  varying vec3 vColor;
  varying float vMag;
  varying float vPhase;
  varying float vPointSizePx;
  varying float vFacing;
  uniform float uTime;

  float ring(float d, float r, float thickness) {
    return exp(-pow((d - r) / thickness, 2.0));
  }

  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float d = length(p) * 2.0;
    if (d > 1.0) discard;

    float dotRadiusNorm = 4.0 / vPointSizePx;
    float edge = fwidth(d);
    float epicentre = 1.0 - smoothstep(dotRadiusNorm, dotRadiusNorm + edge * 2.5, d);

    float ringThickness = 2.2 / vPointSizePx;
    float ringStartR = dotRadiusNorm + 0.05;
    float speed = 0.4;

    // Ring count scales with magnitude: M3 -> 1, M4 -> 2, ... M7+ -> 5.
    float nRings = clamp(floor(vMag) - 2.0, 1.0, 5.0);

    float ringAlpha = 0.0;
    for (int k = 0; k < 5; k++) {
      if (float(k) >= nRings) break;
      // Per-marker phase (vPhase) desyncs markers; per-ring stagger
      // (k * 0.2) keeps the concentric rings marching outward together.
      float t = fract(uTime * speed + vPhase + float(k) * 0.2);
      float r = mix(ringStartR, 0.96, t);
      float fade = pow(1.0 - t, 1.3);
      ringAlpha += ring(d, r, ringThickness) * fade * 0.85;
    }

    float dotA = epicentre * 0.95;
    float ringA = clamp(ringAlpha, 0.0, 0.9);
    float horizonFade = smoothstep(0.0, 0.12, vFacing);
    float a = max(dotA, ringA) * horizonFade;
    if (a < 0.015) discard;

    vec3 col = mix(vColor, vec3(1.0), epicentre * 0.35);
    gl_FragColor = vec4(col, a);
  }
`;

export function rippleSizePx(mag: number): number {
  // Steeper than before so the magnitude difference is unmistakable:
  // M3 ~14px, M5 ~36px, M6 ~57px, M7 ~92px.
  return Math.max(14, Math.pow(1.6, mag - 3) * 14);
}
