export const earthVertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;

  void main() {
    vUv = uv;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

export const earthFragment = /* glsl */ `
  precision highp float;

  uniform sampler2D uDayMap;
  uniform sampler2D uNightMap;
  uniform sampler2D uSpecMap;
  uniform vec3 uSunDirection;
  uniform float uHasMaps;

  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;

  void main() {
    vec3 n = normalize(vWorldNormal);
    vec3 viewDir = normalize(cameraPosition - vWorldPos);

    vec3 dayColor;
    if (uHasMaps > 0.5) {
      dayColor = texture2D(uDayMap, vUv).rgb;
    } else {
      float band = smoothstep(0.0, 0.4, abs(vUv.y - 0.5));
      vec3 ocean = vec3(0.08, 0.22, 0.42);
      vec3 land = vec3(0.22, 0.40, 0.28);
      dayColor = mix(ocean, land, band) * 1.3;
    }

    // Brighter base — almost flat lit so the whole disc reads clearly,
    // with just a touch of camera-facing emphasis to keep it 3D.
    float facing = max(dot(n, viewDir), 0.0);
    vec3 color = dayColor * (1.05 + 0.12 * facing);

    // Subtle ocean specular toward the camera centre.
    if (uHasMaps > 0.5) {
      float ocean = 1.0 - texture2D(uSpecMap, vUv).r;
      float spec = pow(facing, 18.0) * ocean;
      color += vec3(spec) * 0.2;
    }

    // No inner rim — the atmosphere shell handles the edge glow.

    // Silence the unused night map / sun direction uniforms.
    color += texture2D(uNightMap, vUv).rgb * 0.0;
    color += uSunDirection * 0.0;

    gl_FragColor = vec4(color, 1.0);
  }
`;

export const atmosphereVertex = /* glsl */ `
  varying vec3 vWorldPos;
  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

// Soft outer halo via ray–sphere geometry instead of fresnel:
//   - for each fragment we recover the view ray
//   - find the ray's closest approach distance to the planet origin
//   - brightness scales with how *close* that approach is to the
//     planet surface, falling off smoothly to zero by the time we reach
//     the outer edge of the atmosphere shell
// This eliminates the hard blue ring you get from a naïve back-facing
// fresnel shell, because the outer silhouette of the shell is the
// dimmest part, not the brightest.
export const atmosphereFragment = /* glsl */ `
  varying vec3 vWorldPos;
  uniform vec3 uSunDirection;
  uniform float uPlanetRadius;
  uniform float uAtmoRadius;

  void main() {
    vec3 rayDir = normalize(vWorldPos - cameraPosition);
    vec3 toCenter = -cameraPosition;
    float t = dot(toCenter, rayDir);
    vec3 closest = cameraPosition + rayDir * t;
    float closestDist = length(closest);

    // Distance from the planet surface, clamped to the atmosphere band.
    float band = uAtmoRadius - uPlanetRadius;
    float fromSurface = clamp(closestDist - uPlanetRadius, 0.0, band);
    float n = fromSurface / band;             // 0 at surface, 1 at outer edge
    float intensity = pow(1.0 - n, 3.0);      // bright near surface, smooth falloff

    vec3 color = vec3(0.32, 0.55, 0.95) * intensity * 0.85;
    color += uSunDirection * 0.0;
    gl_FragColor = vec4(color, 1.0);
  }
`;
