export const earthVertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPos;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
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
  varying vec3 vNormal;
  varying vec3 vWorldPos;

  void main() {
    vec3 n = normalize(vNormal);
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
      dayColor = mix(vec3(0.05, 0.18, 0.35), vec3(0.18, 0.32, 0.18), band);
      nightColor = vec3(0.01, 0.02, 0.05);
    }

    // Specular glint on water (only day side)
    float spec = 0.0;
    if (uHasMaps > 0.5) {
      float ocean = 1.0 - texture2D(uSpecMap, vUv).r;
      vec3 viewDir = normalize(cameraPosition - vWorldPos);
      vec3 halfDir = normalize(sunDir + viewDir);
      spec = pow(max(dot(n, halfDir), 0.0), 48.0) * ocean * max(lambert, 0.0);
    }

    vec3 color = mix(nightColor, dayColor, dayBlend) + vec3(spec) * 0.4;

    // Subtle rim
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float rim = pow(1.0 - max(dot(n, viewDir), 0.0), 2.5);
    color += vec3(0.25, 0.45, 0.85) * rim * 0.18;

    gl_FragColor = vec4(color, 1.0);
  }
`;

export const atmosphereVertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

export const atmosphereFragment = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  uniform vec3 uSunDirection;

  void main() {
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float fresnel = pow(1.0 - max(dot(normalize(vNormal), viewDir), 0.0), 2.0);
    float sunFactor = clamp(dot(normalize(vNormal), normalize(uSunDirection)) * 0.5 + 0.6, 0.0, 1.0);
    vec3 color = mix(vec3(0.15, 0.35, 0.85), vec3(0.55, 0.75, 1.0), sunFactor);
    gl_FragColor = vec4(color, fresnel * 0.9);
  }
`;
