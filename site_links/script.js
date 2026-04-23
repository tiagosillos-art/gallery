if (!window.THREE) console.error('Three.js não carregado');

// Nesta versão o site usa apenas arquivos do próprio domínio.
// A lista das artes vem de ./artes/index.json
// Isso evita dependência de api.github.com e raw.githubusercontent.com.

const ARTES_INDEX_URL = './artes/index.json';
const ARTES_BASE_PATH = './artes/';
const DEPTH_LAYERS = 4;
const MAX_WIDTH = 1760;
const MAX_HEIGHT = 1760;
const GLOBAL_SPEED_MULTIPLIER = 1.0; // 30% mais lento

let layers = [];
let textures = [];
let loaded = 0;
let lastTime = 0;
let camera;
let animationStarted = false;

const LAYER_CONFIG = [
  { scale: 1.0, speed: 56, opacity: 0.97, direction: 'rightToLeft' },
  { scale: 1.0, speed: 28, opacity: 0.97, direction: 'leftToRight' },
  { scale: 1.0, speed: 42, opacity: 0.97, direction: 'topToBottom' },
  { scale: 1.0, speed: 49, opacity: 0.97, direction: 'bottomToTop' }
];

let currentOrder = [0, 1, 2, 3];

const container = document.getElementById('container');
const loadingEl = document.getElementById('loading');
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

async function fetchLocalJpgList() {
  const response = await fetch(ARTES_INDEX_URL, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`Não foi possível ler ${ARTES_INDEX_URL} (${response.status})`);
  }

  const items = await response.json();

  if (!Array.isArray(items)) {
    throw new Error('O arquivo artes/index.json não está em formato de lista');
  }

  const jpgFiles = items
    .filter((item) => typeof item === 'string')
    .filter((name) => name.toLowerCase().endsWith('.jpg'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  if (!jpgFiles.length) {
    throw new Error('Nenhum .jpg encontrado em artes/index.json');
  }

  return jpgFiles.map((name) => ({
    name,
    url: `${ARTES_BASE_PATH}${encodeURIComponent(name)}`
  }));
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

  if (textures.length > 0) fillViewport();
}

window.addEventListener('resize', resize);
resize();

const loader = new THREE.TextureLoader();
loader.setCrossOrigin('anonymous');

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
    direction: cfg.direction
  };

  scene.add(sprite);
  layers[layerIndex].push(sprite);
}

function fillViewport() {
  clearSprites();
  const distributed = splitTexturesAcrossLayers(textures);

  distributed.forEach((layerTextures, layerIndex) => {
    if (!layerTextures.length) return;
    const cfg = LAYER_CONFIG[currentOrder[layerIndex]];
    const screenW = container.clientWidth;
    const screenH = container.clientHeight;
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
      addSprite(layerIndex, texture, i);
    }
  });
}

function animate(time) {
  requestAnimationFrame(animate);
  if (!animationStarted) return;

  if (!lastTime) lastTime = time;
  const delta = Math.min((time - lastTime) / 1000, 0.05);
  lastTime = time;

  const screenW = container.clientWidth;
  const screenH = container.clientHeight;

  for (let layerIndex = 0; layerIndex < layers.length; layerIndex += 1) {
    const sprites = layers[layerIndex];
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

  renderer.render(scene, camera);
}

function showError(message) {
  if (loadingEl) {
    loadingEl.innerHTML = message;
  }
  console.error(message.replace(/<br>/g, '\n'));
}

function loadTextures(imageList) {
  return new Promise((resolve, reject) => {
    if (!imageList.length) {
      reject(new Error('Nenhuma imagem para carregar'));
      return;
    }

    textures = [];
    loaded = 0;
    updateLoadingText(0, imageList.length);

    imageList.forEach((item) => {
      loader.load(
        item.url,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          textures.push(texture);
          loaded += 1;
          updateLoadingText(loaded, imageList.length);

          if (loaded === imageList.length) {
            textures.sort((a, b) => {
              const an = a.image?.currentSrc || a.image?.src || '';
              const bn = b.image?.currentSrc || b.image?.src || '';
              return an.localeCompare(bn, undefined, { numeric: true, sensitivity: 'base' });
            });
            resolve();
          }
        },
        undefined,
        (error) => {
          console.error('Falha ao carregar', item.url, error);
          loaded += 1;
          updateLoadingText(loaded, imageList.length);
          if (loaded === imageList.length) {
            if (textures.length) resolve();
            else reject(new Error('Nenhuma imagem pôde ser carregada'));
          }
        }
      );
    });
  });
}

(async function init() {
  try {
    const imageList = await fetchLocalJpgList();
    await loadTextures(imageList);
    fillViewport();
    animationStarted = true;
    if (loadingEl) loadingEl.style.display = 'none';
  } catch (error) {
    showError([
      'Não foi possível carregar as artes.',
      `Motivo: ${error.message}`,
      'Gere ou atualize o arquivo ./artes/index.json com os nomes dos JPGs da pasta.'
    ].join('<br>'));
  }
})();

requestAnimationFrame(animate);
