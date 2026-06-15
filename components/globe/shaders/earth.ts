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
    vec3 sunDir = normalize(uSunDirection);

    float lambert = dot(n, sunDir);
    float dayBlend = smoothstep(-0.15, 0.25, lambert);

    vec3 dayColor;
    vec3 nightColor;
    if (uHasMaps > 0.5) {
      dayColor = texture2D(uDayMap, vUv).rgb;
      nightColor = texture2D(uNightMap, vUv).rgb * 1.4;
    } else {
      // Procedural fallback when textures aren't loaded yet
      float band = smoothstep(0.0, 0.4, abs(vUv.y - 0.5));
      vec3 ocean = vec3(0.08, 0.22, 0.42);
      vec3 land = vec3(0.22, 0.40, 0.28);
      dayColor = mix(ocean, land, band) * 1.3;
      nightColor = mix(vec3(0.02, 0.04, 0.08), vec3(0.05, 0.04, 0.02), band);
    }

    // Specular glint on water (only day side)
    float spec = 0.0;
    if (uHasMaps > 0.5) {
      float ocean = 1.0 - texture2D(uSpecMap, vUv).r;
      vec3 viewDir = normalize(cameraPosition - vWorldPos);
      vec3 halfDir = normalize(sunDir + viewDir);
      spec = pow(max(dot(n, halfDir), 0.0), 48.0) * ocean * max(lambert, 0.0);
    }

    vec3 color = mix(nightColor, dayColor, dayBlend) + vec3(spec) * 0.6;

    // Atmospheric scattering near the terminator (sunset/sunrise glow)
    float terminator = smoothstep(-0.35, 0.15, lambert) * (1.0 - smoothstep(0.0, 0.35, lambert));
    color += vec3(1.0, 0.55, 0.25) * terminator * 0.18;

    // Subtle rim
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float rim = pow(1.0 - max(dot(n, viewDir), 0.0), 2.5);
    color += vec3(0.35, 0.55, 0.95) * rim * 0.25;

    gl_FragColor = vec4(color, 1.0);
  }
`;

export const atmosphereVertex = /* glsl */ `
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;
  void main() {
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

export const atmosphereFragment = /* glsl */ `
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;
  uniform vec3 uSunDirection;

  void main() {
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    vec3 n = normalize(vWorldNormal);
    float fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 1.8);
    float sunDot = dot(n, normalize(uSunDirection));
    float sunFactor = clamp(sunDot * 0.5 + 0.6, 0.0, 1.0);
    // Rayleigh-like blue on sunlit side, warm orange on terminator
    vec3 dayColor = vec3(0.35, 0.6, 1.0);
    vec3 termColor = vec3(1.0, 0.55, 0.3);
    float terminator = smoothstep(-0.3, 0.0, sunDot) * (1.0 - smoothstep(0.0, 0.3, sunDot));
    vec3 color = mix(dayColor * 0.5, dayColor, sunFactor) + termColor * terminator * 0.8;
    gl_FragColor = vec4(color, fresnel * 1.1);
  }
`;
