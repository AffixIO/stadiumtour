window.__arenaModuleLoaded = true;
// Credit: @paparichens
import { ArenaScene } from "./scene.js";
import { FirstPersonPlayer } from "./player.js";
import { InteractionSystem } from "./interaction.js";
import { AudioEngine } from "./audio.js";
import { Hud } from "./hud.js";
import { createEventSocket, fetchConfig, injectAttack, runScan, setPulse } from "./network.js";
import { drawMinimap } from "./minimap.js";

const startScreen = document.getElementById("start-screen");
const startButton = document.getElementById("start-button");
const startError = document.getElementById("start-error");
const canvas = document.getElementById("game-canvas");
const minimapCanvas = document.getElementById("minimap");

const state = {
  config: null,
  persona: "customer",
  pulse: "online",
  hudFlags: {
    minimap: false,
    help: false,
    attack: false,
  },
  events: [],
};

let scene;
let player;
let interaction;
let hud;
let audio;
let hovered = null;
let isBootstrapping = false;

function showStartFailure(message) {
  startError.textContent = message;
  startError.classList.remove("hidden");
  startButton.disabled = false;
  startButton.textContent = "Enter Arena";
}

window.addEventListener("error", (event) => {
  if (!startScreen.classList.contains("hidden")) {
    showStartFailure(`Front-end error: ${event.message}`);
  }
});

window.addEventListener("unhandledrejection", (event) => {
  if (!startScreen.classList.contains("hidden")) {
    const reason = event.reason?.message || String(event.reason || "unknown error");
    showStartFailure(`Startup failed: ${reason}`);
  }
});

function updateHover(next) {
  hovered = next;
  if (scene) scene.setHovered(next);
}

async function bootstrap() {
  state.config = await fetchConfig();
  scene = new ArenaScene(canvas);
  player = new FirstPersonPlayer(scene.camera, canvas);
  audio = new AudioEngine();
  hud = new Hud(state.config);
  interaction = new InteractionSystem(scene.camera, scene.interactables, runScan);
  state.pulse = state.config.pulse_state;
  hud.setPulse(state.pulse, state.config.node_fingerprint);
  hud.setPersona(state.persona, state.config.personas[state.persona].role_level);
  hud.setPrompt("Walk to a scanner checkpoint and press E", "warn");

  hud.onPersonaChanged((value) => {
    state.persona = value;
    const role = state.config.personas[value].role_level;
    hud.setPersona(value, role);
    if (value !== "security_admin" && state.hudFlags.attack) {
      state.hudFlags.attack = false;
      hud.togglePanel("attack", false);
    }
    hud.setPrompt(`Persona switched to ${value.replaceAll("_", " ")}`, "warn");
  });

  wireGlobalKeys();
  bindPanels();
  connectSocket();
  loop();
}

async function bootstrapWithTimeout(timeoutMs = 15000) {
  let timer;
  try {
    return await Promise.race([
      bootstrap(),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error("initialisation timed out"));
        }, timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

function bindPanels() {
  document.addEventListener("keydown", async (evt) => {
    if (evt.code === "KeyE" && player.locked) {
      const outcome = await interaction.interact(state.persona);
      if (!outcome) return;
      const { interactable, result } = outcome;
      const allowed = result.result.decision === "allow";
      scene.setInteractableState(interactable, allowed);
      hud.showProof(result.result);
      hud.pushEvent(result.event);
      state.events.unshift(result.event);
      state.events = state.events.slice(0, 20);
      hud.updateSoc(state.events);
      hud.setPulse(result.pulse_state, state.config.node_fingerprint);
      if (allowed) {
        audio.allow();
        audio.door();
        hud.setPrompt("Access granted", "allow");
      } else {
        audio.deny();
        hud.setPrompt(`Access denied: ${result.result.reason}`, "deny");
      }
    }
  });

  document.getElementById("inject-attack-button").addEventListener("click", async () => {
    if (state.persona !== "security_admin") {
      hud.setPrompt("Only Security Admin can inject attacks", "deny");
      audio.warning();
      return;
    }
    const attack = document.getElementById("attack-select").value;
    await injectAttack(state.persona, attack);
    hud.setPrompt(`Attack queued: ${attack}`, "warn");
  });

  document.getElementById("apply-pulse-button").addEventListener("click", async () => {
    if (state.persona !== "security_admin") {
      hud.setPrompt("Only Security Admin can change pulse state", "deny");
      return;
    }
    const pulse = document.getElementById("pulse-select").value;
    const response = await setPulse(pulse);
    state.pulse = response.pulse_state;
    hud.setPulse(state.pulse, state.config.node_fingerprint);
  });
}

function connectSocket() {
  const socket = createEventSocket((payload) => {
    if (payload.type === "snapshot") {
      state.events = payload.events.reverse().slice(0, 20);
      state.events.slice(0, 8).forEach((evt) => hud.pushEvent(evt));
      hud.updateSoc(state.events);
      return;
    }
    if (payload.type === "event") {
      hud.pushEvent(payload.event);
      state.events.unshift(payload.event);
      state.events = state.events.slice(0, 20);
      hud.updateSoc(state.events);
    }
  });
  setInterval(() => {
    if (socket.readyState === WebSocket.OPEN) socket.send("ping");
  }, 15000);
}

function wireGlobalKeys() {
  document.addEventListener("keydown", (evt) => {
    if (evt.code === "KeyM") {
      state.hudFlags.minimap = !state.hudFlags.minimap;
      hud.togglePanel("minimap", state.hudFlags.minimap);
    }
    if (evt.code === "KeyH") {
      state.hudFlags.help = !state.hudFlags.help;
      hud.togglePanel("help", state.hudFlags.help);
    }
    if (evt.code === "Tab") {
      state.hudFlags.attack = !state.hudFlags.attack;
      hud.togglePanel("attack", state.hudFlags.attack && state.persona === "security_admin");
    }
    if (evt.code === "Escape") {
      player.unlock();
    }
  });

  canvas.addEventListener("click", () => {
    if (!player.locked) player.lock();
  });
}

function loop() {
  const delta = scene.render();
  player.update(delta, scene.colliders);
  const zone = scene.nearestZone(player.position);
  hud.setZone(zone.zone, zone.objective);
  const active = interaction.update(player.position);
  updateHover(active);
  if (active) {
    hud.setPrompt(active.prompt, "warn");
  }
  if (state.hudFlags.minimap) {
    drawMinimap(minimapCanvas, player.position, player.yaw);
  }
  const inSoc = zone.zone === "Security Operations Centre";
  hud.togglePanel("soc", inSoc && state.persona === "security_admin");
  requestAnimationFrame(loop);
}

startButton.addEventListener("click", async () => {
  if (isBootstrapping) return;
  isBootstrapping = true;
  startButton.disabled = true;
  startButton.textContent = "Loading Arena...";
  startError.classList.add("hidden");
  startError.textContent = "";
  try {
    if (!document.pointerLockElement) {
      await canvas.requestPointerLock?.();
    }
  } catch {
    // Lock can fail here if browser policy blocks it.
  }
  try {
    await bootstrapWithTimeout();
    startScreen.classList.add("hidden");
    if (!player.locked) {
      hud.setPrompt("Click inside the view to lock controls", "warn");
    }
  } catch (error) {
    showStartFailure(`Arena failed to start: ${error.message}`);
  } finally {
    isBootstrapping = false;
  }
});
