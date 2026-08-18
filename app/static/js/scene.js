// Credit: @paparichens
import * as THREE from "three";

function makeSignTexture(text) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#0b2d47";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#2ec6ff";
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);
  ctx.fillStyle = "#e6f6ff";
  ctx.font = "600 36px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function buildWall(scene, colliders, x, z, w, d, h = 4, color = 0x1b2a35) {
  const geometry = new THREE.BoxGeometry(w, h, d);
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.88 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, h / 2, z);
  scene.add(mesh);
  colliders.push(new THREE.Box3().setFromObject(mesh));
}

function addLabel(scene, text, x, y, z) {
  const texture = makeSignTexture(text);
  const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.5), mat);
  mesh.position.set(x, y, z);
  scene.add(mesh);
}

export class ArenaScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050c15);
    this.scene.fog = new THREE.Fog(0x050c15, 80, 260);
    this.camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 500);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.clock = new THREE.Clock();
    this.time = 0;
    this.colliders = [];
    this.interactables = [];
    this.animated = [];
    this.zoneMarkers = [];
    this._buildWorld();
    window.addEventListener("resize", () => this.onResize());
  }

  _buildWorld() {
    const hemi = new THREE.HemisphereLight(0x66aee8, 0x101820, 1.1);
    this.scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xa8d8ff, 1.0);
    dir.position.set(24, 40, -8);
    dir.castShadow = true;
    this.scene.add(dir);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(240, 240),
      new THREE.MeshStandardMaterial({ color: 0x101922, roughness: 0.9 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    this._buildArenaShell();
    this._buildExterior();
    this._buildPerimeter();
    this._buildConcourse();
    this._buildSeating();
    this._buildVip();
    this._buildBackstage();
    this._buildSoc();
    this._addStageLights();
  }

  _buildArenaShell() {
    buildWall(this.scene, this.colliders, 0, 0, 140, 2);
    buildWall(this.scene, this.colliders, 0, -70, 140, 2);
    buildWall(this.scene, this.colliders, -70, -35, 2, 70);
    buildWall(this.scene, this.colliders, 70, -35, 2, 70);
    buildWall(this.scene, this.colliders, -40, 12, 40, 2);
    buildWall(this.scene, this.colliders, 40, 12, 40, 2);
    addLabel(this.scene, "ARENA FACADE", 0, 4.8, 17);
    this.zoneMarkers.push({ zone: "Exterior Arrival Zone", x: 0, z: 40, radius: 35, objective: "Find a valid parking and entrance checkpoint" });
    this.zoneMarkers.push({ zone: "Security Perimeter", x: 0, z: 4, radius: 24, objective: "Validate ticket or VIP lane proof" });
    this.zoneMarkers.push({ zone: "Main Concourse", x: 0, z: -22, radius: 28, objective: "Explore kiosks and seating entrances" });
    this.zoneMarkers.push({ zone: "Seating Bowl", x: 0, z: -48, radius: 25, objective: "Enter your permitted section" });
    this.zoneMarkers.push({ zone: "VIP Level", x: 54, z: -22, radius: 22, objective: "Pass VIP reception if entitled" });
    this.zoneMarkers.push({ zone: "Operational Backstage Zone", x: -52, z: -35, radius: 26, objective: "Access crew corridors and technical spaces" });
    this.zoneMarkers.push({ zone: "Staff Canteen", x: -50, z: -58, radius: 14, objective: "Redeem meal once using nullifier" });
    this.zoneMarkers.push({ zone: "Green Room and Stage Access", x: -12, z: -64, radius: 14, objective: "Pass high-security double proof checks" });
    this.zoneMarkers.push({ zone: "Security Operations Centre", x: 58, z: -55, radius: 16, objective: "Monitor live anonymous security activity" });
  }

  _buildExterior() {
    buildWall(this.scene, this.colliders, -45, 54, 24, 2, 3, 0x1e2830);
    buildWall(this.scene, this.colliders, 45, 54, 24, 2, 3, 0x1e2830);
    addLabel(this.scene, "PUBLIC PARKING", -45, 3.8, 56);
    addLabel(this.scene, "VIP / STAFF PARKING", 45, 3.8, 56);
    this.interactables.push(this._makeGate("parking_public", "Press E to scan public parking proof", -45, 1.4, 49));
    this.interactables.push(this._makeGate("parking_vip_staff", "Press E to scan VIP parking proof", 45, 1.4, 49));
  }

  _buildPerimeter() {
    const lanes = [-22, -7, 8, 23];
    for (const lane of lanes) {
      buildWall(this.scene, this.colliders, lane, 12, 2, 18, 2.2, 0x22374a);
    }
    this.interactables.push(this._makeTurnstile("turnstile_public", "Press E to validate ticket", -14, 1, 6));
    this.interactables.push(this._makeTurnstile("turnstile_public", "Press E to validate ticket", -2, 1, 6));
    this.interactables.push(this._makeTurnstile("turnstile_public", "Press E to validate ticket", 10, 1, 6));
    this.interactables.push(this._makeTurnstile("turnstile_vip", "Press E to scan VIP lane proof", 32, 1, 6));
    addLabel(this.scene, "PUBLIC TURNSTILES", -2, 4, 2);
    addLabel(this.scene, "VIP LANE", 32, 4, 2);
  }

  _buildConcourse() {
    addLabel(this.scene, "TICKET HELP DESK", -34, 3.6, -20);
    addLabel(this.scene, "18+ KIOSK", 30, 3.6, -18);
    addLabel(this.scene, "CREDENTIAL / TARIFF KIOSK", 4, 3.6, -16);
    this.interactables.push(this._makePanel("kiosk_age18", "Press E to verify 18+ proof", 30, 1.2, -21));
    this.interactables.push(this._makePanel("ticket_helpdesk", "Press E to request ticket help validation", -34, 1.2, -21));
    this.interactables.push(this._makePanel("tariff_kiosk", "Press E to apply entitlement update", 4, 1.2, -21));

    buildWall(this.scene, this.colliders, -53, -19, 10, 2, 3, 0x253443);
    buildWall(this.scene, this.colliders, 53, -19, 10, 2, 3, 0x253443);
    addLabel(this.scene, "FOOD COURT", -53, 3.8, -16);
    addLabel(this.scene, "MERCHANDISE", 53, 3.8, -16);
  }

  _buildSeating() {
    const stage = new THREE.Mesh(
      new THREE.CylinderGeometry(10, 12, 1.5, 28),
      new THREE.MeshStandardMaterial({ color: 0x2f3e4d, metalness: 0.25, roughness: 0.65 })
    );
    stage.position.set(0, 0.8, -52);
    stage.castShadow = true;
    this.scene.add(stage);
    addLabel(this.scene, "MAIN STAGE", 0, 4.4, -52);

    for (let r = 0; r < 10; r += 1) {
      for (let i = 0; i < 42; i += 1) {
        const angle = (i / 42) * Math.PI * 2;
        const radius = 18 + r * 2;
        const seat = new THREE.Mesh(
          new THREE.BoxGeometry(0.9, 0.8, 0.9),
          new THREE.MeshStandardMaterial({ color: 0x344654 })
        );
        seat.position.set(Math.cos(angle) * radius, 1.1 + r * 0.12, -52 + Math.sin(angle) * radius * 0.64);
        this.scene.add(seat);
      }
    }

    this.interactables.push(this._makeGate("seating_a", "Press E to validate section A entry", -20, 1.4, -34));
    this.interactables.push(this._makeGate("seating_vip", "Press E to validate premium section", 20, 1.4, -34));
    addLabel(this.scene, "SECTION A", -20, 4, -36);
    addLabel(this.scene, "PREMIUM ENTRY", 20, 4, -36);
  }

  _buildVip() {
    buildWall(this.scene, this.colliders, 34, -12, 2, 28, 3, 0x223341);
    buildWall(this.scene, this.colliders, 66, -12, 2, 28, 3, 0x223341);
    buildWall(this.scene, this.colliders, 50, -26, 32, 2, 3, 0x223341);
    addLabel(this.scene, "VIP RECEPTION", 50, 3.6, -10);
    addLabel(this.scene, "HOSPITALITY LOUNGE", 50, 3.6, -22);
    this.interactables.push(this._makeGate("vip_reception", "Press E to scan VIP reception credential", 50, 1.3, -7));
  }

  _buildBackstage() {
    buildWall(this.scene, this.colliders, -66, -27, 2, 44, 3, 0x263340);
    buildWall(this.scene, this.colliders, -38, -27, 2, 44, 3, 0x263340);
    buildWall(this.scene, this.colliders, -52, -49, 28, 2, 3, 0x263340);
    buildWall(this.scene, this.colliders, -52, -5, 28, 2, 3, 0x263340);
    this.interactables.push(this._makeGate("crew_entrance", "Press E to scan crew entrance proof", -38, 1.2, -25));
    this.interactables.push(this._makeGate("loading_bay", "Press E to scan loading bay clearance", -52, 1.2, -8));
    this.interactables.push(this._makeGate("tech_room", "Press E to scan technical room role proof", -65, 1.2, -35));
    this.interactables.push(this._makePanel("canteen_kiosk", "Press E to redeem crew meal", -52, 1.2, -57));
    this.interactables.push(this._makeGate("green_room", "Press E for high-security green room scan", -12, 1.2, -67));
    this.interactables.push(this._makeGate("stage_side", "Press E for stage-side authorisation", -2, 1.2, -59));
    addLabel(this.scene, "STAFF CANTEEN", -52, 4, -58);
    addLabel(this.scene, "GREEN ROOM ACCESS", -12, 4, -69);
  }

  _buildSoc() {
    buildWall(this.scene, this.colliders, 46, -55, 2, 20, 3, 0x2a3a48);
    buildWall(this.scene, this.colliders, 70, -55, 2, 20, 3, 0x2a3a48);
    buildWall(this.scene, this.colliders, 58, -65, 24, 2, 3, 0x2a3a48);
    buildWall(this.scene, this.colliders, 58, -45, 24, 2, 3, 0x2a3a48);
    addLabel(this.scene, "SECURITY OPERATIONS CENTRE", 58, 4, -48);
    this.interactables.push(this._makeGate("soc_entry", "Press E to access Security Operations Centre", 58, 1.2, -45));
  }

  _addStageLights() {
    for (let i = 0; i < 4; i += 1) {
      const light = new THREE.PointLight(0x36b5ff, 1.2, 60, 1.8);
      light.position.set(-10 + i * 6.5, 10, -52);
      this.scene.add(light);
      this.animated.push({
        type: "light",
        object: light,
        phase: i * 0.6,
      });
    }
  }

  _makeGate(checkpointId, prompt, x, y, z) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    const post = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 2.4, 0.8),
      new THREE.MeshStandardMaterial({ color: 0x3f5467 })
    );
    post.position.y = 1.2;
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 2.6, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x1d2f3d })
    );
    door.position.y = 1.3;
    door.position.x = 1.9;
    const light = new THREE.Mesh(
      new THREE.SphereGeometry(0.17, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0xaa3434, emissive: 0x441111 })
    );
    light.position.set(0, 2.3, 0);
    group.add(post, door, light);
    this.scene.add(group);
    this.colliders.push(new THREE.Box3().setFromObject(door));
    const interactable = {
      type: "door",
      checkpointId,
      action: checkpointId,
      prompt,
      mesh: post,
      door,
      indicator: light,
      open: false,
      colliderIndex: this.colliders.length - 1,
      basePosition: door.position.clone(),
    };
    this.animated.push({ type: "indicator", object: light, allow: false });
    return interactable;
  }

  _makeTurnstile(checkpointId, prompt, x, y, z) {
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.5, 2, 16),
      new THREE.MeshStandardMaterial({ color: 0x304453 })
    );
    base.position.set(x, y, z);
    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.16, 0.16),
      new THREE.MeshStandardMaterial({ color: 0xb5c8d9 })
    );
    arm.position.set(x, y + 0.2, z);
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xa62828, emissive: 0x330000 })
    );
    lamp.position.set(x, y + 1.2, z);
    this.scene.add(base, arm, lamp);
    this.colliders.push(new THREE.Box3().setFromObject(arm));
    const interactable = {
      type: "turnstile",
      checkpointId,
      action: checkpointId,
      prompt,
      mesh: base,
      arm,
      indicator: lamp,
      colliderIndex: this.colliders.length - 1,
      open: false,
      baseRotation: 0,
    };
    this.animated.push({ type: "indicator", object: lamp, allow: false });
    return interactable;
  }

  _makePanel(checkpointId, prompt, x, y, z) {
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 2.3, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x2e4151 })
    );
    base.position.set(x, y + 1.1, z);
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.8, 0.55),
      new THREE.MeshStandardMaterial({ color: 0x1cb8ff, emissive: 0x083049 })
    );
    screen.position.set(x, y + 1.4, z + 0.62);
    this.scene.add(base, screen);
    return {
      type: "panel",
      checkpointId,
      action: checkpointId,
      prompt,
      mesh: base,
      screen,
    };
  }

  setInteractableState(interactable, allowed) {
    interactable.open = allowed;
    if (interactable.indicator) {
      interactable.indicator.material.color.set(allowed ? 0x24c26d : 0xa62828);
      interactable.indicator.material.emissive.set(allowed ? 0x17643a : 0x331111);
    }
    if (interactable.type === "door") {
      if (allowed) {
        interactable.door.position.x = interactable.basePosition.x + 2.4;
        this.colliders[interactable.colliderIndex].makeEmpty();
      } else {
        interactable.door.position.copy(interactable.basePosition);
        this.colliders[interactable.colliderIndex].setFromObject(interactable.door);
      }
    }
    if (interactable.type === "turnstile") {
      if (allowed) {
        interactable.arm.rotation.y += Math.PI / 2;
        this.colliders[interactable.colliderIndex].makeEmpty();
      } else {
        this.colliders[interactable.colliderIndex].setFromObject(interactable.arm);
      }
    }
  }

  nearestZone(position) {
    let best = this.zoneMarkers[0];
    let bestDist = Number.POSITIVE_INFINITY;
    for (const zone of this.zoneMarkers) {
      const dx = position.x - zone.x;
      const dz = position.z - zone.z;
      const d = Math.hypot(dx, dz);
      if (d < bestDist) {
        best = zone;
        bestDist = d;
      }
    }
    return best;
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  render() {
    const delta = this.clock.getDelta();
    this.time += delta;
    const t = this.time;
    for (const item of this.animated) {
      if (item.type === "light") {
        item.object.intensity = 0.8 + Math.sin(t * 1.6 + item.phase) * 0.4;
      }
      if (item.type === "indicator") {
        const pulse = 0.7 + Math.sin(t * 5) * 0.25;
        item.object.scale.setScalar(pulse);
      }
    }
    this.renderer.render(this.scene, this.camera);
    return delta;
  }
}
