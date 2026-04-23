if (!window.THREE) console.error("Three.js non chargé");
let layers = [];
const textures = [];
let loaded = 0;
let lastTime = 0;
const DEPTH_LAYERS = 4;
const IMAGES_PER_LAYER = 15;
const MAX_WIDTH = 260;
const MAX_HEIGHT = 260;
let dragActive = !1;
let lastX = 0;
let dragVelocity = 0;
let speedFactor = 1;
const LAYER_CONFIG = [
{
  scale: 1.0,
  speed: 80,
  opacity: 0.97,
  direction: "rightToLeft" },

{
  scale: 1.0,
  speed: 40,
  opacity: 0.97,
  direction: "leftToRight" },

{
  scale: 1.0,
  speed: 60,
  opacity: 0.97,
  direction: "topToBottom" },

{
  scale: 1.0,
  speed: 70,
  opacity: 0.97,
  direction: "bottomToTop" }];


let currentOrder = [0, 1, 2, 3];
const CATEGORIES = [
{
  name: "Portraits",
  paths: [
  "https://images.unsplash.com/photo-1773595033901-56a266cc560c?w=300",
  "https://images.unsplash.com/photo-1773595034105-4a53b9280308?w=300",
  "https://images.unsplash.com/photo-1773595033981-22a60bf90aec?w=300",
  "https://images.unsplash.com/photo-1773595033919-43d0376aa741?w=300",
  "https://images.unsplash.com/photo-1773595030566-95ac0d53e990?w=300",
  "https://images.unsplash.com/photo-1773595034077-886893001125?w=300",
  "https://images.unsplash.com/photo-1773595033904-cae0f805eb85?w=300",
  "https://images.unsplash.com/photo-1773595029618-d573300c37fa?w=300",
  "https://images.unsplash.com/photo-1773595030887-a785ae699d35?w=300",
  "https://images.unsplash.com/photo-1773595030191-3e89c9b51f19?w=300",
  "https://images.unsplash.com/photo-1773595030285-7d840fdf3816?w=300",
  "https://images.unsplash.com/photo-1773595030879-f3b7e2f25eb5?w=300",
  "https://images.unsplash.com/photo-1773595029417-aa0b95d60e1e?w=300",
  "https://images.unsplash.com/photo-1773595033781-7a0da392b846?w=300",
  "https://images.unsplash.com/photo-1773595031186-2d0a9942da77?w=300"] },


{
  name: "Nature",
  paths: [
  "https://images.unsplash.com/photo-1773594025563-fce89689da8f?w=300",
  "https://images.unsplash.com/photo-1773594033283-3e4aac301abd?w=300",
  "https://images.unsplash.com/photo-1773594032355-bde85e45c353?w=300",
  "https://images.unsplash.com/photo-1773594028953-852b1ac22dc0?w=300",
  "https://images.unsplash.com/photo-1773594031166-eb042b81dce4?w=300",
  "https://images.unsplash.com/photo-1773594033665-3f602e8deb73?w=300",
  "https://images.unsplash.com/photo-1773594032030-2f7ca2a37bc8?w=300",
  "https://images.unsplash.com/photo-1773594032238-748479c367b5?w=300",
  "https://images.unsplash.com/photo-1773594029595-a80da0f39392?w=300",
  "https://images.unsplash.com/photo-1773594033211-bcf8f18c87c3?w=300",
  "https://images.unsplash.com/photo-1773594025559-f0d3efd65765?w=300",
  "https://images.unsplash.com/photo-1773594032413-4bfa77cb559c?w=300",
  "https://images.unsplash.com/photo-1773594030129-b311b88464c1?w=300",
  "https://images.unsplash.com/photo-1773594031161-3033f596ec04?w=300",
  "https://images.unsplash.com/photo-1773594030104-dc5412ab91fb?w=300"] },


{
  name: "Urbain",
  paths: [
  "https://images.unsplash.com/photo-1773591718347-bb31a1fcc13a?w=300",
  "https://images.unsplash.com/photo-1773591720032-1de2b8b53b12?w=300",
  "https://images.unsplash.com/photo-1773591720231-f5214b3b8fe8?w=300",
  "https://images.unsplash.com/photo-1773591718648-413311ce4f35?w=300",
  "https://images.unsplash.com/photo-1773591720464-e32143310c97?w=300",
  "https://images.unsplash.com/photo-1773591720294-3331a29636d3?w=300",
  "https://images.unsplash.com/photo-1773591721533-272d5fe1bdc8?w=300",
  "https://images.unsplash.com/photo-1773591721447-8e5c607e273d?w=300",
  "https://images.unsplash.com/photo-1773591718321-a5e45192c414?w=300",
  "https://images.unsplash.com/photo-1773591718534-a7534eae13e7?w=300",
  "https://images.unsplash.com/photo-1773591721139-ab93d0f1fd23?w=300",
  "https://images.unsplash.com/photo-1773591721423-0ed401d10b4d?w=300",
  "https://images.unsplash.com/photo-1773591721423-f12ab6f33412?w=300",
  "https://images.unsplash.com/photo-1773591720398-ee23883ce120?w=300",
  "https://images.unsplash.com/photo-1773591720215-67b63ec9d03b?w=300"] },


{
  name: "Art",
  paths: [
  "https://images.unsplash.com/photo-1755223738909-e2931502e69b?w=300",
  "https://images.unsplash.com/photo-1755223740754-0c02f566bd3e?w=300",
  "https://images.unsplash.com/photo-1755223740569-155fc48ee218?w=300",
  "https://images.unsplash.com/photo-1755223740383-cd0508052bd6?w=300",
  "https://images.unsplash.com/photo-1755223740184-ffd9c3052627?w=300",
  "https://images.unsplash.com/photo-1755223739755-c48db2ca0961?w=300",
  "https://images.unsplash.com/photo-1755223740024-be178ccd22e9?w=300",
  "https://images.unsplash.com/photo-1755223739990-a1425f2e555f?w=300",
  "https://images.unsplash.com/photo-1755223739234-71775b0e7a26?w=300",
  "https://images.unsplash.com/photo-1755223738985-d7ca7894cab5?w=300",
  "https://images.unsplash.com/photo-1755223738930-9a35be3f9013?w=300",
  "https://images.unsplash.com/photo-1755223739292-ced0db1c3441?w=300",
  "https://images.unsplash.com/photo-1755223738901-1de87bf5ad32?w=300",
  "https://images.unsplash.com/photo-1755223738421-f2627c13ee28?w=300",
  "https://images.unsplash.com/photo-1755223739648-de4fa003895c?w=300"] }];



let categoryImages = [[], [], [], []];
let categoryIndex = [0, 0, 0, 0];
for (let i = 0; i < DEPTH_LAYERS; i++) {
  categoryImages[i] = [...CATEGORIES[i].paths];
  for (let j = categoryImages[i].length - 1; j > 0; j--) {
    const k = Math.floor(Math.random() * (j + 1));
    [categoryImages[i][j], categoryImages[i][k]] = [
    categoryImages[i][k],
    categoryImages[i][j]];

  }
}
console.log("&Toc on codepen - https://codepen.io/ol-ivier");

function getNextImageForLayer(layerIndex) {
  if (categoryIndex[layerIndex] >= categoryImages[layerIndex].length) {
    categoryImages[layerIndex] = [...CATEGORIES[layerIndex].paths];
    for (let j = categoryImages[layerIndex].length - 1; j > 0; j--) {
      const k = Math.floor(Math.random() * (j + 1));
      [categoryImages[layerIndex][j], categoryImages[layerIndex][k]] = [
      categoryImages[layerIndex][k],
      categoryImages[layerIndex][j]];

    }
    categoryIndex[layerIndex] = 0;
  }
  const image = categoryImages[layerIndex][categoryIndex[layerIndex]];
  categoryIndex[layerIndex]++;
  return image;
}
const container = document.getElementById("container");
const loadingEl = document.getElementById("loading");
const uiEl = document.getElementById("ui");
const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({
  antialias: !0,
  alpha: !0,
  powerPreference: "high-performance" });

renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setClearColor(0x000000, 0);
container.appendChild(renderer.domElement);
let camera;

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function fallbackTexture(layer) {
  const c = document.createElement("canvas");
  c.width = MAX_WIDTH;
  c.height = MAX_HEIGHT;
  const ctx = c.getContext("2d");
  ctx.fillStyle = ["#4a6572", "#344955", "#232f34", "#1c2529"][layer];
  ctx.fillRect(0, 0, c.width, c.height);
  return new THREE.CanvasTexture(c);
}
for (let l = 0; l < DEPTH_LAYERS; l++) {
  layers[l] = [];
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
  for (const layer of layers) {
    if (!layer) continue;
    for (const s of layer) {
      scene.remove(s);
      if (s.material.map) s.material.map.dispose();
      s.material.dispose();
      s.geometry.dispose();
    }
  }
  layers = [];
  for (let l = 0; l < DEPTH_LAYERS; l++) layers[l] = [];
  if (textures.length === DEPTH_LAYERS * IMAGES_PER_LAYER) fillViewport();
}
window.addEventListener("resize", resize);
resize();
const loader = new THREE.TextureLoader();
loader.crossOrigin = "anonymous";
const TOTAL = DEPTH_LAYERS * IMAGES_PER_LAYER;

function loadAll() {
  for (let l = 0; l < DEPTH_LAYERS; l++) {
    for (let i = 0; i < IMAGES_PER_LAYER; i++) {
      const path = getNextImageForLayer(l);
      loader.load(
      path,
      tex => onLoaded(tex),
      undefined,
      () => onLoaded(fallbackTexture(l)));

    }
  }
}

function onLoaded(tex) {
  textures.push(tex);
  loaded++;
  loadingEl.textContent = `Chargement ${Math.round(loaded / TOTAL * 100)}%`;
  if (loaded === TOTAL) initSprites();
}

function initSprites() {
  fillViewport();
  loadingEl.style.display = "none";
  uiEl.style.display = "block";
  lastTime = performance.now();
  animate();
}

function getSizeMultiplierForPosition(position) {
  const multipliers = [1.0, 0.8, 0.65, 0.5];
  return multipliers[position];
}

function addSprite(layerIndex, index) {
  const cfg = LAYER_CONFIG[currentOrder[layerIndex]];
  const texIndex = Math.floor(Math.random() * textures.length);
  const texture = textures[texIndex] || fallbackTexture(layerIndex);
  const positionInOrder = currentOrder.indexOf(layerIndex);
  const sizeMultiplier = getSizeMultiplierForPosition(positionInOrder);
  const mat = new THREE.SpriteMaterial({
    map: texture,
    transparent: !0,
    opacity: cfg.opacity });

  const sprite = new THREE.Sprite(mat);
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
  const sizeVar = rand(0.85, 1.15);
  const w = width * sizeVar * sizeMultiplier;
  const h = height * sizeVar * sizeMultiplier;
  let posX, posY;
  const spacingX = w * 1.3;
  const spacingY = h * 1.3;
  const wScreen = container.clientWidth;
  const hScreen = container.clientHeight;
  switch (cfg.direction) {
    case "rightToLeft":
      posX = index % IMAGES_PER_LAYER * spacingX;
      posY = rand(h / 2, hScreen - h / 2);
      break;
    case "leftToRight":
      posX = index % IMAGES_PER_LAYER * spacingX;
      posY = rand(h / 2, hScreen - h / 2);
      break;
    case "topToBottom":
      posX = rand(w / 2, wScreen - w / 2);
      posY = index % IMAGES_PER_LAYER * spacingY - hScreen;
      break;
    case "bottomToTop":
      posX = rand(w / 2, wScreen - w / 2);
      posY = index % IMAGES_PER_LAYER * spacingY + hScreen;
      break;
    default:
      posX = index % IMAGES_PER_LAYER * spacingX;
      posY = rand(h / 2, hScreen - h / 2);}

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
    spacingX: spacingX,
    spacingY: spacingY,
    index: index,
    sizeMultiplier: sizeMultiplier };

  layers[layerIndex].push(sprite);
  scene.add(sprite);
  return sprite;
}

function fillViewport() {
  for (let l = 0; l < DEPTH_LAYERS; l++) {
    const sprites = layers[l];
    if (sprites && sprites.length > 0) {
      for (const s of sprites) {
        scene.remove(s);
        if (s.material.map) s.material.map.dispose();
        s.material.dispose();
        s.geometry.dispose();
      }
      layers[l] = [];
    }
    for (let i = 0; i < IMAGES_PER_LAYER; i++) {
      addSprite(l, i);
    }
  }
}

function cleanupSprites() {
  const w = container.clientWidth;
  const h = container.clientHeight;
  const bufferZone = Math.max(w, h) * 0.5;
  for (let l = 0; l < DEPTH_LAYERS; l++) {
    const sprites = layers[l];
    if (!sprites) continue;
    for (let i = 0; i < sprites.length; i++) {
      const s = sprites[i];
      const ud = s.userData;
      switch (ud.direction) {
        case "rightToLeft":
          if (speedFactor >= 0 && s.position.x + ud.width / 2 < -bufferZone) {
            s.position.x = w + ud.width / 2 + ud.spacingX;
            s.userData.baseX = s.position.x;
          } else if (
          speedFactor < 0 &&
          s.position.x - ud.width / 2 > w + bufferZone)
          {
            s.position.x = -ud.width / 2 - ud.spacingX;
            s.userData.baseX = s.position.x;
          }
          break;
        case "leftToRight":
          if (speedFactor >= 0 && s.position.x - ud.width / 2 > w + bufferZone) {
            s.position.x = -ud.width / 2 - ud.spacingX;
            s.userData.baseX = s.position.x;
          } else if (speedFactor < 0 && s.position.x + ud.width / 2 < -bufferZone) {
            s.position.x = w + ud.width / 2 + ud.spacingX;
            s.userData.baseX = s.position.x;
          }
          break;
        case "topToBottom":
          if (s.position.y + ud.height / 2 < -bufferZone) {
            s.position.y = h + ud.height / 2 + ud.spacingY;
            s.userData.baseY = s.position.y;
          } else if (s.position.y - ud.height / 2 > h + bufferZone) {
            s.position.y = -ud.height / 2 - ud.spacingY;
            s.userData.baseY = s.position.y;
          }
          break;
        case "bottomToTop":
          if (s.position.y - ud.height / 2 > h + bufferZone) {
            s.position.y = -ud.height / 2 - ud.spacingY;
            s.userData.baseY = s.position.y;
          } else if (s.position.y + ud.height / 2 < -bufferZone) {
            s.position.y = h + ud.height / 2 + ud.spacingY;
            s.userData.baseY = s.position.y;
          }
          break;}

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
  const w = container.clientWidth;
  const h = container.clientHeight;
  dragVelocity *= 0.92;
  speedFactor = dragVelocity !== 0 ? Math.sign(dragVelocity) : speedFactor;
  speedFactor = Math.min(Math.max(speedFactor, -5), 5);
  cleanupSprites();
  for (const sprites of layers) {
    if (!sprites || !sprites.length) continue;
    for (const s of sprites) {
      const ud = s.userData;
      const movement = ud.speed * speedFactor * dt;
      switch (ud.direction) {
        case "rightToLeft":
          s.position.x -= movement;
          break;
        case "leftToRight":
          s.position.x += movement;
          break;
        case "topToBottom":
          s.position.y += movement;
          break;
        case "bottomToTop":
          s.position.y -= movement;
          break;}

      const pulse = 1 + Math.sin(now * 0.001 + ud.seed) * 0.015;
      s.scale.x = ud.width * pulse;
      s.scale.y = ud.height * pulse;
      if (ud.direction !== "topToBottom" && ud.direction !== "bottomToTop") {
        s.position.y = ud.baseY + Math.sin(now * 0.001 + ud.seed) * 3;
      } else {
        s.position.x = ud.baseX + Math.sin(now * 0.001 + ud.seed) * 3;
      }
      s.material.opacity = ud.opacity;
    }
  }
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
loadAll();

function getX(e) {
  return e.touches ? e.touches[0].clientX : e.clientX;
}
container.addEventListener("mousedown", e => {
  dragActive = !0;
  lastX = getX(e);
});
container.addEventListener("mousemove", e => {
  if (!dragActive) return;
  const x = getX(e);
  const dx = x - lastX;
  lastX = x;
  dragVelocity = dx * 0.02;
});
window.addEventListener("mouseup", () => {
  dragActive = !1;
});
container.addEventListener(
"touchstart",
e => {
  dragActive = !0;
  lastX = getX(e);
},
{
  passive: !0 });


container.addEventListener(
"touchmove",
e => {
  if (!dragActive) return;
  const x = getX(e);
  const dx = x - lastX;
  lastX = x;
  dragVelocity = dx * 0.02;
},
{
  passive: !0 });


window.addEventListener("touchend", () => {
  dragActive = !1;
});
container.addEventListener(
"wheel",
e => {
  e.preventDefault();
  const wheelDelta = Math.sign(e.deltaY);
  const direction = wheelDelta > 0 ? 1 : -1;
  const acceleration = 0.8;
  speedFactor = direction * (Math.abs(speedFactor) + acceleration);
  const maxSpeed = 5;
  const sign = Math.sign(speedFactor);
  const absSpeed = Math.min(maxSpeed, Math.abs(speedFactor));
  speedFactor = sign * absSpeed;
  dragVelocity = 0;
},
{
  passive: !1 });


container.addEventListener("wheel", e => e.preventDefault(), {
  passive: !1 });

container.addEventListener("dblclick", () => {
  reorderLayers();
});