import * as THREE from "https://esm.sh/three@0.160.0";

const canvas = document.getElementById("webgl");

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 20);
camera.position.set(0, 0, 5.8);
scene.add(camera);

const geometry = new THREE.SphereGeometry(1.15, 144, 112);

const uniforms = {
  uTime: { value: 0 },
  uMouse: { value: new THREE.Vector2(0, 0) },
  uOctaves: { value: 5 },
  uNoiseScale: { value: 2.65 },
  uDisplacement: { value: 0.095 },
  uFilmStrength: { value: 0.92 },
  uReflectionBoost: { value: 1.55 },
  uOpacity: { value: 0.88 },
};

const vertexShader = /* glsl */`
  uniform float uTime;
  uniform float uOctaves;
  uniform float uNoiseScale;
  uniform float uDisplacement;

  varying vec3 vWorldPos;
  varying vec3 vViewPos;
  varying float vWave;

  vec3 hash33(vec3 p) {
    p = vec3(
      dot(p, vec3(127.1, 311.7, 74.7)),
      dot(p, vec3(269.5, 183.3, 246.1)),
      dot(p, vec3(113.5, 271.9, 124.6))
    );
    return fract(sin(p) * 43758.5453123);
  }

  float noise3(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);

    float n000 = dot(hash33(i + vec3(0.0, 0.0, 0.0)) - 0.5, f - vec3(0.0, 0.0, 0.0));
    float n100 = dot(hash33(i + vec3(1.0, 0.0, 0.0)) - 0.5, f - vec3(1.0, 0.0, 0.0));
    float n010 = dot(hash33(i + vec3(0.0, 1.0, 0.0)) - 0.5, f - vec3(0.0, 1.0, 0.0));
    float n110 = dot(hash33(i + vec3(1.0, 1.0, 0.0)) - 0.5, f - vec3(1.0, 1.0, 0.0));
    float n001 = dot(hash33(i + vec3(0.0, 0.0, 1.0)) - 0.5, f - vec3(0.0, 0.0, 1.0));
    float n101 = dot(hash33(i + vec3(1.0, 0.0, 1.0)) - 0.5, f - vec3(1.0, 0.0, 1.0));
    float n011 = dot(hash33(i + vec3(0.0, 1.0, 1.0)) - 0.5, f - vec3(0.0, 1.0, 1.0));
    float n111 = dot(hash33(i + vec3(1.0, 1.0, 1.0)) - 0.5, f - vec3(1.0, 1.0, 1.0));

    float nx00 = mix(n000, n100, f.x);
    float nx10 = mix(n010, n110, f.x);
    float nx01 = mix(n001, n101, f.x);
    float nx11 = mix(n011, n111, f.x);
    float nxy0 = mix(nx00, nx10, f.y);
    float nxy1 = mix(nx01, nx11, f.y);
    return mix(nxy0, nxy1, f.z);
  }

  float fbm(vec3 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    for (int i = 0; i < 6; i++) {
      if (float(i) >= uOctaves) break;
      value += noise3(p * frequency) * amplitude;
      frequency *= 2.02;
      amplitude *= 0.52;
      p = p.yzx + vec3(13.1, 7.7, 5.3);
    }
    return value;
  }

  void main() {
    vec3 p = position;
    vec3 np = normalize(position);

    float t = uTime * 0.22;
    float n1 = fbm(np * uNoiseScale + vec3(t, t * 0.6, -t * 0.45));
    float n2 = fbm(np * (uNoiseScale * 1.95) + vec3(-t * 0.8, t * 0.3, t));
    float wave = (n1 * 0.72 + n2 * 0.28) + 0.5;

    float disp = (wave - 0.5) * uDisplacement;
    vec3 displaced = p + np * disp;

    vec4 world = modelMatrix * vec4(displaced, 1.0);
    vec4 mv = viewMatrix * world;

    vWorldPos = world.xyz;
    vViewPos = -mv.xyz;
    vWave = wave;

    gl_Position = projectionMatrix * mv;
  }
`;

const fragmentShader = /* glsl */`
  precision highp float;

  uniform float uTime;
  uniform vec2 uMouse;
  uniform float uFilmStrength;
  uniform float uReflectionBoost;
  uniform float uOpacity;

  varying vec3 vWorldPos;
  varying vec3 vViewPos;
  varying float vWave;

  vec3 spectrum(float x) {
    return clamp(vec3(
      1.5 - abs(4.0 * x - 1.0),
      1.5 - abs(4.0 * x - 2.0),
      1.5 - abs(4.0 * x - 3.0)
    ), 0.0, 1.0);
  }

  vec3 envColor(vec3 d) {
    float h = clamp(d.y * 0.5 + 0.5, 0.0, 1.0);
    vec3 skyLow = vec3(0.15, 0.32, 0.72);
    vec3 skyHigh = vec3(0.05, 0.12, 0.28);
    vec3 horizon = vec3(0.90, 0.96, 1.00);
    vec3 ground = vec3(0.03, 0.05, 0.12);

    vec3 col = mix(ground, skyLow, smoothstep(0.00, 0.58, h));
    col = mix(col, skyHigh, smoothstep(0.62, 1.00, h));

    float horizonBand = exp(-pow(abs(d.y) * 7.0, 1.18));
    col += horizon * horizonBand * 0.85;

    vec3 sunDir = normalize(vec3(-0.42, 0.74, 0.48));
    float sun = pow(max(dot(d, sunDir), 0.0), 95.0);
    col += vec3(1.35, 1.24, 1.10) * sun * 1.55;

    vec3 backDir = normalize(vec3(0.55, 0.15, -0.82));
    float backGlow = pow(max(dot(d, backDir), 0.0), 28.0);
    col += vec3(0.95, 0.62, 1.12) * backGlow * 0.24;

    return col;
  }

  void main() {
    vec3 nrm = normalize(cross(dFdx(vWorldPos), dFdy(vWorldPos)));
    if (!gl_FrontFacing) nrm *= -1.0;

    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float ndv = clamp(dot(nrm, viewDir), 0.0, 1.0);
    float fresnel = pow(1.0 - ndv, 1.65);

    vec3 reflDir = reflect(-viewDir, nrm);
    vec3 refrDir = refract(-viewDir, nrm, 1.0 / 1.12);

    reflDir.xy += uMouse * 0.08;
    refrDir.xy += uMouse * 0.04;

    vec3 reflection = envColor(normalize(reflDir));
    vec3 refraction = envColor(normalize(refrDir + nrm * ((vWave - 0.5) * 0.24)));

    float filmCoord = fract(
      vWave * 0.95 +
      fresnel * 0.82 +
      dot(nrm, normalize(vec3(0.3, 1.0, -0.18))) * 0.22 +
      uTime * 0.035
    );
    vec3 film = spectrum(filmCoord);

    float thickness = 0.55 + fresnel * 0.9 + abs(vWave - 0.5) * 0.8;
    vec3 absorb = exp(-vec3(2.2, 1.35, 1.0) * thickness * 0.72);

    vec3 ld1 = normalize(vec3(0.5, 0.9, -0.3));
    vec3 ld2 = normalize(vec3(-0.9, 0.4, -0.3));
    vec3 ld3 = normalize(vec3(-0.1, -0.9, -0.1));

    float spec1 = pow(max(dot(reflect(-ld1, nrm), viewDir), 0.0), 210.0) * 2.8 * uReflectionBoost;
    float spec2 = pow(max(dot(reflect(-ld2, nrm), viewDir), 0.0), 320.0) * 0.95 * uReflectionBoost;
    float spec3 = pow(max(dot(reflect(-ld3, nrm), viewDir), 0.0), 32.0) * 0.28 * uReflectionBoost;

    vec3 specular = vec3(1.0, 0.98, 0.96) * spec1;
    specular += vec3(0.92, 0.97, 1.0) * spec2;
    specular += vec3(0.85, 0.90, 1.0) * spec3;

    vec3 color = refraction * 0.86;
    color = mix(color, color * absorb, 0.58 + fresnel * 0.25);
    color += reflection * (0.34 + fresnel * 0.92 * uReflectionBoost);
    color += film * (uFilmStrength * (0.10 + fresnel * 1.22));
    color += film * reflection * (0.08 * uFilmStrength);
    color += specular;

    color = 1.0 - abs(color + fresnel * 0.28 - 1.0);
    color = clamp(color, 0.0, 1.0);

    float alpha = clamp(uOpacity * (0.72 + fresnel * 0.45) + (spec1 + spec2) * 0.04, 0.56, 0.97);
    gl_FragColor = vec4(color, alpha);
  }
`;

const material = new THREE.ShaderMaterial({
  uniforms,
  vertexShader,
  fragmentShader,
  transparent: true,
  depthWrite: false,
  side: THREE.FrontSide,
});

const bubble = new THREE.Mesh(geometry, material);
scene.add(bubble);

const coreMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTime: uniforms.uTime,
    uMouse: uniforms.uMouse,
    uOctaves: uniforms.uOctaves,
    uNoiseScale: uniforms.uNoiseScale,
    uDisplacement: { value: uniforms.uDisplacement.value * 0.4 },
    uFilmStrength: { value: 0.18 },
    uReflectionBoost: { value: 0.55 },
    uOpacity: { value: 0.22 },
  },
  vertexShader,
  fragmentShader,
  transparent: true,
  depthWrite: false,
  side: THREE.BackSide,
});

const core = new THREE.Mesh(geometry, coreMaterial);
core.scale.setScalar(0.965);
scene.add(core);

const halo = new THREE.Sprite(
  new THREE.SpriteMaterial({
    color: new THREE.Color(0xd9ebff),
    opacity: 0.14,
    transparent: true,
    depthWrite: false,
  }),
);
halo.scale.set(3.6, 3.6, 1);
scene.add(halo);

const pointer = new THREE.Vector2();
const pointerSmoothed = new THREE.Vector2();

window.addEventListener("pointermove", (e) => {
  const x = (e.clientX / window.innerWidth) * 2 - 1;
  const y = 1 - (e.clientY / window.innerHeight) * 2;
  pointer.set(x, y);
});

function bindRange(id, uniform, formatter = (v) => v.toFixed(2), onInput) {
  const input = document.getElementById(id);
  const value = document.getElementById(`${id}Val`);
  const sync = () => {
    const v = parseFloat(input.value);
    uniform.value = v;
    if (onInput) onInput(v);
    value.textContent = formatter(v);
  };
  input.addEventListener("input", sync);
  sync();
}

bindRange("octaves", uniforms.uOctaves, (v) => `${v}`);
bindRange("displacement", uniforms.uDisplacement, (v) => v.toFixed(3), (v) => {
  coreMaterial.uniforms.uDisplacement.value = v * 0.4;
});
bindRange("filmStrength", uniforms.uFilmStrength, (v) => v.toFixed(2), (v) => {
  coreMaterial.uniforms.uFilmStrength.value = Math.max(0.06, v * 0.2);
});
bindRange("reflectionBoost", uniforms.uReflectionBoost, (v) => v.toFixed(2), (v) => {
  coreMaterial.uniforms.uReflectionBoost.value = Math.max(0.25, v * 0.35);
});

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
resize();

const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const t = clock.getElapsedTime();
  uniforms.uTime.value = t;
  coreMaterial.uniforms.uTime.value = t;

  pointerSmoothed.lerp(pointer, 0.07);
  uniforms.uMouse.value.copy(pointerSmoothed);
  coreMaterial.uniforms.uMouse.value.copy(pointerSmoothed);

  bubble.rotation.y = t * 0.18 + pointerSmoothed.x * 0.38;
  bubble.rotation.x = pointerSmoothed.y * 0.26 + Math.sin(t * 0.5) * 0.05;
  core.rotation.copy(bubble.rotation);

  bubble.position.y = Math.sin(t * 0.7) * 0.05;
  core.position.copy(bubble.position);
  halo.position.copy(bubble.position);

  renderer.render(scene, camera);
});
