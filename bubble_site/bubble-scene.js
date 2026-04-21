import * as THREE from "https://esm.sh/three@0.166.1";

const CONFIG = {
  sceneBg: 0x16355b,
  maxPixelRatio: 1.35,
  flowPulseDecay: 1.65,
  pointerFlowRadius: 0.78,
  pointerFlowStrength: 0.42,
  flowMapSize: 192,
  flowMapParticles: 180,
  flowMapFrameSkip: 2,
  flowMapFadeAlpha: 0.085,
  flowMapDarkSpeed: 0.95,
  flowMapBrightSpeed: 0.32,

  particleCount: 7600,
  particleSizeMin: 1.95,
  particleSizeMax: 16.8,
  particlePointScale: 7.0,
  particleDamping: 0.988,
  particleMaxSpeed: 0.78,
  particleDriftStrength: 0.014,
  particleDriftFreqX: 0.36,
  particleDriftFreqY: 0.31,
  influenceRadiusScale: 8.4,
  particleRepulsion: 0.008,
  particleSwirl: 0.52,
  particleDragFromBubbleVelocity: 0.05,

  bubbleDrive: 1.18,
  bubbleSpeedResponse: 1.72,
  bubbleTurnAmount: 0.56,
  bubbleTurnSpeedA: 0.23,
  bubbleTurnSpeedB: 0.12,

  bubbleProximityRepulsion: 0.42,
  bubbleSeparationRadiusScale: 2.20,

  centerAvoidanceStrength: 0.12,
  centerAvoidanceRadiusScale: 0.26,

  sphereRestitution: 0.26,
  sphereWallRestitution: 0.24,
  sphereLinearDamping: 0.999,
  contactFriction: 0.012,
  wallSoftImpact: 0.52,

  softBodySpring: 7.2,
  softBodyDamping: 0.972,
  softBodyImpulse: 0.80,
  softBodySpread: 1.08,
  softBodyMaxOffset: 0.12,
  softBodyVolumePressure: 10.5,

  // Iridescência reforçada: mais presença da película sem aumentar custo de geometria
  filmStrength: 0.68,
  filmDrift: 1.10,
  fresnelBoost: 1.28,
  wobbleAmount: 0.006,
  wobbleSpeedA: 0.85,
  wobbleSpeedB: 0.66,
  wobbleSpeedC: 0.54,

  spawnPadding: 0.06,
  spawnAttempts: 420,

  audioEnabled: true,
  audioMasterGain: 0.48,
  audioPadGain: 0.085,
  audioCollisionGain: 0.16,
  audioBaseCutoff: 180,
  audioCutoffRange: 260,
  audioLfoDepth: 18,
  audioNoteBend: 1.4
};

const BUBBLE_GROUPS = [
  {
    key: "A",
    count: 1,
    radiusMin: 0.42,
    radiusMax: 1.28,
    speedMin: 0.10,
    speedMax: 0.22,
    color: 0xffffff,
    haloColor: 0xdacbff,
    opacity: 0.30,
    thickness: 0.018,
    // Faixa mais ampla para bolhas grandes
    iridescenceMin: 220,
    iridescenceMax: 520,
    haloScale: 2.8,
    segments: 30,
    normalUpdateStep: 2
  },
  {
    key: "B",
    count: 2,
    radiusMin: 0.44,
    radiusMax: 0.75,
    speedMin: 0.14,
    speedMax: 0.30,
    color: 0xffffff,
    haloColor: 0xffdff3,
    opacity: 0.27,
    thickness: 0.014,
    // Faixa mais ampla para bolhas médias
    iridescenceMin: 180,
    iridescenceMax: 420,
    haloScale: 2.4,
    segments: 24,
    normalUpdateStep: 3
  },
  {
    key: "C",
    count: 10,
    radiusMin: 0.11,
    radiusMax: 0.19,
    speedMin: 0.18,
    speedMax: 0.38,
    color: 0xffffff,
    haloColor: 0xdaf3ff,
    opacity: 0.24,
    thickness: 0.010,
    // Faixa mais ampla para bolhas pequenas
    iridescenceMin: 130,
    iridescenceMax: 300,
    haloScale: 2.1,
    segments: 16,
    normalUpdateStep: 4
  }
];

const canvas = document.getElementById("webgl");
const hint = document.getElementById("hint");
const panel = document.getElementById("panel");
const togglePanel = document.getElementById("togglePanel");

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  powerPreference: "high-performance"
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, CONFIG.maxPixelRatio));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.setClearColor(CONFIG.sceneBg, 1);

const scene = new THREE.Scene();
scene.background = new THREE.Color(CONFIG.sceneBg);
scene.fog = new THREE.FogExp2(CONFIG.sceneBg, 0.024);

const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 60);
camera.position.set(0, 0, 7);

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, CONFIG.maxPixelRatio));
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  if (particlesMat) {
    particlesMat.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio || 1, CONFIG.maxPixelRatio);
  }
}

function getViewBounds(z = 0) {
  const distance = camera.position.z - z;
  const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)) * distance;
  const halfW = halfH * camera.aspect;
  return { halfW, halfH };
}

function screenToWorld(clientX, clientY, z = 0) {
  const { halfW, halfH } = getViewBounds(z);
  return new THREE.Vector2(
    (clientX / window.innerWidth) * halfW * 2 - halfW,
    (1 - clientY / window.innerHeight) * halfH * 2 - halfH
  );
}

const FLOW = {
  maxPulses: 8,
  pulses: Array.from({ length: 8 }, () => new THREE.Vector4(999, 999, 0, -100)),
  pointerWorld: new THREE.Vector2(999, 999),
  pointerVelocity: new THREE.Vector2(),
  pointerActive: { value: 0 },
  sceneBounds: new THREE.Vector2(1, 1),
  nextPulse: 0,
  lastPointerMoveAt: -100
};

let sceneTime = 0;

const FLOW_MASK_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='1000' height='1000' viewBox='0 0 1000 1000'>
  <defs>
    <radialGradient id='g1' cx='50%' cy='50%' r='56%'>
      <stop offset='0%' stop-color='#0a2442'/>
      <stop offset='45%' stop-color='#6bbcff'/>
      <stop offset='70%' stop-color='#224a8a'/>
      <stop offset='100%' stop-color='#08111e'/>
    </radialGradient>
  </defs>
  <rect width='1000' height='1000' fill='url(#g1)'/>
  <path fill='#dfefff' fill-opacity='0.8' d='M500 70 C650 110 760 240 760 390 C760 520 680 620 560 690 C505 722 470 768 470 840 C470 905 495 945 530 980 C370 930 280 790 280 630 C280 525 326 450 398 396 C458 351 498 305 498 245 C498 181 474 132 430 92 C452 81 475 75 500 70 Z'/>
  <path fill='#96d8ff' fill-opacity='0.55' d='M500 170 C560 210 604 270 604 346 C604 430 564 493 506 556 C457 610 418 666 418 744 C418 786 428 825 447 863 C365 812 320 724 320 630 C320 558 345 497 391 446 C442 389 475 337 475 279 C475 236 465 201 448 176 C466 169 484 166 500 170 Z'/>
  <circle cx='500' cy='500' r='190' fill='#041120' fill-opacity='0.24'/>
</svg>`;

function createFlowFieldMap() {
  const size = CONFIG.flowMapSize;
  const cellSize = 8;
  const cols = Math.floor(size / cellSize);
  const rows = Math.floor(size / cellSize);

  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d", { alpha: true });

  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = maskCanvas.height = size;
  const maskCtx = maskCanvas.getContext("2d", { alpha: false });

  let brightnessGrid = Array.from({ length: rows }, () => Array(cols).fill(0.5));
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  function rebuildBrightnessGrid() {
    const data = maskCtx.getImageData(0, 0, size, size).data;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let sum = 0;
        let count = 0;
        const sx = c * cellSize;
        const sy = r * cellSize;
        const ex = Math.min(sx + cellSize, size);
        const ey = Math.min(sy + cellSize, size);

        for (let y = sy; y < ey; y++) {
          for (let x = sx; x < ex; x++) {
            const i = (y * size + x) * 4;
            const lum = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
            sum += lum;
            count++;
          }
        }

        brightnessGrid[r][c] = count ? sum / count : 0.5;
      }
    }
  }

  const maskImg = new Image();
  maskImg.onload = () => {
    maskCtx.clearRect(0, 0, size, size);
    maskCtx.drawImage(maskImg, 0, 0, size, size);
    rebuildBrightnessGrid();
  };
  maskImg.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(FLOW_MASK_SVG)}`;

  function sampleBrightness(u, v) {
    const x = THREE.MathUtils.clamp(u, 0, 0.9999);
    const y = THREE.MathUtils.clamp(v, 0, 0.9999);
    const c = Math.floor(x * cols);
    const r = Math.floor(y * rows);
    return brightnessGrid[r][c];
  }

  function wrapParticle(p) {
    if (p.x > size + 24) p.x = -24;
    else if (p.x < -24) p.x = size + 24;
    if (p.y > size + 24) p.y = -24;
    else if (p.y < -24) p.y = size + 24;
  }

  const particles = Array.from({ length: CONFIG.flowMapParticles }, () => ({
    x: Math.random() * size,
    y: Math.random() * size,
    seed: Math.random() * Math.PI * 2,
    drift: 0.72 + Math.random() * 0.56,
    jitter: 0.15 + Math.random() * 0.35
  }));

  let frame = 0;
  const worldToUv = (x, y, halfW, halfH) => ({
    x: x / (Math.max(halfW, 0.001) * 2) + 0.5,
    y: y / (Math.max(halfH, 0.001) * 2) + 0.5
  });

  function update(time, halfW, halfH) {
    frame++;
    if (frame % CONFIG.flowMapFrameSkip !== 0) return;

    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = `rgba(3, 8, 18, ${CONFIG.flowMapFadeAlpha})`;
    ctx.fillRect(0, 0, size, size);

    const baseAngle = Math.sin(time * 0.24) * 0.7 + Math.cos(time * 0.15) * 0.45;

    let pointerUv = null;
    let pointerSpeed = 0;
    if (FLOW.pointerActive.value > 0.01) {
      pointerUv = worldToUv(FLOW.pointerWorld.x, FLOW.pointerWorld.y, halfW, halfH);
      pointerSpeed = Math.min(1.5, FLOW.pointerVelocity.length() * 0.015);
    }

    for (const p of particles) {
      const prevX = p.x;
      const prevY = p.y;
      const u = prevX / size;
      const v = prevY / size;
      const brightness = sampleBrightness(u, v);

      let angle = baseAngle + Math.sin(time * 0.42 + p.seed) * 0.32 + (0.5 - brightness) * 1.4;
      let speed = THREE.MathUtils.lerp(CONFIG.flowMapDarkSpeed, CONFIG.flowMapBrightSpeed, brightness) * p.drift;

      if (pointerUv) {
        const dx = u - pointerUv.x;
        const dy = v - pointerUv.y;
        const dist = Math.hypot(dx, dy) + 1e-5;
        const falloff = FLOW.pointerActive.value * Math.exp(-(dist * dist) / 0.028);
        angle += Math.atan2(dy, dx) + Math.PI * 0.5;
        speed += falloff * (0.8 + pointerSpeed);
      }

      for (let i = 0; i < FLOW.maxPulses; i++) {
        const pulse = FLOW.pulses[i];
        const age = time - pulse.w;
        if (age < 0) continue;
        const amp = pulse.z * Math.exp(-age * CONFIG.flowPulseDecay);
        if (amp < 0.01) continue;

        const uvPulse = worldToUv(pulse.x, pulse.y, halfW, halfH);
        const dx = u - uvPulse.x;
        const dy = v - uvPulse.y;
        const dist = Math.hypot(dx, dy) + 1e-5;
        const falloff = amp * Math.exp(-(dist * dist) / (0.012 + pulse.z * 0.065));
        angle += (Math.atan2(dy, dx) + Math.PI * 0.5) * falloff * 0.9;
        speed += falloff * 1.2;
      }

      angle += Math.sin((u * 8.0 + v * 5.0) + time * 0.8 + p.seed) * p.jitter * 0.15;

      p.x += Math.cos(angle) * speed;
      p.y += Math.sin(angle) * speed;
      wrapParticle(p);

      const hueShift = 0.55 + brightness * 0.35;
      ctx.beginPath();
      ctx.strokeStyle = `rgba(${Math.round(130 + hueShift * 60)}, ${Math.round(190 + hueShift * 30)}, 255, ${0.18 + (1.0 - brightness) * 0.22})`;
      ctx.lineWidth = 0.8 + (1.0 - brightness) * 1.3;
      ctx.moveTo(prevX, prevY);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();

      if (Math.random() < 0.08) {
        ctx.fillStyle = "rgba(210, 238, 255, 0.16)";
        ctx.fillRect(p.x, p.y, 1.5, 1.5);
      }
    }

    texture.needsUpdate = true;
  }

  ctx.fillStyle = "#050912";
  ctx.fillRect(0, 0, size, size);
  texture.needsUpdate = true;

  return { canvas, texture, update };
}

const flowFieldMap = createFlowFieldMap();

function emitFlowPulse(x, y, strength = 0.4) {
  const s = THREE.MathUtils.clamp(strength, 0.08, 1.0);
  FLOW.pulses[FLOW.nextPulse].set(x, y, s, sceneTime);
  FLOW.nextPulse = (FLOW.nextPulse + 1) % FLOW.maxPulses;
}

window.addEventListener("resize", resize, { passive: true });

const hemi = new THREE.HemisphereLight(0xcfe9ff, 0x09111d, 1.0);
scene.add(hemi);

const key = new THREE.PointLight(0xffd9ef, 1.7, 24, 2);
key.position.set(2.1, 1.8, 4.4);
scene.add(key);

const fill = new THREE.PointLight(0x9dcfff, 0.9, 20, 2);
fill.position.set(-2.4, -1.3, 3.4);
scene.add(fill);

const rim = new THREE.PointLight(0xc9fff8, 1.1, 20, 2);
rim.position.set(-1.0, 2.2, 5.0);
scene.add(rim);

function makeHaloTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d");

  const g = ctx.createRadialGradient(128, 128, 8, 128, 128, 128);
  g.addColorStop(0, "rgba(255,255,255,0.20)");
  g.addColorStop(0.20, "rgba(215,240,255,0.12)");
  g.addColorStop(0.45, "rgba(255,180,240,0.06)");
  g.addColorStop(0.75, "rgba(140,150,255,0.02)");
  g.addColorStop(1, "rgba(0,0,0,0)");

  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

const haloTexture = makeHaloTexture();

function createBubbleMaterial(cfg) {
  const mat = new THREE.MeshPhysicalMaterial({
    color: cfg.color,
    transparent: true,
    opacity: cfg.opacity,
    roughness: 0.03,
    metalness: 0.0,
    transmission: 1.0,
    thickness: cfg.thickness,
    // IOR levemente maior para reforçar leitura da película
    ior: 1.06,
    iridescence: 1.0,
    iridescenceIOR: 1.12,
    iridescenceThicknessRange: [cfg.iridescenceMin, cfg.iridescenceMax],
    clearcoat: 1.0,
    clearcoatRoughness: 0.02,
    sheen: 0.6,
    sheenColor: new THREE.Color(0xffffff)
  });

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    shader.uniforms.uPhase = { value: cfg.phase };
    shader.uniforms.uRadius = { value: cfg.radius };
    shader.uniforms.uFilmStrength = { value: CONFIG.filmStrength };
    // Controle separado para abrir/fechar a intensidade da borda iridescente
    shader.uniforms.uFresnelBoost = { value: CONFIG.fresnelBoost };
    shader.uniforms.uPointerWorld = { value: FLOW.pointerWorld };
    shader.uniforms.uPointerVelocity = { value: FLOW.pointerVelocity };
    shader.uniforms.uPointerActive = FLOW.pointerActive;
    shader.uniforms.uFlowPulses = { value: FLOW.pulses };
    shader.uniforms.uSceneBounds = { value: FLOW.sceneBounds };
    shader.uniforms.uFlowMap = { value: flowFieldMap.texture };

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `
        #include <common>
        uniform float uTime;
        uniform float uPhase;
        uniform float uRadius;
        varying vec3 vWorldPos;
        varying vec3 vWorldNormal;
        `
      )
      .replace(
        "#include <begin_vertex>",
        `
        #include <begin_vertex>
        float wobA = sin(position.x * 12.0 + uTime * ${CONFIG.wobbleSpeedA.toFixed(2)} + uPhase);
        float wobB = sin(position.y * 9.0 - uTime * ${CONFIG.wobbleSpeedB.toFixed(2)} + uPhase * 1.3);
        float wobC = sin(position.z * 13.0 + uTime * ${CONFIG.wobbleSpeedC.toFixed(2)} - uPhase * 0.8);
        float wobble = (wobA + wobB + wobC) / 3.0;
        transformed += normal * wobble * uRadius * ${CONFIG.wobbleAmount.toFixed(4)};
        `
      )
      .replace(
        "#include <worldpos_vertex>",
        `
        #include <worldpos_vertex>
        vWorldPos = worldPosition.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        `
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `
        #include <common>
        uniform float uTime;
        uniform float uPhase;
        uniform float uFilmStrength;
        uniform float uFresnelBoost;
        uniform vec2 uPointerWorld;
        uniform vec2 uPointerVelocity;
        uniform float uPointerActive;
        uniform vec4 uFlowPulses[8];
        uniform vec2 uSceneBounds;
        uniform sampler2D uFlowMap;
        varying vec3 vWorldPos;
        varying vec3 vWorldNormal;
        `
      )
      .replace(
        "vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;",
        `
        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        vec3 nrm = normalize(vWorldNormal);
        // Fresnel mais aberto para a película aparecer em mais área da bolha
        float fresnel = pow(1.0 - max(dot(nrm, viewDir), 0.0), 1.75);

        vec2 flowDir = vec2(0.0);
        float flowField = 0.0;

        vec2 pointerDelta = vWorldPos.xy - uPointerWorld;
        float pointerDist = length(pointerDelta);
        float pointerRadius = 0.78;
        float pointerFalloff = uPointerActive * exp(-(pointerDist * pointerDist) / max(0.0001, pointerRadius * pointerRadius));
        float pointerSpeed = clamp(length(uPointerVelocity) * 0.22, 0.0, 1.0);
        if (pointerDist > 0.0001) {
          vec2 pointerTangent = vec2(-pointerDelta.y, pointerDelta.x) / pointerDist;
          flowDir += pointerTangent * pointerFalloff * (0.45 + pointerSpeed * 0.8);
        }
        flowField += pointerFalloff * (0.42 + pointerSpeed * 0.55);

        for (int i = 0; i < 8; i++) {
          vec4 pulse = uFlowPulses[i];
          float age = max(0.0, uTime - pulse.w);
          float life = exp(-age * 1.65);
          float amp = pulse.z * life;
          vec2 delta = vWorldPos.xy - pulse.xy;
          float dist = length(delta);
          float radiusSq = 0.10 + pulse.z * 0.85;
          float falloff = amp * exp(-(dist * dist) / max(0.0001, radiusSq));
          if (dist > 0.0001) {
            vec2 tangent = vec2(-delta.y, delta.x) / dist;
            flowDir += tangent * falloff;
          }
          flowField += falloff;
        }

        vec2 sceneUv = vWorldPos.xy / (uSceneBounds * 2.0) + 0.5;
        vec2 mapUv = fract(sceneUv + vec2(uPhase * 0.011, -uPhase * 0.009) + flowDir * 0.035);
        vec3 flowSample = texture2D(uFlowMap, mapUv).rgb;
        float flowTex = dot(flowSample, vec3(0.333333));
        float flowMask = smoothstep(0.07, 0.82, flowTex);
        vec2 texShift = (flowSample.rg - 0.5) * 0.95;

        flowField = clamp(flowField + flowMask * 0.58, 0.0, 1.55);

        float bandA = sin(vWorldPos.y * 7.0 + vWorldPos.x * 5.0 + uTime * 0.95 + uPhase + flowDir.x * 1.5 + flowField * 2.1 + texShift.x * 1.6) * 0.5 + 0.5;
        float bandB = sin(vWorldPos.x * 8.5 - vWorldPos.z * 4.0 - uTime * 0.75 + uPhase * 1.25 + flowDir.y * 1.7 + texShift.y * 1.8) * 0.5 + 0.5;
        float bandC = sin(vWorldPos.y * 10.0 + vWorldPos.z * 3.5 + uTime * 0.65 - uPhase * 1.4 + dot(flowDir, vec2(0.8, 0.6)) * 1.8 + (texShift.x + texShift.y) * 1.2) * 0.5 + 0.5;

        vec3 film1 = vec3(1.0, 0.66, 0.95);
        vec3 film2 = vec3(0.58, 0.96, 1.0);
        vec3 film3 = vec3(0.96, 0.92, 0.55);

        vec3 filmMix = mix(mix(film1, film2, bandA), film3, bandB);
        filmMix = mix(filmMix, vec3(0.84, 0.72, 1.0), bandC * 0.35);

        vec3 fluidGlow = mix(vec3(0.08, 0.28, 0.52), vec3(0.78, 0.95, 1.0), bandC);
        fluidGlow = mix(fluidGlow, vec3(0.92, 0.78, 1.0), flowMask * 0.35);
        // Reforço principal da película iridescente
        vec3 filmTint = filmMix * (uFilmStrength * (0.10 + fresnel * uFresnelBoost));
        // Leitura do flow-field influenciando a película
        filmTint += fluidGlow * (flowField * uFilmStrength * (0.07 + fresnel * 0.22));
        filmTint += flowSample * (0.04 + fresnel * 0.09) * uFilmStrength;
        // Pop extra na borda sem precisar aumentar partículas ou segmentos
        filmTint += filmMix * smoothstep(0.32, 1.0, fresnel) * (0.18 * uFilmStrength);
        vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance + filmTint;
        `
      );

    mat.userData.shader = shader;
  };

  return mat;
}

function createBubble(cfg) {
  const geometry = new THREE.SphereGeometry(cfg.radius, cfg.segments, cfg.segments);
  const posAttr = geometry.getAttribute("position");
  posAttr.setUsage(THREE.DynamicDrawUsage);

  const material = createBubbleMaterial(cfg);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(cfg.startX, cfg.startY, 0);
  scene.add(mesh);

  const halo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: haloTexture,
      color: cfg.haloColor,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.14
    })
  );

  halo.scale.set(cfg.radius * cfg.haloScale, cfg.radius * cfg.haloScale, 1);
  halo.position.set(cfg.startX, cfg.startY, -0.08);
  scene.add(halo);

  return {
    id: cfg.id,
    group: cfg.group,
    radius: cfg.radius,
    haloScale: cfg.haloScale,
    phase: cfg.phase,
    mass: Math.PI * cfg.radius * cfg.radius,
    x: cfg.startX,
    y: cfg.startY,
    vx: cfg.vx,
    vy: cfg.vy,
    heading: Math.atan2(cfg.vy, cfg.vx),
    targetSpeed: Math.hypot(cfg.vx, cfg.vy),
    speedMin: cfg.speedMin,
    speedMax: cfg.speedMax,
    spinX: cfg.spinX,
    spinY: cfg.spinY,
    normalUpdateStep: cfg.normalUpdateStep,
    mesh,
    halo,
    posAttr,
    basePositions: posAttr.array.slice(),
    vertexVel: new Float32Array(posAttr.array.length),
    audio: null,
    lastCollisionAt: -999,
    lastFlowAt: -999
  };
}

function generateBubbleConfigs() {
  const { halfW, halfH } = getViewBounds(0);
  const generated = [];
  let id = 0;

  for (const group of BUBBLE_GROUPS) {
    for (let i = 0; i < group.count; i++) {
      const radius = THREE.MathUtils.lerp(group.radiusMin, group.radiusMax, Math.random());

      let x = 0;
      let y = 0;
      let placed = false;

      for (let a = 0; a < CONFIG.spawnAttempts; a++) {
        x = THREE.MathUtils.randFloat(-halfW + radius, halfW - radius);
        y = THREE.MathUtils.randFloat(-halfH + radius, halfH - radius);

        let overlap = false;
        for (const other of generated) {
          const dx = x - other.startX;
          const dy = y - other.startY;
          const minDist = radius + other.radius + CONFIG.spawnPadding;
          if (dx * dx + dy * dy < minDist * minDist) {
            overlap = true;
            break;
          }
        }

        if (!overlap) {
          placed = true;
          break;
        }
      }

      if (!placed) {
        x = THREE.MathUtils.randFloat(-halfW + radius, halfW - radius);
        y = THREE.MathUtils.randFloat(-halfH + radius, halfH - radius);
      }

      const speed = THREE.MathUtils.lerp(group.speedMin, group.speedMax, Math.random());
      const angle = Math.random() * Math.PI * 2;

      generated.push({
        id: `${group.key}-${id++}`,
        group: group.key,
        radius,
        color: group.color,
        haloColor: group.haloColor,
        opacity: group.opacity,
        thickness: group.thickness,
        iridescenceMin: group.iridescenceMin,
        iridescenceMax: group.iridescenceMax,
        haloScale: group.haloScale,
        startX: x,
        startY: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        speedMin: group.speedMin,
        speedMax: group.speedMax,
        spinX: THREE.MathUtils.randFloatSpread(0.12),
        spinY: THREE.MathUtils.randFloatSpread(0.12),
        phase: Math.random() * Math.PI * 2,
        segments: group.segments,
        normalUpdateStep: group.normalUpdateStep
      });
    }
  }

  return generated;
}

const bubbles = generateBubbleConfigs().map(createBubble);

const particlePositions = new Float32Array(CONFIG.particleCount * 3);
const particleVel = new Float32Array(CONFIG.particleCount * 2);
const particleColors = new Float32Array(CONFIG.particleCount * 3);
const particleSizes = new Float32Array(CONFIG.particleCount);
const particleSeeds = new Float32Array(CONFIG.particleCount * 3);

const pc1 = new THREE.Color(0xffc4f6);
const pc2 = new THREE.Color(0xb6daff);
const pc3 = new THREE.Color(0xffffff);
const startBounds = getViewBounds(0);

for (let i = 0; i < CONFIG.particleCount; i++) {
  const i2 = i * 2;
  const i3 = i * 3;

  particlePositions[i3 + 0] = THREE.MathUtils.randFloatSpread(startBounds.halfW * 2);
  particlePositions[i3 + 1] = THREE.MathUtils.randFloatSpread(startBounds.halfH * 2);
  particlePositions[i3 + 2] = (Math.random() - 0.5) * 0.18;

  const m = Math.random();
  const col = m < 0.10 ? pc3 : m < 0.54 ? pc1 : pc2;
  particleColors[i3 + 0] = col.r;
  particleColors[i3 + 1] = col.g;
  particleColors[i3 + 2] = col.b;

  particleSizes[i] = CONFIG.particleSizeMin + Math.random() * (CONFIG.particleSizeMax - CONFIG.particleSizeMin);

  const a = Math.random() * Math.PI * 2;
  const s = 0.05 + Math.random() * 0.11;
  particleVel[i2 + 0] = Math.cos(a) * s;
  particleVel[i2 + 1] = Math.sin(a) * s;

  particleSeeds[i3 + 0] = Math.random() * Math.PI * 2;
  particleSeeds[i3 + 1] = 0.012 + Math.random() * 0.03;
  particleSeeds[i3 + 2] = 0.8 + Math.random() * 1.1;
}

const particlesGeo = new THREE.BufferGeometry();
particlesGeo.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
particlesGeo.setAttribute("color", new THREE.BufferAttribute(particleColors, 3));
particlesGeo.setAttribute("aSize", new THREE.BufferAttribute(particleSizes, 1));

const particlesMat = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  vertexColors: true,
  uniforms: {
    uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, CONFIG.maxPixelRatio) },
    uPointScale: { value: CONFIG.particlePointScale }
  },
  vertexShader: `
    attribute float aSize;
    varying vec3 vColor;
    uniform float uPixelRatio;
    uniform float uPointScale;

    void main() {
      vColor = color;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      gl_PointSize = aSize * uPixelRatio * (uPointScale / -mvPosition.z);
    }
  `,
  fragmentShader: `
    varying vec3 vColor;

    void main() {
      vec2 uv = gl_PointCoord - 0.5;
      float d = length(uv);
      float alpha = smoothstep(0.5, 0.0, d);
      alpha *= 0.62;
      gl_FragColor = vec4(vColor, alpha);
    }
  `
});

const particles = new THREE.Points(particlesGeo, particlesMat);
scene.add(particles);

const posAttr = particlesGeo.getAttribute("position");
const clock = new THREE.Clock();
let frameIndex = 0;

const AUDIO = {
  ctx: null,
  started: false,
  master: null,
  musicBus: null,
  collisionBus: null,
  wetGain: null,
  dryGain: null,
  convolver: null,
  delay: null,
  feedback: null,
  compressor: null
};

function midiToFreq(m) {
  return 440 * Math.pow(2, (m - 69) / 12);
}

function createImpulseResponse(ctx, duration = 2.4, decay = 2.6) {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * duration);
  const impulse = ctx.createBuffer(2, len, sr);

  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      const t = i / len;
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay);
    }
  }

  return impulse;
}

function notesForGroup(group) {
  if (group === "A") return [33, 36];
  if (group === "B") return [36, 40];
  return [40, 43];
}

function playStartTone() {
  if (!AUDIO.started || !AUDIO.ctx) return;

  const ctx = AUDIO.ctx;
  const now = ctx.currentTime;

  const osc1 = ctx.createOscillator();
  osc1.type = "triangle";
  osc1.frequency.setValueAtTime(55, now);

  const osc2 = ctx.createOscillator();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(110, now);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.12, now + 0.06);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 260;
  filter.Q.value = 0.4;

  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(gain);
  gain.connect(AUDIO.musicBus);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + 1.3);
  osc2.stop(now + 1.3);
}

function ensureAudioStarted() {
  if (!CONFIG.audioEnabled) return;

  if (!AUDIO.ctx) {
    AUDIO.ctx = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = AUDIO.ctx;

    AUDIO.master = ctx.createGain();
    AUDIO.master.gain.value = CONFIG.audioMasterGain;

    AUDIO.musicBus = ctx.createGain();
    AUDIO.musicBus.gain.value = 1.0;

    AUDIO.collisionBus = ctx.createGain();
    AUDIO.collisionBus.gain.value = 1.0;

    AUDIO.dryGain = ctx.createGain();
    AUDIO.dryGain.gain.value = 0.95;

    AUDIO.wetGain = ctx.createGain();
    AUDIO.wetGain.gain.value = 0.22;

    AUDIO.delay = ctx.createDelay(1.2);
    AUDIO.delay.delayTime.value = 0.18;

    AUDIO.feedback = ctx.createGain();
    AUDIO.feedback.gain.value = 0.14;

    AUDIO.convolver = ctx.createConvolver();
    AUDIO.convolver.buffer = createImpulseResponse(ctx);

    AUDIO.compressor = ctx.createDynamicsCompressor();
    AUDIO.compressor.threshold.value = -26;
    AUDIO.compressor.knee.value = 18;
    AUDIO.compressor.ratio.value = 4.0;
    AUDIO.compressor.attack.value = 0.003;
    AUDIO.compressor.release.value = 0.25;

    AUDIO.musicBus.connect(AUDIO.dryGain);
    AUDIO.musicBus.connect(AUDIO.delay);

    AUDIO.delay.connect(AUDIO.feedback);
    AUDIO.feedback.connect(AUDIO.delay);
    AUDIO.delay.connect(AUDIO.convolver);

    AUDIO.collisionBus.connect(AUDIO.dryGain);
    AUDIO.collisionBus.connect(AUDIO.convolver);

    AUDIO.dryGain.connect(AUDIO.compressor);
    AUDIO.convolver.connect(AUDIO.wetGain);
    AUDIO.wetGain.connect(AUDIO.compressor);
    AUDIO.compressor.connect(AUDIO.master);
    AUDIO.master.connect(ctx.destination);

    for (const b of bubbles) {
      const [n1, n2] = notesForGroup(b.group);
      const baseNote = Math.random() < 0.5 ? n1 : n2;

      const oscMain = ctx.createOscillator();
      oscMain.type = "triangle";
      oscMain.frequency.value = midiToFreq(baseNote);

      const oscSub = ctx.createOscillator();
      oscSub.type = "sine";
      oscSub.frequency.value = midiToFreq(baseNote - 12);

      const gainMain = ctx.createGain();
      gainMain.gain.value = CONFIG.audioPadGain;

      const gainSub = ctx.createGain();
      gainSub.gain.value = CONFIG.audioPadGain * 0.42;

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = CONFIG.audioBaseCutoff + Math.random() * 40;
      filter.Q.value = 0.45;

      const pan = ctx.createStereoPanner();
      pan.pan.value = 0;

      const amp = ctx.createGain();
      amp.gain.value = 0.0;

      const lfo = ctx.createOscillator();
      lfo.type = "sine";
      lfo.frequency.value = THREE.MathUtils.randFloat(0.018, 0.04);

      const lfoGain = ctx.createGain();
      lfoGain.gain.value = CONFIG.audioLfoDepth;

      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);

      oscMain.connect(gainMain);
      oscSub.connect(gainSub);
      gainMain.connect(filter);
      gainSub.connect(filter);
      filter.connect(pan);
      pan.connect(amp);
      amp.connect(AUDIO.musicBus);

      oscMain.start();
      oscSub.start();
      lfo.start();

      amp.gain.setValueAtTime(0.0, ctx.currentTime);
      amp.gain.linearRampToValueAtTime(CONFIG.audioPadGain * 0.95, ctx.currentTime + 1.5);

      b.audio = { oscMain, oscSub, filter, pan, amp };
    }
  }

  if (AUDIO.ctx.state === "suspended") AUDIO.ctx.resume();

  AUDIO.started = true;
  hint.textContent = "som ativado";
  playStartTone();

  setTimeout(() => {
    hint.style.opacity = "0.35";
  }, 1200);
}

function triggerCollisionSound(xNorm, energy = 0.4, group = "B") {
  if (!AUDIO.started || !AUDIO.ctx) return;

  const ctx = AUDIO.ctx;
  const now = ctx.currentTime;

  const notes = group === "A" ? [33, 36, 40] : group === "B" ? [36, 40, 43] : [40, 43, 45];
  const midi = notes[Math.floor(Math.random() * notes.length)];
  const freq = midiToFreq(midi);

  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(freq, now);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.84, now + 0.7);

  const sub = ctx.createOscillator();
  sub.type = "sine";
  sub.frequency.setValueAtTime(freq * 0.5, now);

  const mix = ctx.createGain();
  const subGain = ctx.createGain();
  subGain.gain.value = 0.50;

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 220 + energy * 180;
  filter.Q.value = 0.45;

  const pan = ctx.createStereoPanner();
  pan.pan.value = THREE.MathUtils.clamp(xNorm, -1, 1);

  const gain = ctx.createGain();
  const a = CONFIG.audioCollisionGain * THREE.MathUtils.clamp(energy, 0.08, 1.0);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(a, now + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);

  osc.connect(mix);
  sub.connect(subGain);
  subGain.connect(mix);
  mix.connect(filter);
  filter.connect(pan);
  pan.connect(gain);
  gain.connect(AUDIO.collisionBus);

  osc.start(now);
  sub.start(now);
  osc.stop(now + 1.15);
  sub.stop(now + 1.15);
}

function updateBubbleAudio(b, halfW, halfH, t) {
  if (!AUDIO.started || !b.audio) return;

  const speed = Math.hypot(b.vx, b.vy);
  const normSpeed = THREE.MathUtils.clamp(
    (speed - b.speedMin) / Math.max(0.0001, b.speedMax - b.speedMin),
    0,
    1
  );

  const xNorm = THREE.MathUtils.clamp(b.x / Math.max(halfW, 0.001), -1, 1);
  const yNorm = THREE.MathUtils.clamp(b.y / Math.max(halfH, 0.001), -1, 1);

  const drift = Math.sin(t * 0.10 + b.phase) * 0.18 + Math.cos(t * 0.08 - b.phase * 1.1) * 0.10;
  const detune = (drift + normSpeed * 0.08) * CONFIG.audioNoteBend;

  b.audio.oscMain.detune.setTargetAtTime(detune, AUDIO.ctx.currentTime, 0.35);
  b.audio.oscSub.detune.setTargetAtTime(-detune * 0.15, AUDIO.ctx.currentTime, 0.45);

  b.audio.filter.frequency.setTargetAtTime(
    CONFIG.audioBaseCutoff + normSpeed * CONFIG.audioCutoffRange + (1 - Math.abs(yNorm)) * 30,
    AUDIO.ctx.currentTime,
    0.28
  );

  b.audio.pan.pan.setTargetAtTime(xNorm * 0.55, AUDIO.ctx.currentTime, 0.28);

  b.audio.amp.gain.setTargetAtTime(
    CONFIG.audioPadGain * (0.82 + normSpeed * 0.22),
    AUDIO.ctx.currentTime,
    0.45
  );
}

function applyBubbleImpulse(b, nx, ny, strength) {
  const pos = b.posAttr.array;
  const base = b.basePositions;
  const vel = b.vertexVel;
  const tx = -ny;
  const ty = nx;

  for (let i = 0; i < pos.length; i += 3) {
    const bx = base[i + 0];
    const by = base[i + 1];
    const bz = base[i + 2];

    const len = Math.hypot(bx, by, bz) || 1e-6;
    const sx = bx / len;
    const sy = by / len;
    const sz = bz / len;

    const facing = sx * nx + sy * ny;
    const front = Math.pow(Math.max(facing, 0.0), 1.8) * strength;
    const back = Math.pow(Math.max(-facing, 0.0), 1.15) * strength * 0.18;
    const ring = Math.pow(Math.max(0.0, 1.0 - Math.abs(facing)), 2.0) * strength * CONFIG.softBodySpread * 0.18;

    vel[i + 0] -= sx * front;
    vel[i + 1] -= sy * front;
    vel[i + 2] -= sz * front;

    vel[i + 0] += sx * back;
    vel[i + 1] += sy * back;
    vel[i + 2] += sz * back;

    vel[i + 0] += tx * ring;
    vel[i + 1] += ty * ring;
  }
}

function updateBubbleSoftBody(b, dt) {
  const pos = b.posAttr.array;
  const base = b.basePositions;
  const vel = b.vertexVel;

  let avgRadialOffset = 0.0;
  let samples = 0;

  for (let i = 0; i < pos.length; i += 3) {
    avgRadialOffset += Math.hypot(pos[i + 0], pos[i + 1], pos[i + 2]) - Math.hypot(base[i + 0], base[i + 1], base[i + 2]);
    samples++;
  }

  avgRadialOffset /= Math.max(1, samples);
  const pressure = -avgRadialOffset * CONFIG.softBodyVolumePressure;

  for (let i = 0; i < pos.length; i += 3) {
    let px = pos[i + 0];
    let py = pos[i + 1];
    let pz = pos[i + 2];

    const bx = base[i + 0];
    const by = base[i + 1];
    const bz = base[i + 2];

    const bl = Math.hypot(bx, by, bz) || 1e-6;
    const rx = bx / bl;
    const ry = by / bl;
    const rz = bz / bl;

    vel[i + 0] += rx * pressure * dt;
    vel[i + 1] += ry * pressure * dt;
    vel[i + 2] += rz * pressure * dt;

    vel[i + 0] += (bx - px) * CONFIG.softBodySpring * dt;
    vel[i + 1] += (by - py) * CONFIG.softBodySpring * dt;
    vel[i + 2] += (bz - pz) * CONFIG.softBodySpring * dt;

    vel[i + 0] *= CONFIG.softBodyDamping;
    vel[i + 1] *= CONFIG.softBodyDamping;
    vel[i + 2] *= CONFIG.softBodyDamping;

    px += vel[i + 0] * dt;
    py += vel[i + 1] * dt;
    pz += vel[i + 2] * dt;

    const offX = px - bx;
    const offY = py - by;
    const offZ = pz - bz;
    const offLen = Math.hypot(offX, offY, offZ);

    if (offLen > CONFIG.softBodyMaxOffset * b.radius) {
      const s = (CONFIG.softBodyMaxOffset * b.radius) / offLen;
      px = bx + offX * s;
      py = by + offY * s;
      pz = bz + offZ * s;
    }

    pos[i + 0] = px;
    pos[i + 1] = py;
    pos[i + 2] = pz;
  }

  b.posAttr.needsUpdate = true;
  if (frameIndex % b.normalUpdateStep === 0) {
    b.mesh.geometry.computeVertexNormals();
  }
}

function updateBubbleDrive(b, t, dt) {
  const speed01 = 0.5 + 0.5 * Math.sin(t * 0.24 + b.phase * 1.0);
  b.targetSpeed = THREE.MathUtils.lerp(b.speedMin, b.speedMax, speed01);

  const turn =
    Math.sin(t * CONFIG.bubbleTurnSpeedA + b.phase) * CONFIG.bubbleTurnAmount +
    Math.sin(t * CONFIG.bubbleTurnSpeedB + b.phase * 1.35) * (CONFIG.bubbleTurnAmount * 0.28);

  b.heading += turn * dt * 0.18;

  const desiredX = Math.cos(b.heading);
  const desiredY = Math.sin(b.heading);

  b.vx += desiredX * CONFIG.bubbleDrive * dt;
  b.vy += desiredY * CONFIG.bubbleDrive * dt;

  const speed = Math.hypot(b.vx, b.vy);

  if (speed < 1e-5) {
    b.vx = desiredX * b.targetSpeed;
    b.vy = desiredY * b.targetSpeed;
  } else {
    const nx = b.vx / speed;
    const ny = b.vy / speed;
    const desiredVX = nx * b.targetSpeed;
    const desiredVY = ny * b.targetSpeed;
    const blend = 1.0 - Math.exp(-CONFIG.bubbleSpeedResponse * dt);
    b.vx += (desiredVX - b.vx) * blend;
    b.vy += (desiredVY - b.vy) * blend;
  }
}

let dtGlobal = 0.016;

function applyBubbleSeparationForces() {
  for (let i = 0; i < bubbles.length; i++) {
    for (let j = i + 1; j < bubbles.length; j++) {
      const a = bubbles[i];
      const b = bubbles[j];

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy) + 1e-6;
      const desired = (a.radius + b.radius) * CONFIG.bubbleSeparationRadiusScale;

      if (dist < desired) {
        const nx = dx / dist;
        const ny = dy / dist;
        const strength = Math.pow(1.0 - dist / desired, 2.0) * CONFIG.bubbleProximityRepulsion;
        const totalMass = a.mass + b.mass;

        a.vx -= nx * strength * (b.mass / totalMass);
        a.vy -= ny * strength * (b.mass / totalMass);

        b.vx += nx * strength * (a.mass / totalMass);
        b.vy += ny * strength * (a.mass / totalMass);
      }
    }
  }
}

function applyCenterAvoidanceForce(halfW, halfH) {
  const radius = Math.min(halfW, halfH) * CONFIG.centerAvoidanceRadiusScale;

  for (const b of bubbles) {
    const dist = Math.hypot(b.x, b.y) + 1e-6;
    if (dist < radius) {
      const nx = b.x / dist;
      const ny = b.y / dist;
      const strength = Math.pow(1.0 - dist / radius, 2.0) * CONFIG.centerAvoidanceStrength;
      b.vx += nx * strength;
      b.vy += ny * strength;
    }
  }
}

function updateBubbleWalls(b, halfW, halfH, nowT) {
  b.x += b.vx * dtGlobal;
  b.y += b.vy * dtGlobal;

  const minX = -halfW + b.radius;
  const maxX = halfW - b.radius;
  const minY = -halfH + b.radius;
  const maxY = halfH - b.radius;

  if (b.x < minX) {
    const impact = Math.min(1.0, Math.abs(b.vx) * CONFIG.wallSoftImpact + Math.abs(b.vy) * 0.10);
    b.x = minX;
    applyBubbleImpulse(b, 1, 0, CONFIG.softBodyImpulse * impact);
    b.vx = Math.abs(b.vx) * CONFIG.sphereWallRestitution;
    b.vy *= (1.0 - CONFIG.contactFriction * 0.08);
    b.heading = Math.atan2(b.vy, b.vx);
    if (impact > 0.10 && nowT - b.lastFlowAt > 0.035) {
      emitFlowPulse(b.x, b.y, impact * 0.9);
      b.lastFlowAt = nowT;
    }
    if (nowT - b.lastCollisionAt > 0.08) {
      triggerCollisionSound(THREE.MathUtils.clamp(b.x / Math.max(halfW, 0.001), -1, 1), impact, b.group);
      b.lastCollisionAt = nowT;
    }
  } else if (b.x > maxX) {
    const impact = Math.min(1.0, Math.abs(b.vx) * CONFIG.wallSoftImpact + Math.abs(b.vy) * 0.10);
    b.x = maxX;
    applyBubbleImpulse(b, -1, 0, CONFIG.softBodyImpulse * impact);
    b.vx = -Math.abs(b.vx) * CONFIG.sphereWallRestitution;
    b.vy *= (1.0 - CONFIG.contactFriction * 0.08);
    b.heading = Math.atan2(b.vy, b.vx);
    if (impact > 0.10 && nowT - b.lastFlowAt > 0.035) {
      emitFlowPulse(b.x, b.y, impact * 0.9);
      b.lastFlowAt = nowT;
    }
    if (nowT - b.lastCollisionAt > 0.08) {
      triggerCollisionSound(THREE.MathUtils.clamp(b.x / Math.max(halfW, 0.001), -1, 1), impact, b.group);
      b.lastCollisionAt = nowT;
    }
  }

  if (b.y < minY) {
    const impact = Math.min(1.0, Math.abs(b.vy) * CONFIG.wallSoftImpact + Math.abs(b.vx) * 0.10);
    b.y = minY;
    applyBubbleImpulse(b, 0, 1, CONFIG.softBodyImpulse * impact);
    b.vy = Math.abs(b.vy) * CONFIG.sphereWallRestitution;
    b.vx *= (1.0 - CONFIG.contactFriction * 0.08);
    b.heading = Math.atan2(b.vy, b.vx);
    if (impact > 0.10 && nowT - b.lastFlowAt > 0.035) {
      emitFlowPulse(b.x, b.y, impact * 0.9);
      b.lastFlowAt = nowT;
    }
    if (nowT - b.lastCollisionAt > 0.08) {
      triggerCollisionSound(THREE.MathUtils.clamp(b.x / Math.max(halfW, 0.001), -1, 1), impact, b.group);
      b.lastCollisionAt = nowT;
    }
  } else if (b.y > maxY) {
    const impact = Math.min(1.0, Math.abs(b.vy) * CONFIG.wallSoftImpact + Math.abs(b.vx) * 0.10);
    b.y = maxY;
    applyBubbleImpulse(b, 0, -1, CONFIG.softBodyImpulse * impact);
    b.vy = -Math.abs(b.vy) * CONFIG.sphereWallRestitution;
    b.vx *= (1.0 - CONFIG.contactFriction * 0.08);
    b.heading = Math.atan2(b.vy, b.vx);
    if (impact > 0.10 && nowT - b.lastFlowAt > 0.035) {
      emitFlowPulse(b.x, b.y, impact * 0.9);
      b.lastFlowAt = nowT;
    }
    if (nowT - b.lastCollisionAt > 0.08) {
      triggerCollisionSound(THREE.MathUtils.clamp(b.x / Math.max(halfW, 0.001), -1, 1), impact, b.group);
      b.lastCollisionAt = nowT;
    }
  }

  b.vx *= CONFIG.sphereLinearDamping;
  b.vy *= CONFIG.sphereLinearDamping;
}

function resolveBubbleCollision(a, b, nowT, halfW) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy) + 1e-8;
  const minDist = a.radius + b.radius;
  if (dist >= minDist) return;

  const nx = dx / dist;
  const ny = dy / dist;
  const overlap = minDist - dist;
  const totalMass = a.mass + b.mass;

  const correction = overlap * 0.98;
  const moveA = correction * (b.mass / totalMass);
  const moveB = correction * (a.mass / totalMass);

  a.x -= nx * moveA;
  a.y -= ny * moveA;
  b.x += nx * moveB;
  b.y += ny * moveB;

  const rvx = b.vx - a.vx;
  const rvy = b.vy - a.vy;
  const velAlongNormal = rvx * nx + rvy * ny;

  const impact = Math.min(1.0, overlap * 3.2 + Math.abs(velAlongNormal) * 0.20);

  applyBubbleImpulse(a, nx, ny, CONFIG.softBodyImpulse * impact);
  applyBubbleImpulse(b, -nx, -ny, CONFIG.softBodyImpulse * impact);

  if (velAlongNormal <= 0) {
    const invMassSum = (1 / a.mass) + (1 / b.mass);
    let j = -(1 + CONFIG.sphereRestitution) * velAlongNormal / invMassSum;
    j *= 0.82;

    const impulseX = j * nx;
    const impulseY = j * ny;

    a.vx -= impulseX / a.mass;
    a.vy -= impulseY / a.mass;
    b.vx += impulseX / b.mass;
    b.vy += impulseY / b.mass;

    const tx = rvx - velAlongNormal * nx;
    const ty = rvy - velAlongNormal * ny;
    const tLen = Math.hypot(tx, ty);

    if (tLen > 1e-6) {
      const tnx = tx / tLen;
      const tny = ty / tLen;
      const tangentVel = rvx * tnx + rvy * tny;
      let jt = -tangentVel / invMassSum;
      jt *= CONFIG.contactFriction;

      const frictionX = jt * tnx;
      const frictionY = jt * tny;

      a.vx -= frictionX / a.mass;
      a.vy -= frictionY / a.mass;
      b.vx += frictionX / b.mass;
      b.vy += frictionY / b.mass;
    }

    a.heading = Math.atan2(a.vy, a.vx);
    b.heading = Math.atan2(b.vy, b.vx);
  }

  const midX = (a.x + b.x) * 0.5;
  const midY = (a.y + b.y) * 0.5;
  const xNorm = THREE.MathUtils.clamp(midX / Math.max(halfW, 0.001), -1, 1);
  if (impact > 0.08 && (nowT - a.lastFlowAt > 0.03 || nowT - b.lastFlowAt > 0.03)) {
    emitFlowPulse(midX, midY, impact);
    a.lastFlowAt = nowT;
    b.lastFlowAt = nowT;
  }
  if (nowT - a.lastCollisionAt > 0.08 || nowT - b.lastCollisionAt > 0.08) {
    triggerCollisionSound(xNorm, impact, a.group);
    a.lastCollisionAt = nowT;
    b.lastCollisionAt = nowT;
  }
}

function armAudio() {
  ensureAudioStarted();
  window.removeEventListener("pointerdown", armAudio);
  window.removeEventListener("keydown", armAudio);
  window.removeEventListener("touchstart", armAudio);
}

window.addEventListener("pointerdown", armAudio, { passive: true });
window.addEventListener("keydown", armAudio, { passive: true });
window.addEventListener("touchstart", armAudio, { passive: true });

window.addEventListener("pointermove", (e) => {
  const now = performance.now() * 0.001;
  const world = screenToWorld(e.clientX, e.clientY);
  const dt = Math.max(0.001, now - FLOW.lastPointerMoveAt);

  if (FLOW.lastPointerMoveAt > 0) {
    FLOW.pointerVelocity.set(
      (world.x - FLOW.pointerWorld.x) / dt,
      (world.y - FLOW.pointerWorld.y) / dt
    );
  }

  FLOW.pointerWorld.copy(world);
  FLOW.pointerActive.value = 1;
  FLOW.lastPointerMoveAt = now;
}, { passive: true });

window.addEventListener("pointerleave", () => {
  FLOW.pointerActive.value = 0;
  FLOW.pointerVelocity.set(0, 0);
}, { passive: true });

function animate() {
  frameIndex++;
  dtGlobal = Math.min(clock.getDelta(), 0.033);
  const t = clock.elapsedTime;
  sceneTime = t;
  const { halfW, halfH } = getViewBounds(0);
  FLOW.sceneBounds.set(halfW, halfH);
  flowFieldMap.update(t, halfW, halfH);

  for (const b of bubbles) updateBubbleDrive(b, t, dtGlobal);

  applyBubbleSeparationForces();
  applyCenterAvoidanceForce(halfW, halfH);

  for (const b of bubbles) updateBubbleWalls(b, halfW, halfH, t);

  for (let i = 0; i < bubbles.length; i++) {
    for (let j = i + 1; j < bubbles.length; j++) {
      resolveBubbleCollision(bubbles[i], bubbles[j], t, halfW);
    }
  }

  FLOW.pointerVelocity.multiplyScalar(0.92);
  if (t - FLOW.lastPointerMoveAt > 0.16) {
    FLOW.pointerActive.value *= 0.9;
  }

  for (const b of bubbles) {
    b.mesh.position.set(b.x, b.y, 0);
    b.halo.position.set(b.x, b.y, -0.08);

    updateBubbleSoftBody(b, dtGlobal);

    b.halo.scale.set(b.radius * b.haloScale, b.radius * b.haloScale, 1);

    b.mesh.rotation.y += b.spinY * dtGlobal;
    b.mesh.rotation.x += b.spinX * dtGlobal;
    b.halo.material.rotation += 0.02 * dtGlobal;

    if (b.mesh.material.userData.shader) {
      b.mesh.material.userData.shader.uniforms.uTime.value = t;
      b.mesh.material.userData.shader.uniforms.uFilmStrength.value = CONFIG.filmStrength;
      b.mesh.material.userData.shader.uniforms.uFresnelBoost.value = CONFIG.fresnelBoost;
    }

    updateBubbleAudio(b, halfW, halfH, t);
  }

  for (let i = 0; i < CONFIG.particleCount; i++) {
    const i2 = i * 2;
    const i3 = i * 3;

    let x = posAttr.array[i3 + 0];
    let y = posAttr.array[i3 + 1];
    let vx = particleVel[i2 + 0];
    let vy = particleVel[i2 + 1];

    const phase = particleSeeds[i3 + 0];
    const zAmp = particleSeeds[i3 + 1];
    const speedMul = particleSeeds[i3 + 2];

    vx += Math.sin(t * CONFIG.particleDriftFreqX + y * 0.22 + phase) * CONFIG.particleDriftStrength * speedMul;
    vy += Math.cos(t * CONFIG.particleDriftFreqY + x * 0.18 - phase * 1.1) * CONFIG.particleDriftStrength * speedMul;

    for (const b of bubbles) {
      const dx = x - b.x;
      const dy = y - b.y;
      const dist = Math.hypot(dx, dy) + 1e-5;
      const radius = b.radius * CONFIG.influenceRadiusScale;

      if (dist < radius) {
        const nx = dx / dist;
        const ny = dy / dist;
        const tx = -ny;
        const ty = nx;
        const edge = 1.0 - dist / radius;
        const inf = Math.max(0, edge * edge);

        vx += nx * CONFIG.particleRepulsion * inf;
        vy += ny * CONFIG.particleRepulsion * inf;
        vx += tx * CONFIG.particleSwirl * inf;
        vy += ty * CONFIG.particleSwirl * inf;
        vx += b.vx * CONFIG.particleDragFromBubbleVelocity * inf;
        vy += b.vy * CONFIG.particleDragFromBubbleVelocity * inf;

        const minSurface = b.radius * 1.06;
        if (dist < minSurface) {
          x = b.x + nx * minSurface;
          y = b.y + ny * minSurface;
        }
      }
    }

    vx *= CONFIG.particleDamping;
    vy *= CONFIG.particleDamping;

    const speed = Math.hypot(vx, vy);
    if (speed > CONFIG.particleMaxSpeed) {
      const inv = CONFIG.particleMaxSpeed / speed;
      vx *= inv;
      vy *= inv;
    }

    x += vx * dtGlobal;
    y += vy * dtGlobal;

    if (x < -halfW) x = halfW;
    else if (x > halfW) x = -halfW;
    if (y < -halfH) y = halfH;
    else if (y > halfH) y = -halfH;

    posAttr.array[i3 + 0] = x;
    posAttr.array[i3 + 1] = y;
    posAttr.array[i3 + 2] = Math.sin(t * 0.55 + phase) * zAmp;

    particleVel[i2 + 0] = vx;
    particleVel[i2 + 1] = vy;
  }

  posAttr.needsUpdate = true;
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

const controls = {
  masterGain: document.getElementById("masterGain"),
  padGain: document.getElementById("padGain"),
  collisionGain: document.getElementById("collisionGain"),
  audioCutoff: document.getElementById("audioCutoff"),
  bubbleRepulsion: document.getElementById("bubbleRepulsion"),
  bubbleSeparation: document.getElementById("bubbleSeparation"),
  contactFriction: document.getElementById("contactFriction"),
  restitution: document.getElementById("restitution"),
  wallRestitution: document.getElementById("wallRestitution"),
  bubbleDrive: document.getElementById("bubbleDrive"),
  particleScale: document.getElementById("particleScale"),
  filmStrength: document.getElementById("filmStrength")
};

const values = {
  masterGain: document.getElementById("masterGainVal"),
  padGain: document.getElementById("padGainVal"),
  collisionGain: document.getElementById("collisionGainVal"),
  audioCutoff: document.getElementById("audioCutoffVal"),
  bubbleRepulsion: document.getElementById("bubbleRepulsionVal"),
  bubbleSeparation: document.getElementById("bubbleSeparationVal"),
  contactFriction: document.getElementById("contactFrictionVal"),
  restitution: document.getElementById("restitutionVal"),
  wallRestitution: document.getElementById("wallRestitutionVal"),
  bubbleDrive: document.getElementById("bubbleDriveVal"),
  particleScale: document.getElementById("particleScaleVal"),
  filmStrength: document.getElementById("filmStrengthVal")
};

function setInput(el, value) {
  el.value = value;
}

function syncPanel() {
  setInput(controls.masterGain, CONFIG.audioMasterGain);
  setInput(controls.padGain, CONFIG.audioPadGain);
  setInput(controls.collisionGain, CONFIG.audioCollisionGain);
  setInput(controls.audioCutoff, CONFIG.audioBaseCutoff);
  setInput(controls.bubbleRepulsion, CONFIG.bubbleProximityRepulsion);
  setInput(controls.bubbleSeparation, CONFIG.bubbleSeparationRadiusScale);
  setInput(controls.contactFriction, CONFIG.contactFriction);
  setInput(controls.restitution, CONFIG.sphereRestitution);
  setInput(controls.wallRestitution, CONFIG.sphereWallRestitution);
  setInput(controls.bubbleDrive, CONFIG.bubbleDrive);
  setInput(controls.particleScale, CONFIG.particlePointScale);
  setInput(controls.filmStrength, CONFIG.filmStrength);

  values.masterGain.textContent = Number(CONFIG.audioMasterGain).toFixed(2);
  values.padGain.textContent = Number(CONFIG.audioPadGain).toFixed(3);
  values.collisionGain.textContent = Number(CONFIG.audioCollisionGain).toFixed(3);
  values.audioCutoff.textContent = Number(CONFIG.audioBaseCutoff).toFixed(0);
  values.bubbleRepulsion.textContent = Number(CONFIG.bubbleProximityRepulsion).toFixed(2);
  values.bubbleSeparation.textContent = Number(CONFIG.bubbleSeparationRadiusScale).toFixed(2);
  values.contactFriction.textContent = Number(CONFIG.contactFriction).toFixed(3);
  values.restitution.textContent = Number(CONFIG.sphereRestitution).toFixed(2);
  values.wallRestitution.textContent = Number(CONFIG.sphereWallRestitution).toFixed(2);
  values.bubbleDrive.textContent = Number(CONFIG.bubbleDrive).toFixed(2);
  values.particleScale.textContent = Number(CONFIG.particlePointScale).toFixed(1);
  values.filmStrength.textContent = Number(CONFIG.filmStrength).toFixed(2);
}

function onPanelChange() {
  CONFIG.audioMasterGain = parseFloat(controls.masterGain.value);
  CONFIG.audioPadGain = parseFloat(controls.padGain.value);
  CONFIG.audioCollisionGain = parseFloat(controls.collisionGain.value);
  CONFIG.audioBaseCutoff = parseFloat(controls.audioCutoff.value);
  CONFIG.bubbleProximityRepulsion = parseFloat(controls.bubbleRepulsion.value);
  CONFIG.bubbleSeparationRadiusScale = parseFloat(controls.bubbleSeparation.value);
  CONFIG.contactFriction = parseFloat(controls.contactFriction.value);
  CONFIG.sphereRestitution = parseFloat(controls.restitution.value);
  CONFIG.sphereWallRestitution = parseFloat(controls.wallRestitution.value);
  CONFIG.bubbleDrive = parseFloat(controls.bubbleDrive.value);
  CONFIG.particlePointScale = parseFloat(controls.particleScale.value);
  CONFIG.filmStrength = parseFloat(controls.filmStrength.value);

  particlesMat.uniforms.uPointScale.value = CONFIG.particlePointScale;

  if (AUDIO.master) {
    AUDIO.master.gain.value = CONFIG.audioMasterGain;
  }

  syncPanel();
}

Object.values(controls).forEach((el) => {
  el.addEventListener("input", onPanelChange);
});

togglePanel.addEventListener("click", () => {
  const hidden = panel.style.display === "none";
  panel.style.display = hidden ? "block" : "none";
  togglePanel.textContent = hidden ? "ocultar painel" : "mostrar painel";
});

syncPanel();
hint.textContent = "clique / toque / tecla para ativar o som";
animate();
