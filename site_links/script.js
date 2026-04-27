if (!window.THREE) console.error('Three.js não carregado');

// ------------------------------------------------------------
// ARTES DEFINITIVAS
// Troque aqui somente se mudar os arquivos publicados.
// ------------------------------------------------------------
const ARTES_URLS = [
  'https://tiagosillos.art.br/site_links/artes/tela_01.jpg',
  'https://tiagosillos.art.br/site_links/artes/tela_04.jpg',
  'https://tiagosillos.art.br/site_links/artes/tela_06.jpg',
  'https://tiagosillos.art.br/site_links/artes/tela_09.jpg',
  'https://tiagosillos.art.br/site_links/artes/tela_10.jpg',
  'https://tiagosillos.art.br/site_links/artes/tela_11.jpg',
  'https://tiagosillos.art.br/site_links/artes/tela_12.jpg',
  'https://tiagosillos.art.br/site_links/artes/tela_15.jpg',
  'https://tiagosillos.art.br/site_links/artes/tela_16.jpg',
  'https://tiagosillos.art.br/site_links/artes/tela_18.jpg',
  'https://tiagosillos.art.br/site_links/artes/tela_19.jpg',
  'https://tiagosillos.art.br/site_links/artes/tela_26.jpg',
  'https://tiagosillos.art.br/site_links/artes/tela_28.jpg',
  'https://tiagosillos.art.br/site_links/artes/tela_30.jpg',
  'https://tiagosillos.art.br/site_links/artes/tela_31.jpg',
  'https://tiagosillos.art.br/site_links/artes/tela_32.jpg'
];

// ------------------------------------------------------------
// ESCALA INDIVIDUAL POR ARQUIVO
// Ajuste apenas o valor de "scale" de cada arquivo.
// 1.0 = tamanho base
// 1.2 = 20% maior
// 0.8 = 20% menor
// ------------------------------------------------------------
const ARTES_SIZE_OVERRIDES = {
  'tela_01.jpg': { scale: 0.5 },
  'tela_04.jpg': { scale: 1.0 },
  'tela_06.jpg': { scale: 1.0 },
  'tela_09.jpg': { scale: 1.0 },
  'tela_10.jpg': { scale: 1.0 },
  'tela_11.jpg': { scale: 1.0 },
  'tela_12.jpg': { scale: 1.0 },
  'tela_15.jpg': { scale: 1.0 },
  'tela_16.jpg': { scale: 1.0 },
  'tela_18.jpg': { scale: 1.0 },
  'tela_19.jpg': { scale: 3.0 },
  'tela_26.jpg': { scale: 1.0 },
  'tela_28.jpg': { scale: 1.0 },
  'tela_30.jpg': { scale: 1.0 },
  'tela_31.jpg': { scale: 1.0 },
  'tela_32.jpg': { scale: 1.0 }
};

// ------------------------------------------------------------
// CONFIGURAÇÃO DAS TELAS
// Mantive o comportamento da galeria, sem controle por rollover,
// com velocidade 30% menor.
// ------------------------------------------------------------
const DEPTH_LAYERS = 4;
const MAX_WIDTH = 260;
const MAX_HEIGHT = 260;
const GLOBAL_SPEED_MULTIPLIER = 0.7;

// Camadas de telas atrás das bolhas e na frente das bolhas.
const BACK_SCREEN_LAYER_INDICES = [0, 1];
const FRONT_SCREEN_LAYER_INDICES = [2, 3];

const SCREEN_LAYER_CONFIG = [
  { speed: 56, opacity: 0.97, direction: 'rightToLeft' },
  { speed: 28, opacity: 0.97, direction: 'leftToRight' },
  { speed: 42, opacity: 0.97, direction: 'topToBottom' },
  { speed: 49, opacity: 0.97, direction: 'bottomToTop' }
];

// ------------------------------------------------------------
// CONFIGURAÇÃO DAS BOLHAS
// Elas ficam entre as duas metades da galeria.
// ------------------------------------------------------------
const BUBBLE_CONFIG = {
  count: 8,
  minRadius: 0.10,
  maxRadius: 0.50,
  speed: 0.16,
  bounce: 0.84,
  gelAmount: 2.06,
  gelFreq: 2.90,
  gelDamping: 2.15,
  filmStrength: 1.09,
  reflectionBoost: 2.20,
  displacement: 0.047
};

const loadingEl = document.getElementById('loading');
const backContainer = document.getElementById('screens-back');
const frontContainer = document.getElementById('screens-front');
const bubblesCanvas = document.getElementById('bubbles-canvas');

let textures = [];
let loaded = 0;
let animationStarted = false;
let lastFrameTime = 0;

// ------------------------------------------------------------
// HELPERS GERAIS
// ------------------------------------------------------------
function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function getDirectImageList() {
  const jpgFiles = ARTES_URLS
    .filter((url) => typeof url === 'string')
    .filter((url) => url.toLowerCase().endsWith('.jpg'));

  if (!jpgFiles.length) {
    throw new Error('Nenhum link .jpg foi definido em ARTES_URLS');
  }

  return jpgFiles.map((url) => ({
    name: url.split('/').pop(),
    url
  }));
}

function updateLoadingText(current, total) {
  if (!loadingEl) return;
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  loadingEl.textContent = `Carregando imagens... ${percentage}% (${current}/${total})`;
}

function getSizeMultiplierForPosition(position) {
  const multipliers = [1.0, 0.8, 0.65, 0.5];
  return multipliers[position] || 1.0;
}

function splitTexturesAcrossLayers(textureList) {
  const distributed = Array.from({ length: DEPTH_LAYERS }, () => []);
  textureList.forEach((texture, index) => {
    distributed[index % DEPTH_LAYERS].push(texture);
  });
  return distributed;
}

function getSortedTextures() {
  return [...textures].sort((a, b) => {
    const an = a.image?.currentSrc || a.image?.src || '';
    const bn = b.image?.currentSrc || b.image?.src || '';
    return an.localeCompare(bn, undefined, { numeric: true, sensitivity: 'base' });
  });
}

function setTextureColorSpace(texture) {
  if (!texture) return;
  if ('colorSpace' in texture && THREE.SRGBColorSpace) {
    texture.colorSpace = THREE.SRGBColorSpace;
  } else if ('encoding' in texture && THREE.sRGBEncoding) {
    texture.encoding = THREE.sRGBEncoding;
  }
}

function loadTextureWithTimeout(loader, item, timeoutMs = 12000) {
  return new Promise((resolve) => {
    let finished = false;

    const timeoutId = setTimeout(() => {
      if (finished) return;
      finished = true;
      console.warn('Timeout ao carregar', item.url);
      resolve(null);
    }, timeoutMs);

    loader.load(
      item.url,
      (texture) => {
        if (finished) return;
        finished = true;
        clearTimeout(timeoutId);
        setTextureColorSpace(texture);
        resolve(texture);
      },
      undefined,
      (error) => {
        if (finished) return;
        finished = true;
        clearTimeout(timeoutId);
        console.error('Falha ao carregar', item.url, error);
        resolve(null);
      }
    );
  });
}

async function loadTextures(imageList) {
  if (!imageList.length) {
    throw new Error('Nenhuma imagem para carregar');
  }

  textures = [];
  loaded = 0;
  updateLoadingText(0, imageList.length);

  const loader = new THREE.TextureLoader();

  for (const item of imageList) {
    const texture = await loadTextureWithTimeout(loader, item, 12000);
    if (texture) {
      textures.push(texture);
    }
    loaded += 1;
    updateLoadingText(loaded, imageList.length);
  }

  if (!textures.length) {
    throw new Error('Nenhuma imagem pôde ser carregada');
  }

  textures = getSortedTextures();
}

function showError(message) {
  if (loadingEl) loadingEl.innerHTML = message;
  console.error(message.replace(/<br>/g, '\n'));
}

// ------------------------------------------------------------
// SISTEMA DAS TELAS
// São dois renderizadores independentes:
// - um atrás das bolhas
// - um na frente das bolhas
// Isso resolve a sobreposição do jeito que você pediu.
// ------------------------------------------------------------
function createScreenStage(container, allowedLayerIndices) {
  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.NoToneMapping;
  container.appendChild(renderer.domElement);

  const stage = {
    container,
    scene,
    renderer,
    camera: null,
    layers: Array.from({ length: DEPTH_LAYERS }, () => []),
    allowedLayerIndices
  };

  return stage;
}

const backStage = createScreenStage(backContainer, BACK_SCREEN_LAYER_INDICES);
const frontStage = createScreenStage(frontContainer, FRONT_SCREEN_LAYER_INDICES);

function clearStageSprites(stage) {
  for (const layer of stage.layers) {
    for (const sprite of layer) {
      stage.scene.remove(sprite);
      sprite.material.dispose();
      sprite.geometry.dispose();
    }
  }
  stage.layers = Array.from({ length: DEPTH_LAYERS }, () => []);
}

function resizeScreenStage(stage) {
  const w = stage.container.clientWidth;
  const h = stage.container.clientHeight;

  stage.renderer.setSize(w, h);

  if (!stage.camera) {
    stage.camera = new THREE.OrthographicCamera(0, w, h, 0, -1000, 1000);
    stage.camera.position.z = 10;
  } else {
    stage.camera.right = w;
    stage.camera.top = h;
    stage.camera.updateProjectionMatrix();
  }
}

function addScreenSprite(stage, layerIndex, texture, indexInLayer) {
  const cfg = SCREEN_LAYER_CONFIG[layerIndex];
  const positionInOrder = layerIndex;
  const sizeMultiplier = getSizeMultiplierForPosition(positionInOrder);

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: cfg.opacity
  });

  const sprite = new THREE.Sprite(material);
  const image = texture.image;
  let width = MAX_WIDTH;
  let height = MAX_HEIGHT;

  if (image && image.width && image.height) {
    const ratio = image.width / image.height;
    if (ratio > 1) {
      width = MAX_WIDTH;
      height = MAX_WIDTH / ratio;
    } else {
      height = MAX_HEIGHT;
      width = MAX_HEIGHT * ratio;
    }
  }

  const imageSrc = image?.currentSrc || image?.src || '';
  const fileName = decodeURIComponent(imageSrc.split('/').pop() || '');
  const override = ARTES_SIZE_OVERRIDES[fileName];
  const fileScale = override?.scale ?? 1.0;

  const sizeVariation = 1;
  const w = width * sizeVariation * sizeMultiplier * fileScale;
  const h = height * sizeVariation * sizeMultiplier * fileScale;
  const spacingX = w * 1.3;
  const spacingY = h * 1.3;
  const screenW = stage.container.clientWidth;
  const screenH = stage.container.clientHeight;

  let posX;
  let posY;

  switch (cfg.direction) {
    case 'rightToLeft':
      posX = indexInLayer * spacingX;
      posY = rand(h / 2, Math.max(h / 2, screenH - h / 2));
      break;
    case 'leftToRight':
      posX = indexInLayer * spacingX;
      posY = rand(h / 2, Math.max(h / 2, screenH - h / 2));
      break;
    case 'topToBottom':
      posX = rand(w / 2, Math.max(w / 2, screenW - w / 2));
      posY = indexInLayer * spacingY - screenH;
      break;
    case 'bottomToTop':
      posX = rand(w / 2, Math.max(w / 2, screenW - w / 2));
      posY = indexInLayer * spacingY + screenH;
      break;
    default:
      posX = indexInLayer * spacingX;
      posY = rand(h / 2, Math.max(h / 2, screenH - h / 2));
      break;
  }

  sprite.scale.set(w, h, 1);
  sprite.position.set(posX, posY, -layerIndex * 50);

  const speedVariation = rand(0.7, 1.3);
  sprite.userData = {
    speed: cfg.speed * speedVariation,
    width: w,
    height: h,
    direction: cfg.direction
  };

  stage.scene.add(sprite);
  stage.layers[layerIndex].push(sprite);
}

function fillScreenStage(stage) {
  clearStageSprites(stage);
  const distributed = splitTexturesAcrossLayers(textures);

  stage.allowedLayerIndices.forEach((layerIndex) => {
    const layerTextures = distributed[layerIndex];
    if (!layerTextures || !layerTextures.length) return;

    const cfg = SCREEN_LAYER_CONFIG[layerIndex];
    const screenW = stage.container.clientWidth;
    const screenH = stage.container.clientHeight;
    const sampleImage = layerTextures[0].image;
    const sampleRatio = sampleImage && sampleImage.width && sampleImage.height
      ? sampleImage.width / sampleImage.height
      : 1;

    const estimatedW = sampleRatio > 1 ? MAX_WIDTH : MAX_HEIGHT * sampleRatio;
    const estimatedH = sampleRatio > 1 ? MAX_WIDTH / sampleRatio : MAX_HEIGHT;
    const spacingX = estimatedW * 1.3;
    const spacingY = estimatedH * 1.3;

    let count;
    if (cfg.direction === 'rightToLeft' || cfg.direction === 'leftToRight') {
      count = Math.max(layerTextures.length, Math.ceil(screenW / Math.max(1, spacingX)) + 4);
    } else {
      count = Math.max(layerTextures.length, Math.ceil(screenH / Math.max(1, spacingY)) + 4);
    }

    for (let i = 0; i < count; i += 1) {
      const texture = layerTextures[i % layerTextures.length];
      addScreenSprite(stage, layerIndex, texture, i);
    }
  });
}

function updateScreenStage(stage, delta) {
  const screenW = stage.container.clientWidth;
  const screenH = stage.container.clientHeight;

  for (let layerIndex = 0; layerIndex < stage.layers.length; layerIndex += 1) {
    const sprites = stage.layers[layerIndex];
    for (let i = 0; i < sprites.length; i += 1) {
      const sprite = sprites[i];
      const data = sprite.userData;
      const move = data.speed * GLOBAL_SPEED_MULTIPLIER * delta;

      switch (data.direction) {
        case 'rightToLeft':
          sprite.position.x -= move;
          if (sprite.position.x < -data.width) {
            sprite.position.x = screenW + data.width;
            sprite.position.y = rand(data.height / 2, Math.max(data.height / 2, screenH - data.height / 2));
          }
          break;
        case 'leftToRight':
          sprite.position.x += move;
          if (sprite.position.x > screenW + data.width) {
            sprite.position.x = -data.width;
            sprite.position.y = rand(data.height / 2, Math.max(data.height / 2, screenH - data.height / 2));
          }
          break;
        case 'topToBottom':
          sprite.position.y += move;
          if (sprite.position.y > screenH + data.height) {
            sprite.position.y = -data.height;
            sprite.position.x = rand(data.width / 2, Math.max(data.width / 2, screenW - data.width / 2));
          }
          break;
        case 'bottomToTop':
          sprite.position.y -= move;
          if (sprite.position.y < -data.height) {
            sprite.position.y = screenH + data.height;
            sprite.position.x = rand(data.width / 2, Math.max(data.width / 2, screenW - data.width / 2));
          }
          break;
      }
    }
  }

  stage.renderer.render(stage.scene, stage.camera);
}

function rebuildScreens() {
  resizeScreenStage(backStage);
  resizeScreenStage(frontStage);

  if (textures.length > 0) {
    fillScreenStage(backStage);
    fillScreenStage(frontStage);
  }
}

// ------------------------------------------------------------
// SISTEMA DAS BOLHAS
// Código adaptado da sua versão aprovada.
// ------------------------------------------------------------
const bubbleRenderer = new THREE.WebGLRenderer({
  canvas: bubblesCanvas,
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance'
});

bubbleRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.0));
bubbleRenderer.outputEncoding = THREE.sRGBEncoding;
bubbleRenderer.toneMapping = THREE.NoToneMapping;

const bubbleScene = new THREE.Scene();
const bubbleCamera = new THREE.PerspectiveCamera(32, 1, 0.1, 20);
bubbleCamera.position.set(0, 0, 6.2);
bubbleScene.add(bubbleCamera);

const vertexShader = `
  uniform float uTime;
  uniform float uDisplacement;
  uniform float uPhase;
  uniform vec3 uImpactDir;
  uniform float uImpactA;
  uniform float uImpactB;

  varying vec3 vNormalW;
  varying vec3 vWorldPos;
  varying float vWave;

  float trigNoise(vec3 p) {
    return
      sin(p.x) * cos(p.y) * 0.58 +
      sin(p.y * 1.41) * cos(p.z * 1.17) * 0.42;
  }

  float fbm2(vec3 p) {
    float v = 0.0;
    v += trigNoise(p * 1.0) * 0.64;
    p = p.yzx + vec3(1.8, 2.2, 1.1);
    v += trigNoise(p * 1.95) * 0.36;
    return v;
  }

  void main() {
    vec3 n = normalize(normal);
    vec3 p = position;

    float t = uTime * 0.28;
    vec3 q = n * 2.15 + vec3(
      t + uPhase,
      -t * 0.55 + uPhase * 0.25,
      t * 0.40 - uPhase * 0.20
    );

    float wave = fbm2(q);
    float baseDisp = wave * uDisplacement;

    vec3 impactDir = normalize(uImpactDir);
    float hit = dot(n, impactDir);
    float front = smoothstep(-0.35, 0.98, hit);
    float ringPos = 1.0 - clamp(hit * 0.5 + 0.5, 0.0, 1.0);

    float ring1 = sin(ringPos * 16.0);
    float ring2 = sin(ringPos * 8.0 + 0.9);

    float impactField = front * (
      uImpactA * ring1 * 0.90 +
      uImpactB * ring2 * 0.65
    );

    float pinch = max(0.0, uImpactA) * front * 0.16;

    vec3 displaced = p;
    displaced += n * baseDisp;
    displaced += n * impactField * 0.22;
    displaced -= impactDir * pinch * 0.18;

    vec3 approxNormal = normalize(
      n +
      vec3(
        sin(q.y * 1.2 + t) * 0.08,
        cos(q.x * 1.1 - t * 0.7) * 0.08,
        sin(q.z * 1.3 + t * 0.5) * 0.08
      ) +
      impactDir * (impactField * 0.16)
    );

    vec4 world = modelMatrix * vec4(displaced, 1.0);
    vWorldPos = world.xyz;
    vNormalW = normalize(mat3(modelMatrix) * approxNormal);
    vWave = wave + impactField * 0.35;

    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragmentShader = `
  precision highp float;

  uniform float uTime;
  uniform float uFilmStrength;
  uniform float uReflectionBoost;
  uniform float uOpacity;
  uniform float uPhase;

  varying vec3 vNormalW;
  varying vec3 vWorldPos;
  varying float vWave;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 345.45));
    p += dot(p, p + 34.345);
    return fract(p.x * p.y);
  }

  vec3 spectrum(float x) {
    return clamp(vec3(
      1.22 - abs(4.0 * x - 1.0),
      1.22 - abs(4.0 * x - 2.0),
      1.22 - abs(4.0 * x - 3.0)
    ), 0.0, 1.0);
  }

  vec3 envColor(vec3 d) {
    float h = clamp(d.y * 0.5 + 0.5, 0.0, 1.0);

    vec3 skyTop = vec3(0.014, 0.028, 0.050);
    vec3 skyMid = vec3(0.028, 0.055, 0.100);
    vec3 horizon = vec3(0.14, 0.19, 0.28);
    vec3 ground = vec3(0.010, 0.016, 0.028);

    vec3 col = mix(ground, skyMid, smoothstep(0.0, 0.56, h));
    col = mix(col, skyTop, smoothstep(0.62, 1.0, h));

    float horizonBand = exp(-pow(abs(d.y) * 11.0, 1.2));
    col += horizon * horizonBand * 0.75;

    float n = hash21(floor(d.xz * 24.0 + 40.0));
    col += vec3(n) * 0.010;

    vec3 sunDir = normalize(vec3(-0.25, 0.08, 0.96));
    float sun = pow(max(dot(d, sunDir), 0.0), 180.0);
    col += vec3(0.95, 0.96, 1.0) * sun * 0.38;

    vec3 stripDir = normalize(vec3(0.82, 0.02, 0.57));
    float strip = pow(max(dot(d, stripDir), 0.0), 52.0);
    col += vec3(0.30, 0.36, 0.46) * strip * 0.12;

    return col;
  }

  void main() {
    vec3 n = normalize(vNormalW);
    vec3 viewDir = normalize(cameraPosition - vWorldPos);

    float ndv = clamp(dot(n, viewDir), 0.0, 1.0);
    float fresnel = pow(1.0 - ndv, 1.78);

    vec3 reflDir = reflect(-viewDir, n);
    vec3 refrDir = refract(-viewDir, n, 1.0 / 1.08);

    vec3 reflection = envColor(normalize(reflDir));
    vec3 refraction = envColor(normalize(refrDir + n * vWave * 0.08));

    float filmCoord = fract(
      vWave * 0.56 +
      fresnel * 0.72 +
      dot(n, normalize(vec3(0.0, 1.0, -0.08))) * 0.10 +
      uTime * 0.018 +
      uPhase * 0.09
    );

    vec3 film = spectrum(filmCoord) * vec3(0.86, 0.93, 1.0);
    float thickness = 0.44 + fresnel * 0.62 + abs(vWave) * 0.32;
    vec3 absorb = exp(-vec3(1.7, 1.20, 1.0) * thickness * 0.68);

    vec3 l1 = normalize(vec3(0.18, 0.96, 0.20));
    vec3 l2 = normalize(vec3(-0.82, 0.18, 0.54));

    float s1 = pow(max(dot(reflect(-l1, n), viewDir), 0.0), 240.0) * 1.80 * uReflectionBoost;
    float s2 = pow(max(dot(reflect(-l2, n), viewDir), 0.0), 110.0) * 0.42 * uReflectionBoost;

    vec3 spec = vec3(0.95, 0.97, 1.0) * s1;
    spec += vec3(0.70, 0.80, 0.95) * s2;

    vec3 color = refraction * 0.38;
    color = mix(color, color * absorb, 0.50 + fresnel * 0.16);
    color += reflection * (0.18 + fresnel * 0.56 * uReflectionBoost);
    color += film * (uFilmStrength * (0.035 + fresnel * 0.52));
    color += film * reflection * (0.018 * uFilmStrength);
    color += spec;

    color *= vec3(0.82, 0.87, 0.95);
    color = clamp(color, 0.0, 1.0);

    float alpha = clamp(uOpacity * (0.54 + fresnel * 0.34) + s1 * 0.015, 0.38, 0.82);
    gl_FragColor = vec4(color, alpha);
  }
`;

let bubbleGeometry = new THREE.SphereGeometry(1, 56, 42);
let bubbles = [];

const tmpVec2A = new THREE.Vector2();
const tmpVec2B = new THREE.Vector2();
const tmpVec3 = new THREE.Vector3();
const Z_AXIS = new THREE.Vector3(0, 0, 1);

function getBubbleViewBounds() {
  const distance = bubbleCamera.position.z;
  const vFov = THREE.MathUtils.degToRad(bubbleCamera.fov);
  const height = 2 * Math.tan(vFov / 2) * distance;
  const width = height * bubbleCamera.aspect;

  return {
    halfW: width * 0.47,
    halfH: height * 0.45
  };
}

function updateBubbleGeometryForCount(count) {
  bubbleGeometry.dispose();

  if (count <= 6) {
    bubbleGeometry = new THREE.SphereGeometry(1, 64, 48);
  } else if (count <= 10) {
    bubbleGeometry = new THREE.SphereGeometry(1, 56, 42);
  } else {
    bubbleGeometry = new THREE.SphereGeometry(1, 48, 36);
  }
}

function createBubbleMaterial(phase) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uDisplacement: { value: BUBBLE_CONFIG.displacement },
      uFilmStrength: { value: BUBBLE_CONFIG.filmStrength },
      uReflectionBoost: { value: BUBBLE_CONFIG.reflectionBoost },
      uOpacity: { value: 0.78 },
      uPhase: { value: phase },
      uImpactDir: { value: new THREE.Vector3(0, 0, 1) },
      uImpactA: { value: 0 },
      uImpactB: { value: 0 }
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false
  });
}

function clearBubbles() {
  for (const bubble of bubbles) {
    bubbleScene.remove(bubble.root);
    bubble.mesh.material.dispose();
    bubble.core.material.dispose();
  }
  bubbles = [];
}

function tryPlaceBubble(radius, existing, bounds) {
  for (let tries = 0; tries < 120; tries += 1) {
    const x = rand(-bounds.halfW + radius, bounds.halfW - radius);
    const y = rand(-bounds.halfH + radius, bounds.halfH - radius);

    let ok = true;
    for (const other of existing) {
      const dx = x - other.pos.x;
      const dy = y - other.pos.y;
      const minDist = radius + other.radius + 0.05;
      if (dx * dx + dy * dy < minDist * minDist) {
        ok = false;
        break;
      }
    }

    if (ok) return new THREE.Vector2(x, y);
  }

  return new THREE.Vector2(
    rand(-bounds.halfW + radius, bounds.halfW - radius),
    rand(-bounds.halfH + radius, bounds.halfH - radius)
  );
}

function rebuildBubbles() {
  clearBubbles();
  updateBubbleGeometryForCount(BUBBLE_CONFIG.count);

  const bounds = getBubbleViewBounds();

  for (let i = 0; i < BUBBLE_CONFIG.count; i += 1) {
    const radius = rand(BUBBLE_CONFIG.minRadius, BUBBLE_CONFIG.maxRadius);
    const phase = rand(0, Math.PI * 2);

    const root = new THREE.Group();
    const orient = new THREE.Group();

    const material = createBubbleMaterial(phase);
    const mesh = new THREE.Mesh(bubbleGeometry, material);

    const core = new THREE.Mesh(
      bubbleGeometry,
      new THREE.MeshBasicMaterial({
        color: 0xbfcfe8,
        transparent: true,
        opacity: 0.035,
        side: THREE.BackSide,
        depthWrite: false
      })
    );

    orient.add(mesh);
    orient.add(core);
    root.add(orient);
    bubbleScene.add(root);

    const pos = tryPlaceBubble(radius, bubbles, bounds);
    const angle = rand(0, Math.PI * 2);
    const speed = BUBBLE_CONFIG.speed * rand(0.80, 1.20);
    const vel = new THREE.Vector2(Math.cos(angle), Math.sin(angle)).multiplyScalar(speed);

    const bubble = {
      root,
      orient,
      mesh,
      core,
      radius,
      phase,
      pos,
      vel,
      mass: Math.max(0.08, radius * radius),
      spinX: rand(-0.25, 0.25),
      spinY: rand(-0.45, 0.45),
      impactAxis: new THREE.Vector3(0, 0, 1),
      targetQuat: new THREE.Quaternion(),
      mode1: 0,
      mode1Vel: 0,
      mode2: 0,
      mode2Vel: 0,
      sx: radius,
      sy: radius,
      sz: radius
    };

    root.position.set(pos.x, pos.y, 0);
    bubbles.push(bubble);
  }
}

function applyImpact(bubble, axis2D, strength) {
  if (axis2D.lengthSq() < 0.000001) return;

  const axis3D = tmpVec3.set(axis2D.x, axis2D.y, 0).normalize();
  bubble.impactAxis.copy(axis3D);

  const limitedAxis = new THREE.Vector3(
    axis3D.x * 0.12,
    axis3D.y * 0.12,
    1.0
  ).normalize();

  bubble.targetQuat.setFromUnitVectors(Z_AXIS, limitedAxis);

  bubble.mode1Vel += strength * BUBBLE_CONFIG.gelAmount * 24.0;
  bubble.mode2Vel += strength * BUBBLE_CONFIG.gelAmount * 11.0;

  bubble.mode1Vel = clamp(bubble.mode1Vel, -10.0, 10.0);
  bubble.mode2Vel = clamp(bubble.mode2Vel, -6.0, 6.0);
}

function updateBubbleVisual(bubble, dt, elapsedTime) {
  const uniforms = bubble.mesh.material.uniforms;

  uniforms.uTime.value = elapsedTime;
  uniforms.uDisplacement.value = BUBBLE_CONFIG.displacement;
  uniforms.uFilmStrength.value = BUBBLE_CONFIG.filmStrength;
  uniforms.uReflectionBoost.value = BUBBLE_CONFIG.reflectionBoost;
  uniforms.uImpactDir.value.copy(bubble.impactAxis);

  bubble.orient.quaternion.slerp(bubble.targetQuat, 0.006);

  const w1 = BUBBLE_CONFIG.gelFreq * Math.PI * 2.0;
  const w2 = BUBBLE_CONFIG.gelFreq * 0.46 * Math.PI * 2.0;
  const d1 = BUBBLE_CONFIG.gelDamping * 0.14;
  const d2 = BUBBLE_CONFIG.gelDamping * 0.05;

  bubble.mode1Vel += (-w1 * w1 * bubble.mode1 - 2.0 * d1 * w1 * bubble.mode1Vel) * dt;
  bubble.mode1 += bubble.mode1Vel * dt;

  bubble.mode2Vel += (-w2 * w2 * bubble.mode2 - 2.0 * d2 * w2 * bubble.mode2Vel) * dt;
  bubble.mode2 += bubble.mode2Vel * dt;

  uniforms.uImpactA.value = bubble.mode1;
  uniforms.uImpactB.value = bubble.mode2;

  const wobble = bubble.mode1 * 0.82 + bubble.mode2 * 0.42;
  const compress = Math.max(0.0, wobble);
  const rebound = Math.max(0.0, -wobble);

  const targetZ = bubble.radius * clamp(
    1.0 - compress * 0.18 + rebound * 0.34,
    0.88,
    1.24
  );

  const targetXY = bubble.radius * clamp(
    1.0 + compress * 0.08 - rebound * 0.12,
    0.90,
    1.10
  );

  bubble.sx = THREE.MathUtils.lerp(bubble.sx, targetXY, 0.22);
  bubble.sy = THREE.MathUtils.lerp(bubble.sy, targetXY, 0.22);
  bubble.sz = THREE.MathUtils.lerp(bubble.sz, targetZ, 0.22);

  bubble.mesh.scale.set(bubble.sx, bubble.sy, bubble.sz);
  bubble.core.scale.set(
    bubble.sx * 0.955,
    bubble.sy * 0.955,
    bubble.sz * 0.955
  );

  const offset = wobble * bubble.radius * 0.08;
  bubble.orient.position.set(
    bubble.impactAxis.x * offset,
    bubble.impactAxis.y * offset,
    0
  );

  bubble.mesh.rotation.x += dt * bubble.spinX;
  bubble.mesh.rotation.y += dt * bubble.spinY;
  bubble.core.rotation.copy(bubble.mesh.rotation);
}

function solveBubbleWalls(bubble, bounds) {
  let hitX = 0;
  let hitY = 0;

  if (bubble.pos.x < -bounds.halfW + bubble.radius) {
    bubble.pos.x = -bounds.halfW + bubble.radius;
    bubble.vel.x = Math.abs(bubble.vel.x);
    hitX = 1;
  } else if (bubble.pos.x > bounds.halfW - bubble.radius) {
    bubble.pos.x = bounds.halfW - bubble.radius;
    bubble.vel.x = -Math.abs(bubble.vel.x);
    hitX = -1;
  }

  if (bubble.pos.y < -bounds.halfH + bubble.radius) {
    bubble.pos.y = -bounds.halfH + bubble.radius;
    bubble.vel.y = Math.abs(bubble.vel.y);
    hitY = 1;
  } else if (bubble.pos.y > bounds.halfH - bubble.radius) {
    bubble.pos.y = bounds.halfH - bubble.radius;
    bubble.vel.y = -Math.abs(bubble.vel.y);
    hitY = -1;
  }

  if (hitX !== 0 || hitY !== 0) {
    const axis = new THREE.Vector2(hitX, hitY);
    if (axis.lengthSq() > 0.00001) {
      axis.normalize();
      const hitStrength = clamp(bubble.vel.length() * 0.55, 0.12, 0.36);
      applyImpact(bubble, axis, hitStrength);
    }
  }
}

function solveBubbleCollisions() {
  for (let i = 0; i < bubbles.length; i += 1) {
    const a = bubbles[i];

    for (let j = i + 1; j < bubbles.length; j += 1) {
      const b = bubbles[j];

      tmpVec2A.copy(b.pos).sub(a.pos);
      let dist = tmpVec2A.length();
      const minDist = a.radius + b.radius;

      if (dist <= 0.0001) {
        tmpVec2A.set(rand(-1, 1), rand(-1, 1)).normalize();
        dist = 0.0001;
      }

      if (dist < minDist) {
        const normal = tmpVec2A.clone().divideScalar(dist);
        const overlap = minDist - dist;
        const totalMass = a.mass + b.mass;
        const moveA = overlap * (b.mass / totalMass);
        const moveB = overlap * (a.mass / totalMass);

        a.pos.addScaledVector(normal, -moveA);
        b.pos.addScaledVector(normal, moveB);

        tmpVec2B.copy(b.vel).sub(a.vel);
        const relVelAlongNormal = tmpVec2B.dot(normal);

        if (relVelAlongNormal < 0) {
          const restitution = BUBBLE_CONFIG.bounce;
          const impulseScalar =
            -(1 + restitution) * relVelAlongNormal /
            (1 / a.mass + 1 / b.mass);

          const impulse = normal.clone().multiplyScalar(impulseScalar);

          a.vel.addScaledVector(impulse, -1 / a.mass);
          b.vel.addScaledVector(impulse, 1 / b.mass);

          a.vel.multiplyScalar(0.9985);
          b.vel.multiplyScalar(0.9985);

          const strength = clamp(
            Math.abs(relVelAlongNormal) * 0.70 + overlap * 1.10,
            0.12,
            0.55
          );

          applyImpact(a, normal.clone().multiplyScalar(-1), strength);
          applyImpact(b, normal, strength);
        }
      }
    }
  }
}

function resizeBubbles() {
  const w = window.innerWidth;
  const h = window.innerHeight;

  bubbleRenderer.setSize(w, h, false);
  bubbleCamera.aspect = w / h;
  bubbleCamera.updateProjectionMatrix();

  rebuildBubbles();
}

function updateBubbles(delta, elapsedTime) {
  const bounds = getBubbleViewBounds();

  for (const bubble of bubbles) {
    bubble.pos.addScaledVector(bubble.vel, delta);

    const currentSpeed = bubble.vel.length();
    const desired = BUBBLE_CONFIG.speed;
    if (currentSpeed > 0.0001) {
      bubble.vel.multiplyScalar(THREE.MathUtils.lerp(1.0, desired / currentSpeed, 0.025));
    }

    solveBubbleWalls(bubble, bounds);
  }

  solveBubbleCollisions();

  for (const bubble of bubbles) {
    bubble.root.position.set(bubble.pos.x, bubble.pos.y, 0);
    updateBubbleVisual(bubble, delta, elapsedTime);
  }

  bubbleRenderer.render(bubbleScene, bubbleCamera);
}

function handleResize() {
  rebuildScreens();
  resizeBubbles();
}

window.addEventListener('resize', handleResize);

// ------------------------------------------------------------
// INICIALIZAÇÃO
// ------------------------------------------------------------
(async function init() {
  try {
    const imageList = getDirectImageList();
    await loadTextures(imageList);
    handleResize();
    animationStarted = true;
    if (loadingEl) loadingEl.style.display = 'none';
  } catch (error) {
    showError([
      'Não foi possível carregar as artes.',
      `Motivo: ${error.message}`
    ].join('<br>'));
  }
})();

function animate(time) {
  requestAnimationFrame(animate);
  if (!animationStarted) return;

  if (!lastFrameTime) lastFrameTime = time;
  const delta = Math.min((time - lastFrameTime) / 1000, 0.05);
  const elapsedTime = time / 1000;
  lastFrameTime = time;

  updateScreenStage(backStage, delta);
  updateBubbles(delta, elapsedTime);
  updateScreenStage(frontStage, delta);
}

requestAnimationFrame(animate);
