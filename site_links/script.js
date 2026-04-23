if (!window.THREE) console.error('Three.js não carregado');

// Pasta onde o site vai procurar automaticamente todos os arquivos .jpg.
// Importante: isso só funciona se o servidor permitir listar o conteúdo da pasta via HTTP.
const IMAGE_DIRECTORY_URL = 'https://tiagosillos.art.br/site_links/artes/';

// Configurações gerais.
const DEPTH_LAYERS = 4;
const MAX_WIDTH = 260;
const MAX_HEIGHT = 260;
const GLOBAL_SPEED_MULTIPLIER = 0.7; // 30% mais lento

let layers = [];
let layerTextures = [];
let textures = [];
let loaded = 0;
let lastTime = 0;
let speedFactor = 1;
let camera;

const LAYER_CONFIG = [
  {
    scale: 1.0,
    speed: 80,
    opacity: 0.97,
    direction: 'rightToLeft'
  },
  {
    scale: 1.0,
    speed: 40,
    opacity: 0.97,
    direction: 'leftToRight'
  },
  {
    scale: 1.0,
    speed: 60,
    opacity: 0.97,
    direction: 'topToBottom'
  },
  {
    scale: 1.0,
    speed: 70,
    opacity: 0.97,
    direction: 'bottomToTop'
  }
];

let currentOrder = [0, 1, 2, 3];

const container = document.getElementById('container');
const loadingEl = document.getElementById('loading');
const uiEl = document.getElementById('ui');

const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance'
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setClearColor(0x000000, 0);
container.appendChild(renderer.domElement);

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function fallbackTexture(layerIndex) {
  const c = document.createElement('canvas');
  c.width = MAX_WIDTH;
  c.height = MAX_HEIGHT;
  const ctx = c.getContext('2d');
  ctx.fillStyle = ['#4a6572', '#344955', '#232f34', '#1c2529'][layerIndex % 4];
  ctx.fillRect(0, 0, c.width, c.height);
  return new THREE.CanvasTexture(c);
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

async function fetchJpgList(directoryUrl) {
  const response = await fetch(directoryUrl, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`Falha ao acessar a pasta (${response.status})`);
  }

  const html = await response.text();
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const anchorElements = Array.from(doc.querySelectorAll('a[href]'));
  const uniqueUrls = new Set();

  for (const anchor of anchorElements) {
    const href = anchor.getAttribute('href');
    if (!href) continue;

    let absoluteUrl;
    try {
      absoluteUrl = new URL(href, directoryUrl);
    } catch {
      continue;
    }

    if (!absoluteUrl.pathname.toLowerCase().endsWith('.jpg')) continue;
    uniqueUrls.add(absoluteUrl.href);
  }

  const urls = Array.from(uniqueUrls).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
  );

  if (!urls.length) {
    throw new Error('Nenhum arquivo .jpg foi encontrado na listagem da pasta');
  }

  return urls;
}

function updateLoadingText(current, total) {
  if (!loadingEl) return;
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  loadingEl.textContent = `Carregando imagens... ${percentage}% (${current}/${total})`;
}

function clearSprites() {
  for (const layer of layers) {
    if (!layer) continue;

    for (const sprite of layer) {
      scene.remove(sprite);
      sprite.material.dispose();
      sprite.geometry.dispose();
    }
  }

  layers = Array.from({ length: DEPTH_LAYERS }, () => []);
}

function resize() {
  const w = container.clientWidth;
  const h = container.clientHeight;

  renderer.setSize(w, h);

  if (!camera) {
    camera = new THREE.OrthographicCamera(0, w, h, 0, -1000, 1000);
    camera.position.z = 10;
  } else {
    camera.right = w;
    camera.top = h;
    camera.updateProjectionMatrix();
  }

  if (textures.length > 0) {
    fillViewport();
  }
}

window.addEventListener('resize', resize);
resize();

const loader = new THREE.TextureLoader();
loader.crossOrigin = 'anonymous';

function addSprite(layerIndex, texture, indexInLayer) {
  const cfg = LAYER_CONFIG[currentOrder[layerIndex]];
  const positionInOrder = currentOrder.indexOf(layerIndex);
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

  const sizeVariation = rand(0.85, 1.15);
  const w = width * sizeVariation * sizeMultiplier;
  const h = height * sizeVariation * sizeMultiplier;
  const spacingX = w * 1.3;
  const spacingY = h * 1.3;
  const screenW = container.clientWidth;
  const screenH = container.clientHeight;

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
    seed: rand(0, 1000),
    baseX: posX,
    baseY: posY,
    opacity: cfg.opacity,
    direction: cfg.direction,
    spacingX,
    spacingY
  };

  layers[layerIndex].push(sprite);
  scene.add(sprite);
  return sprite;
}

function fillViewport() {
  clearSprites();

  for (let layerIndex = 0; layerIndex < DEPTH_LAYERS; layerIndex++) {
    const texturesForLayer = layerTextures[layerIndex] || [];

    for (let indexInLayer = 0; indexInLayer < texturesForLayer.length; indexInLayer++) {
      addSprite(layerIndex, texturesForLayer[indexInLayer], indexInLayer);
    }
  }
}

function cleanupSprites() {
  const w = container.clientWidth;
  const h = container.clientHeight;
  const bufferZone = Math.max(w, h) * 0.5;

  for (let layerIndex = 0; layerIndex < DEPTH_LAYERS; layerIndex++) {
    const sprites = layers[layerIndex];
    if (!sprites) continue;

    for (const sprite of sprites) {
      const data = sprite.userData;

      switch (data.direction) {
        case 'rightToLeft':
          if (speedFactor >= 0 && sprite.position.x + data.width / 2 < -bufferZone) {
            sprite.position.x = w + data.width / 2 + data.spacingX;
            sprite.userData.baseX = sprite.position.x;
          } else if (speedFactor < 0 && sprite.position.x - data.width / 2 > w + bufferZone) {
            sprite.position.x = -data.width / 2 - data.spacingX;
            sprite.userData.baseX = sprite.position.x;
          }
          break;

        case 'leftToRight':
          if (speedFactor >= 0 && sprite.position.x - data.width / 2 > w + bufferZone) {
            sprite.position.x = -data.width / 2 - data.spacingX;
            sprite.userData.baseX = sprite.position.x;
          } else if (speedFactor < 0 && sprite.position.x + data.width / 2 < -bufferZone) {
            sprite.position.x = w + data.width / 2 + data.spacingX;
            sprite.userData.baseX = sprite.position.x;
          }
          break;

        case 'topToBottom':
          if (sprite.position.y + data.height / 2 < -bufferZone) {
            sprite.position.y = h + data.height / 2 + data.spacingY;
            sprite.userData.baseY = sprite.position.y;
          } else if (sprite.position.y - data.height / 2 > h + bufferZone) {
            sprite.position.y = -data.height / 2 - data.spacingY;
            sprite.userData.baseY = sprite.position.y;
          }
          break;

        case 'bottomToTop':
          if (sprite.position.y - data.height / 2 > h + bufferZone) {
            sprite.position.y = -data.height / 2 - data.spacingY;
            sprite.userData.baseY = sprite.position.y;
          } else if (sprite.position.y + data.height / 2 < -bufferZone) {
            sprite.position.y = h + data.height / 2 + data.spacingY;
            sprite.userData.baseY = sprite.position.y;
          }
          break;
      }
    }
  }
}

function reorderLayers() {
  for (let i = currentOrder.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [currentOrder[i], currentOrder[j]] = [currentOrder[j], currentOrder[i]];
  }

  fillViewport();
}

function animate() {
  const now = performance.now();
  const dt = Math.min(40, now - lastTime) / 1000;
  lastTime = now;

  cleanupSprites();

  for (const sprites of layers) {
    if (!sprites || !sprites.length) continue;

    for (const sprite of sprites) {
      const data = sprite.userData;
      const movement = data.speed * speedFactor * dt * GLOBAL_SPEED_MULTIPLIER;

      switch (data.direction) {
        case 'rightToLeft':
          sprite.position.x -= movement;
          break;
        case 'leftToRight':
          sprite.position.x += movement;
          break;
        case 'topToBottom':
          sprite.position.y += movement;
          break;
        case 'bottomToTop':
          sprite.position.y -= movement;
          break;
      }

      const pulse = 1 + Math.sin(now * 0.001 + data.seed) * 0.015;
      sprite.scale.x = data.width * pulse;
      sprite.scale.y = data.height * pulse;

      if (data.direction !== 'topToBottom' && data.direction !== 'bottomToTop') {
        sprite.position.y = data.baseY + Math.sin(now * 0.001 + data.seed) * 3;
      } else {
        sprite.position.x = data.baseX + Math.sin(now * 0.001 + data.seed) * 3;
      }

      sprite.material.opacity = data.opacity;
    }
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

let totalImagesToLoad = 0;
let animationStarted = false;

function handleTextureLoaded(currentLoaded, total) {
  updateLoadingText(currentLoaded, total);
}

function loadTexturePromise(url, fallbackLayerIndex, currentIndex, total) {
  return new Promise((resolve) => {
    loader.load(
      url,
      (texture) => {
        loaded += 1;
        handleTextureLoaded(loaded, total);
        resolve(texture);
      },
      undefined,
      () => {
        loaded += 1;
        handleTextureLoaded(loaded, total);
        resolve(fallbackTexture(fallbackLayerIndex));
      }
    );
  });
}

async function loadTextures(imageUrls) {
  totalImagesToLoad = imageUrls.length;
  loaded = 0;
  updateLoadingText(0, totalImagesToLoad);

  const texturePromises = imageUrls.map((url, index) =>
    loadTexturePromise(url, index % DEPTH_LAYERS, index, totalImagesToLoad)
  );

  textures = await Promise.all(texturePromises);
  layerTextures = splitTexturesAcrossLayers(textures);

  fillViewport();

  if (loadingEl) loadingEl.style.display = 'none';
  if (uiEl) {
    uiEl.style.display = 'block';
    uiEl.textContent = `${textures.length} imagem(ns) .jpg carregada(s) de ${IMAGE_DIRECTORY_URL}`;
  }

  if (!animationStarted) {
    lastTime = performance.now();
    animationStarted = true;
    animate();
  }
}

async function initGallery() {
  try {
    updateLoadingText(0, 0);
    const imageUrls = await fetchJpgList(IMAGE_DIRECTORY_URL);
    await loadTextures(imageUrls);
  } catch (error) {
    console.error(error);
    if (loadingEl) {
      loadingEl.innerHTML = 'Não foi possível listar os JPGs da pasta.<br>Verifique se a URL retorna a listagem dos arquivos.';
    }
  }
}

// Mantém o controle por mouse wheel, mas remove qualquer ajuste por rollover/arrasto.
container.addEventListener(
  'wheel',
  (event) => {
    event.preventDefault();
    const wheelDelta = Math.sign(event.deltaY);
    const direction = wheelDelta > 0 ? 1 : -1;
    const acceleration = 0.8;
    speedFactor = direction * (Math.abs(speedFactor) + acceleration);
    const maxSpeed = 5;
    const sign = Math.sign(speedFactor) || 1;
    const absSpeed = Math.min(maxSpeed, Math.abs(speedFactor));
    speedFactor = sign * absSpeed;
  },
  { passive: false }
);

container.addEventListener('dblclick', () => {
  reorderLayers();
});

initGallery();
