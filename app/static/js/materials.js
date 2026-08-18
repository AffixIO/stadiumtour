// Credit: @paparichens
import * as THREE from "/static/vendor/three.module.js?v=arena6";

function noise(ctx, alpha = 28) {
  const { width, height } = ctx.canvas;
  const data = ctx.getImageData(0, 0, width, height);
  for (let i = 0; i < data.data.length; i += 4) {
    const n = (Math.random() - 0.5) * alpha;
    data.data[i] = Math.max(0, Math.min(255, data.data[i] + n));
    data.data[i + 1] = Math.max(0, Math.min(255, data.data[i + 1] + n));
    data.data[i + 2] = Math.max(0, Math.min(255, data.data[i + 2] + n));
  }
  ctx.putImageData(data, 0, 0);
}

function canvasTexture(size, draw, repeat = 8) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  draw(ctx, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.anisotropy = 8;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function makeAsphalt() {
  return canvasTexture(256, (ctx, size) => {
    ctx.fillStyle = "#1c2026";
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "#252a31";
    for (let i = 0; i < 90; i += 1) {
      ctx.fillRect(Math.random() * size, Math.random() * size, 8, 3);
    }
    noise(ctx, 22);
  }, 18);
}

export function makeConcrete() {
  return canvasTexture(256, (ctx, size) => {
    ctx.fillStyle = "#3d434b";
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = "#32383f";
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, size - 4, size - 4);
    noise(ctx, 18);
  }, 6);
}

export function makeTiles() {
  return canvasTexture(256, (ctx, size) => {
    ctx.fillStyle = "#2a323c";
    ctx.fillRect(0, 0, size, size);
    const step = 32;
    for (let y = 0; y < size; y += step) {
      for (let x = 0; x < size; x += step) {
        ctx.fillStyle = (x / step + y / step) % 2 === 0 ? "#313a45" : "#273039";
        ctx.fillRect(x + 1, y + 1, step - 2, step - 2);
      }
    }
  }, 10);
}

export function makeWood() {
  return canvasTexture(256, (ctx, size) => {
    ctx.fillStyle = "#3a2c22";
    ctx.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y += 16) {
      ctx.fillStyle = y % 32 === 0 ? "#463428" : "#32241c";
      ctx.fillRect(0, y, size, 14);
    }
    noise(ctx, 14);
  }, 4);
}

export function makeMetal() {
  return canvasTexture(128, (ctx, size) => {
    const grad = ctx.createLinearGradient(0, 0, size, 0);
    grad.addColorStop(0, "#4b5560");
    grad.addColorStop(0.5, "#6a7580");
    grad.addColorStop(1, "#3e474f");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    noise(ctx, 10);
  }, 2);
}

export function makeSignTexture(text, options = {}) {
  const {
    width = 1024,
    height = 256,
    bg = "#0c2233",
    ink = "#e8f4ff",
    edge = "#4db7e8",
  } = options;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = edge;
  ctx.lineWidth = 10;
  ctx.strokeRect(10, 10, width - 20, height - 20);
  ctx.fillStyle = ink;
  ctx.font = `600 ${Math.floor(height * 0.28)}px Inter, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, width / 2, height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function makePosterTexture(title, subtitle) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 768;
  const ctx = canvas.getContext("2d");
  const grad = ctx.createLinearGradient(0, 0, 0, 768);
  grad.addColorStop(0, "#12324a");
  grad.addColorStop(1, "#07141f");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 768);
  ctx.fillStyle = "#f2c56d";
  ctx.fillRect(0, 0, 512, 18);
  ctx.fillRect(0, 750, 512, 18);
  ctx.fillStyle = "#eaf4ff";
  ctx.font = "700 54px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(title, 256, 280);
  ctx.fillStyle = "#9ec9dd";
  ctx.font = "500 28px Inter, sans-serif";
  ctx.fillText(subtitle, 256, 340);
  ctx.fillStyle = "#1aa0d6";
  ctx.fillRect(170, 420, 172, 8);
  ctx.fillStyle = "#d7eaf4";
  ctx.font = "500 22px Inter, sans-serif";
  ctx.fillText("GATES OPEN 18:30", 256, 500);
  ctx.fillText("SIMULATED EVENT", 256, 540);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function makeLedScreen(title) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 384;
  const ctx = canvas.getContext("2d");
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const state = { canvas, ctx, texture, title, t: 0 };
  drawLedFrame(state, 0);
  return state;
}

export function drawLedFrame(state, t) {
  const { ctx, canvas, title } = state;
  ctx.fillStyle = "#041018";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const pulse = 0.45 + Math.sin(t * 1.4) * 0.12;
  ctx.fillStyle = `rgba(18, 150, 210, ${pulse})`;
  ctx.fillRect(0, 0, canvas.width, 18);
  ctx.fillRect(0, canvas.height - 18, canvas.width, 18);
  ctx.fillStyle = "#e7f6ff";
  ctx.font = "700 72px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(title, canvas.width / 2, 150);
  ctx.fillStyle = "#8fd0ea";
  ctx.font = "500 32px Inter, sans-serif";
  ctx.fillText("AFFIXIO ACCESS ARENA  ·  LIVE SESSION", canvas.width / 2, 230);
  ctx.fillStyle = "#f2c56d";
  ctx.font = "600 24px Inter, sans-serif";
  ctx.fillText("PROOF-BASED ENTRY  ·  SYNTHETIC CREDENTIALS ONLY", canvas.width / 2, 300);
  state.texture.needsUpdate = true;
}

export function createMaterialLibrary() {
  const asphaltMap = makeAsphalt();
  const concreteMap = makeConcrete();
  const tileMap = makeTiles();
  const woodMap = makeWood();
  const metalMap = makeMetal();

  return {
    asphalt: new THREE.MeshStandardMaterial({ map: asphaltMap, roughness: 0.92, color: 0xffffff }),
    concrete: new THREE.MeshStandardMaterial({ map: concreteMap, roughness: 0.86, color: 0xffffff }),
    tiles: new THREE.MeshStandardMaterial({ map: tileMap, roughness: 0.62, metalness: 0.08, color: 0xffffff }),
    wood: new THREE.MeshStandardMaterial({ map: woodMap, roughness: 0.72, color: 0xffffff }),
    metal: new THREE.MeshStandardMaterial({ map: metalMap, roughness: 0.38, metalness: 0.72 }),
    cladding: new THREE.MeshStandardMaterial({ color: 0x2b343d, roughness: 0.64, metalness: 0.18 }),
    darkClad: new THREE.MeshStandardMaterial({ color: 0x1b232b, roughness: 0.7 }),
    glass: new THREE.MeshStandardMaterial({
      color: 0x7fb7d4,
      roughness: 0.08,
      metalness: 0.85,
      transparent: true,
      opacity: 0.38,
    }),
    warmGlass: new THREE.MeshStandardMaterial({
      color: 0xf0c48a,
      emissive: 0x6a3d12,
      emissiveIntensity: 0.35,
      roughness: 0.2,
      transparent: true,
      opacity: 0.55,
    }),
    seatNavy: new THREE.MeshStandardMaterial({ color: 0x1c4b73, roughness: 0.7 }),
    seatTeal: new THREE.MeshStandardMaterial({ color: 0x1f6a72, roughness: 0.7 }),
    seatRed: new THREE.MeshStandardMaterial({ color: 0x8a3a3a, roughness: 0.7 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xb89a62, roughness: 0.35, metalness: 0.6 }),
    blackSteel: new THREE.MeshStandardMaterial({ color: 0x15191e, roughness: 0.45, metalness: 0.4 }),
    whitePaint: new THREE.MeshStandardMaterial({ color: 0xd8dde3, roughness: 0.55 }),
    roadPaint: new THREE.MeshStandardMaterial({ color: 0xe8d27a, roughness: 0.6, emissive: 0x3a320c, emissiveIntensity: 0.15 }),
    emissiveWarm: new THREE.MeshStandardMaterial({ color: 0xffd7a1, emissive: 0xffb35c, emissiveIntensity: 1.4 }),
    emissiveCool: new THREE.MeshStandardMaterial({ color: 0xbfefff, emissive: 0x3aa7d6, emissiveIntensity: 1.2 }),
    emissiveWarn: new THREE.MeshStandardMaterial({ color: 0xff6b6b, emissive: 0xbb2020, emissiveIntensity: 1.1 }),
    emissiveAllow: new THREE.MeshStandardMaterial({ color: 0x7dffb2, emissive: 0x1f8a4c, emissiveIntensity: 1.2 }),
    beam: new THREE.MeshBasicMaterial({
      color: 0x7ecbff,
      transparent: true,
      opacity: 0.07,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    haze: new THREE.PointsMaterial({
      color: 0xcfe8ff,
      size: 0.18,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    }),
    skin: new THREE.MeshStandardMaterial({ color: 0xc4a07a, roughness: 0.7 }),
    cloth: new THREE.MeshStandardMaterial({ color: 0x24303a, roughness: 0.85 }),
  };
}
