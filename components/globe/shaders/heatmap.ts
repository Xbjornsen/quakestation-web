// Density heatmap shader. Each earthquake is drawn as a soft radial glow
// splat; the splats are blended purely additively (One + One) so wherever
// epicentres overlap the colour sums and the area "heats up". Sparse zones
// stay a dim ember-red, busy zones (e.g. the Pacific Ring of Fire) bloom to
// white-hot once the scene's ACES tone mapping compresses the highlights.
//
// Attributes expected on the geometry:
//   position   vec3    world-space anchor on the globe surface
//   aWeight    float   magnitude-derived heat weight (bigger quake -> more
//                      heat, both wider splat and brighter core)

export const heatmapVertex = /* glsl */ `
  attribute float aWeight;
  uniform float uPixelRatio;
  uniform float uRadiusPx;
  varying float vFacing;
  varying float vWeight;

  void main() {
    vWeight = aWeight;
    vec3 worldPos = (modelMatrix * vec4(position, 1.0)).xyz;
    vec3 toCam = normalize(cameraPosition - worldPos);
    vec3 worldNorm = normalize(worldPos);
    float facing = dot(worldNorm, toCam);
    vFacing = facing;

    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    // Splat radius grows with the heat weight and shrinks with distance,
    // matching how the ripple markers dolly with the camera.
    float size = uRadiusPx * aWeight * uPixelRatio * (4.5 / -mvPos.z);
    float clamped = clamp(size, 24.0, 260.0);

    // Hide splats curving over the horizon so the heat never bleeds through
    // the far side of the globe.
    float horizonMask = smoothstep(-0.05, 0.15, facing);
    gl_PointSize = clamped * horizonMask;
    gl_Position = projectionMatrix * mvPos;
  }
`;

export const heatmapFragment = /* glsl */ `
  precision highp float;
  varying float vFacing;
  varying float vWeight;
  uniform float uIntensity;
  uniform vec3 uColor;

  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float d = length(p) * 2.0;       // 0 at centre, 1 at edge
    if (d > 1.0) discard;

    // Smooth gaussian falloff so overlapping splats merge into continuous
    // blobs rather than hard discs.
    float g = exp(-d * d * 3.2);
    float horizonFade = smoothstep(0.0, 0.2, vFacing);
    float a = g * uIntensity * vWeight * horizonFade;

    // Premultiplied output for pure additive (One/One) blending: the rgb is
    // summed straight into the framebuffer, so dense clusters accumulate past
    // 1.0 and tone-map to a hot white core.
    gl_FragColor = vec4(uColor * a, a);
  }
`;

// Per-quake heat weight. Density still dominates (every quake contributes a
// baseline), but stronger events throw noticeably more heat.
export function heatWeight(mag: number): number {
  return Math.min(2.6, 0.6 + Math.max(0, mag - 2) * 0.28);
}
