// Credit: @paparichens
import * as THREE from "/static/vendor/three.module.js?v=arena5";
import { createMaterialLibrary, drawLedFrame, makeLedScreen, makeSignTexture } from "./materials.js";
import {
  addBarrierRun,
  addBox,
  addCar,
  addCrateStack,
  addHighlightRing,
  addLampPost,
  addPerson,
  addPoster,
  addSign,
  addSofa,
  addTable,
  addTree,
} from "./props.js";

export class ArenaScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x071018);
    this.scene.fog = new THREE.FogExp2(0x08131d, 0.012);
    this.camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.1, 420);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.clock = new THREE.Clock();
    this.time = 0;
    this.colliders = [];
    this.interactables = [];
    this.animated = [];
    this.zoneMarkers = [];
    this.ledScreens = [];
    this.mats = createMaterialLibrary();
    this._buildWorld();
    window.addEventListener("resize", () => this.onResize());
  }

  _buildWorld() {
    this._buildSkyAndLights();
    this._buildGround();
    this._buildFacade();
    this._buildExterior();
    this._buildPerimeter();
    this._buildConcourse();
    this._buildSeating();
    this._buildVip();
    this._buildBackstage();
    this._buildSoc();
    this._buildAtmosphere();
    this._registerZones();
  }

  _buildSkyAndLights() {
    const hemi = new THREE.HemisphereLight(0x6ea7c8, 0x0b1016, 0.55);
    this.scene.add(hemi);

    const moon = new THREE.DirectionalLight(0xc5d7ea, 0.55);
    moon.position.set(-40, 58, 28);
    moon.castShadow = true;
    moon.shadow.mapSize.set(2048, 2048);
    moon.shadow.camera.near = 8;
    moon.shadow.camera.far = 180;
    moon.shadow.camera.left = -80;
    moon.shadow.camera.right = 80;
    moon.shadow.camera.top = 80;
    moon.shadow.camera.bottom = -80;
    this.scene.add(moon);

    const moonBall = new THREE.Mesh(
      new THREE.SphereGeometry(3.2, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xe8f1ff })
    );
    moonBall.position.set(-70, 62, 40);
    this.scene.add(moonBall);

    const starGeo = new THREE.BufferGeometry();
    const starCount = 900;
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i += 1) {
      const r = 90 + Math.random() * 70;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * 0.9;
      positions[i * 3] = Math.cos(theta) * Math.sin(phi) * r;
      positions[i * 3 + 1] = 18 + Math.cos(phi) * r * 0.55;
      positions[i * 3 + 2] = Math.sin(theta) * Math.sin(phi) * r;
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.18 })));

    for (let i = 0; i < 22; i += 1) {
      const h = 4 + Math.random() * 14;
      const building = new THREE.Mesh(
        new THREE.BoxGeometry(4 + Math.random() * 5, h, 3 + Math.random() * 4),
        new THREE.MeshStandardMaterial({
          color: 0x141a22,
          emissive: 0x1c3344,
          emissiveIntensity: 0.18 + Math.random() * 0.2,
          roughness: 0.9,
        })
      );
      building.position.set(-90 + i * 8.5, h / 2, -118);
      this.scene.add(building);
    }
  }

  _buildGround() {
    const asphalt = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), this.mats.asphalt);
    asphalt.rotation.x = -Math.PI / 2;
    asphalt.receiveShadow = true;
    this.scene.add(asphalt);

    const concourse = new THREE.Mesh(new THREE.PlaneGeometry(136, 78), this.mats.tiles);
    concourse.rotation.x = -Math.PI / 2;
    concourse.position.set(0, 0.03, -34);
    concourse.receiveShadow = true;
    this.scene.add(concourse);

    const pavement = new THREE.Mesh(new THREE.PlaneGeometry(90, 18), this.mats.concrete);
    pavement.rotation.x = -Math.PI / 2;
    pavement.position.set(0, 0.04, 28);
    pavement.receiveShadow = true;
    this.scene.add(pavement);

    for (let i = 0; i < 18; i += 1) {
      addBox(this.scene, this.colliders, this.mats, {
        x: 0,
        y: 0.05,
        z: 18 + i * 4.2,
        w: 0.35,
        h: 0.04,
        d: 2.2,
        mat: this.mats.roadPaint,
        collide: false,
        cast: false,
      });
    }

    for (let lane = 0; lane < 2; lane += 1) {
      const baseX = -58 + lane * 24;
      for (let bay = 0; bay < 6; bay += 1) {
        addBox(this.scene, this.colliders, this.mats, {
          x: baseX,
          y: 0.05,
          z: 58 - bay * 5.4,
          w: 2.6,
          h: 0.03,
          d: 5,
          mat: this.mats.roadPaint,
          collide: false,
          cast: false,
        });
      }
    }
    for (let lane = 0; lane < 2; lane += 1) {
      const baseX = 34 + lane * 24;
      for (let bay = 0; bay < 6; bay += 1) {
        addBox(this.scene, this.colliders, this.mats, {
          x: baseX,
          y: 0.05,
          z: 58 - bay * 5.4,
          w: 2.6,
          h: 0.03,
          d: 5,
          mat: this.mats.gold,
          collide: false,
          cast: false,
        });
      }
    }
  }

  _buildFacade() {
    const wallH = 16;
    addBox(this.scene, this.colliders, this.mats, { x: -48, y: wallH / 2, z: 0.4, w: 44, h: wallH, d: 2.2, mat: this.mats.cladding });
    addBox(this.scene, this.colliders, this.mats, { x: 18, y: wallH / 2, z: 0.4, w: 16, h: wallH, d: 2.2, mat: this.mats.cladding });
    addBox(this.scene, this.colliders, this.mats, { x: 58, y: wallH / 2, z: 0.4, w: 28, h: wallH, d: 2.2, mat: this.mats.cladding });
    addBox(this.scene, this.colliders, this.mats, { x: 0, y: wallH / 2, z: -70, w: 142, h: wallH, d: 2.2, mat: this.mats.darkClad });
    addBox(this.scene, this.colliders, this.mats, { x: -70, y: wallH / 2, z: -35, w: 2.2, h: wallH, d: 72, mat: this.mats.cladding });
    addBox(this.scene, this.colliders, this.mats, { x: 70, y: wallH / 2, z: -35, w: 2.2, h: wallH, d: 72, mat: this.mats.cladding });

    addBox(this.scene, this.colliders, this.mats, {
      x: -4,
      y: 13.4,
      z: 2.4,
      w: 36,
      h: 0.5,
      d: 8,
      mat: this.mats.metal,
      collide: false,
    });
    addBox(this.scene, this.colliders, this.mats, {
      x: 32,
      y: 12.2,
      z: 2.2,
      w: 14,
      h: 0.4,
      d: 6,
      mat: this.mats.gold,
      collide: false,
    });

    const fascia = new THREE.Mesh(new THREE.BoxGeometry(36, 0.35, 0.35), this.mats.emissiveCool);
    fascia.position.set(-4, 12.8, 6.3);
    this.scene.add(fascia);

    const led = makeLedScreen("NORTHGATE LIVE");
    this.ledScreens.push(led);
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 6.4),
      new THREE.MeshStandardMaterial({
        map: led.texture,
        emissiveMap: led.texture,
        emissive: 0xffffff,
        emissiveIntensity: 0.7,
        roughness: 0.3,
      })
    );
    screen.position.set(-4, 8.6, 1.7);
    this.scene.add(screen);

    addPoster(this.scene, "NORTHGATE", "OPENING NIGHT", -28, 4.2, 1.7);
    addPoster(this.scene, "AFFIXIO", "PROOF ENTRY", 24, 4.2, 1.7);
    addSign(this.scene, "PUBLIC ENTRANCE", -8, 5.4, 8.2);
    addSign(this.scene, "VIP ENTRANCE", 32, 5.4, 8.2, 0, 0.85);

    for (let i = 0; i < 5; i += 1) {
      addBox(this.scene, this.colliders, this.mats, {
        x: -22 + i * 7,
        y: 4,
        z: 2.6,
        w: 0.7,
        h: 8,
        d: 0.7,
        mat: this.mats.metal,
        collide: false,
      });
    }

    const roof = new THREE.Mesh(new THREE.PlaneGeometry(138, 78), this.mats.darkClad);
    roof.rotation.x = Math.PI / 2;
    roof.position.set(0, 15.8, -34);
    this.scene.add(roof);
  }

  _buildExterior() {
    addSign(this.scene, "PUBLIC PARKING", -45, 4.2, 61);
    addSign(this.scene, "VIP / STAFF PARKING", 45, 4.2, 61);
    addSign(this.scene, "TAXI DROP-OFF", 0, 3.6, 34);

    this.interactables.push(this._makeBarrier("parking_public", "Press E to scan public parking proof", -45, 49));
    this.interactables.push(this._makeBarrier("parking_vip_staff", "Press E to scan VIP parking proof", 45, 49));

    const publicCars = [-62, -52, -38, -28];
    publicCars.forEach((x, i) => addCar(this.scene, this.mats, x, 56 - (i % 3) * 5.2, 0, [0x31485a, 0x5a3a32, 0x243a2e, 0x2a3340][i]));
    addCar(this.scene, this.mats, 38, 56, 0, 0x1f2a38);
    addCar(this.scene, this.mats, 52, 51, 0, 0x4a3b24);
    addCar(this.scene, this.mats, 8, 36, Math.PI / 2, 0x2d333c);

    for (const x of [-64, -20, 20, 64, -48, 48, 0]) {
      addLampPost(this.scene, this.mats, x, 44);
    }
    addLampPost(this.scene, this.mats, -12, 22);
    addLampPost(this.scene, this.mats, 12, 22);
    addTree(this.scene, this.mats, -72, 38);
    addTree(this.scene, this.mats, 72, 38);
    addTree(this.scene, this.mats, -76, 62);

    for (let i = 0; i < 14; i += 1) {
      const x = -24 + (i % 7) * 2.2;
      const z = 18 + Math.floor(i / 7) * 2.4;
      this.animated.push(addPerson(this.scene, this.mats, x, z, Math.PI, i));
    }
    addBarrierRun(this.scene, this.mats, -12, 14, 18, 0);
    addBarrierRun(this.scene, this.mats, 8, 14, 12, 0);
  }

  _buildPerimeter() {
    const lanes = [-22, -8, 6, 20];
    lanes.forEach((x) => {
      addBox(this.scene, this.colliders, this.mats, {
        x,
        y: 1.15,
        z: 10,
        w: 0.28,
        h: 2.3,
        d: 16,
        mat: this.mats.metal,
      });
    });
    this.interactables.push(this._makeTurnstile("turnstile_public", "Press E to validate ticket", -14, 6));
    this.interactables.push(this._makeTurnstile("turnstile_public", "Press E to validate ticket", -2, 6));
    this.interactables.push(this._makeTurnstile("turnstile_public", "Press E to validate ticket", 10, 6));
    this.interactables.push(this._makeTurnstile("turnstile_vip", "Press E to scan VIP lane proof", 32, 6));
    addSign(this.scene, "PUBLIC TURNSTILES", -2, 4.6, 3.4);
    addSign(this.scene, "VIP LANE", 32, 4.6, 3.4, 0, 0.8);
    addBarrierRun(this.scene, this.mats, -14, 11.5, 10, 0);
    addBarrierRun(this.scene, this.mats, 32, 11.5, 8, 0);

    for (let i = 0; i < 8; i += 1) {
      this.animated.push(addPerson(this.scene, this.mats, -18 + i * 1.7, 12.8, 0, i * 0.7));
    }
  }

  _buildConcourse() {
    this._makeKiosk(-34, -21, "ticket_helpdesk", "Press E to request ticket help validation", "TICKET HELP");
    this._makeKiosk(4, -21, "tariff_kiosk", "Press E to apply entitlement update", "TARIFF UPDATE");
    this._makeKiosk(30, -21, "kiosk_age18", "Press E to verify 18+ proof", "18+ PROOF");

    addBox(this.scene, this.colliders, this.mats, {
      x: -53,
      y: 1.5,
      z: -18,
      w: 10,
      h: 3,
      d: 3.4,
      mat: this.mats.cladding,
    });
    addBox(this.scene, this.colliders, this.mats, {
      x: 53,
      y: 1.5,
      z: -18,
      w: 10,
      h: 3,
      d: 3.4,
      mat: this.mats.cladding,
    });
    addSign(this.scene, "FOOD COURT", -53, 4.2, -16.1);
    addSign(this.scene, "MERCHANDISE", 53, 4.2, -16.1);
    addSign(this.scene, "TOILETS", -22, 3.4, -16, 0, 0.7);
    addSign(this.scene, "INFORMATION", 18, 3.4, -16, 0, 0.7);

    const infoLed = makeLedScreen("SECTION MAP  A  B  C  VIP");
    this.ledScreens.push(infoLed);
    const infoScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(8.5, 3.2),
      new THREE.MeshStandardMaterial({
        map: infoLed.texture,
        emissiveMap: infoLed.texture,
        emissive: 0xffffff,
        emissiveIntensity: 0.55,
      })
    );
    infoScreen.position.set(0, 4.6, -15.4);
    this.scene.add(infoScreen);

    for (const x of [-40, -20, 0, 20, 40]) {
      const downlight = new THREE.PointLight(0xd7e8f4, 1.15, 16, 1.7);
      downlight.position.set(x, 8.4, -22);
      this.scene.add(downlight);
    }

    addSofa(this.scene, this.mats, -8, -18, 0);
    addSofa(this.scene, this.mats, 12, -18, 0);
    addTable(this.scene, this.mats, -8, -16.4);
  }

  _buildSeating() {
    const stage = new THREE.Mesh(
      new THREE.CylinderGeometry(11, 13.4, 1.6, 40),
      new THREE.MeshStandardMaterial({ color: 0x2a333d, metalness: 0.35, roughness: 0.42 })
    );
    stage.position.set(0, 0.8, -52);
    stage.castShadow = true;
    this.scene.add(stage);
    addBox(this.scene, this.colliders, this.mats, {
      x: 0,
      y: 0.08,
      z: -52,
      w: 24,
      h: 0.16,
      d: 24,
      mat: this.mats.emissiveCool,
      collide: false,
      cast: false,
    });

    const backdropLed = makeLedScreen("LIVE");
    this.ledScreens.push(backdropLed);
    const wall = new THREE.Mesh(
      new THREE.PlaneGeometry(22, 8),
      new THREE.MeshStandardMaterial({
        map: backdropLed.texture,
        emissiveMap: backdropLed.texture,
        emissive: 0xffffff,
        emissiveIntensity: 0.8,
      })
    );
    wall.position.set(0, 6.2, -64.4);
    this.scene.add(wall);

    const truss = new THREE.Mesh(new THREE.BoxGeometry(24, 0.3, 0.3), this.mats.metal);
    truss.position.set(0, 11.5, -52);
    this.scene.add(truss);

    const beamColors = [0x4aa7ff, 0xffb067, 0x67d7c4];
    for (let i = 0; i < 3; i += 1) {
      const spot = new THREE.SpotLight(beamColors[i], 7.5, 40, 0.32, 0.45, 1.1);
      spot.position.set(-8 + i * 8, 11.2, -52);
      spot.target.position.set(0, 1.4, -52);
      this.scene.add(spot, spot.target);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(3.4, 9, 20, 1, true), this.mats.beam.clone());
      cone.position.set(-8 + i * 8, 6.6, -52);
      cone.rotation.x = Math.PI;
      this.scene.add(cone);
      this.animated.push({ type: "spot", object: spot, cone, phase: i * 1.1, color: beamColors[i] });
    }

    const seatGeo = new THREE.BoxGeometry(0.78, 0.62, 0.78);
    const count = 12 * 48;
    const seatMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.68 });
    const seats = new THREE.InstancedMesh(seatGeo, seatMat, count);
    seats.castShadow = true;
    const dummy = new THREE.Object3D();
    let n = 0;
    const color = new THREE.Color();
    seats.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3);
    for (let r = 0; r < 12; r += 1) {
      for (let i = 0; i < 48; i += 1) {
        const angle = (i / 48) * Math.PI * 1.7 + 0.7;
        const radius = 17.5 + r * 1.85;
        dummy.position.set(
          Math.cos(angle) * radius,
          0.85 + r * 0.28,
          -52 + Math.sin(angle) * radius * 0.72
        );
        dummy.lookAt(0, dummy.position.y, -52);
        dummy.updateMatrix();
        seats.setMatrixAt(n, dummy.matrix);
        if (r > 8) color.setHex(0x8a3a3a);
        else if (i < 8 || i > 40) color.setHex(0xb89a62);
        else color.setHex(0x1c4b73);
        seats.setColorAt(n, color);
        n += 1;
      }
    }
    seats.instanceColor.needsUpdate = true;
    seats.instanceMatrix.needsUpdate = true;
    this.scene.add(seats);

    addBox(this.scene, this.colliders, this.mats, {
      x: 0,
      y: 0.8,
      z: -52,
      w: 16,
      h: 1.6,
      d: 16,
      mat: this.mats.darkClad,
      collide: true,
    });

    this.interactables.push(this._makeGate("seating_a", "Press E to validate section A entry", -20, -34));
    this.interactables.push(this._makeGate("seating_vip", "Press E to validate premium section", 20, -34));
    addSign(this.scene, "SECTION A", -20, 4.2, -36);
    addSign(this.scene, "SECTION B", -6, 4.2, -36, 0, 0.8);
    addSign(this.scene, "SECTION C", 6, 4.2, -36, 0, 0.8);
    addSign(this.scene, "PREMIUM ENTRY", 20, 4.2, -36, 0, 0.85);
  }

  _buildVip() {
    addBox(this.scene, this.colliders, this.mats, { x: 34, y: 3.5, z: -14, w: 1.4, h: 7, d: 26, mat: this.mats.wood });
    addBox(this.scene, this.colliders, this.mats, { x: 66, y: 3.5, z: -14, w: 1.4, h: 7, d: 26, mat: this.mats.wood });
    addBox(this.scene, this.colliders, this.mats, { x: 50, y: 3.5, z: -26.6, w: 32, h: 7, d: 1.4, mat: this.mats.wood });
    addSign(this.scene, "VIP RECEPTION", 50, 4.4, -8.5);
    addSign(this.scene, "HOSPITALITY LOUNGE", 50, 4.4, -22);
    this.interactables.push(this._makeGate("vip_reception", "Press E to scan VIP reception credential", 50, -7));
    addSofa(this.scene, this.mats, 44, -16, Math.PI / 2);
    addSofa(this.scene, this.mats, 56, -16, -Math.PI / 2);
    addTable(this.scene, this.mats, 50, -16);
    addBox(this.scene, this.colliders, this.mats, {
      x: 58,
      y: 1.2,
      z: -20,
      w: 4.4,
      h: 1.4,
      d: 1.2,
      mat: this.mats.blackSteel,
      collide: false,
    });
    const vipLight = new THREE.PointLight(0xf0c48a, 2.2, 16, 1.6);
    vipLight.position.set(50, 5.5, -16);
    this.scene.add(vipLight);
  }

  _buildBackstage() {
    addBox(this.scene, this.colliders, this.mats, { x: -66, y: 3.2, z: -27, w: 1.6, h: 6.4, d: 44, mat: this.mats.darkClad });
    addBox(this.scene, this.colliders, this.mats, { x: -38, y: 3.2, z: -27, w: 1.6, h: 6.4, d: 44, mat: this.mats.darkClad });
    addBox(this.scene, this.colliders, this.mats, { x: -52, y: 3.2, z: -49, w: 28, h: 6.4, d: 1.6, mat: this.mats.darkClad });
    addBox(this.scene, this.colliders, this.mats, { x: -52, y: 3.2, z: -5, w: 28, h: 6.4, d: 1.6, mat: this.mats.darkClad });
    this.interactables.push(this._makeGate("crew_entrance", "Press E to scan crew entrance proof", -38, -25));
    this.interactables.push(this._makeGate("loading_bay", "Press E to scan loading bay clearance", -52, -8));
    this.interactables.push(this._makeGate("tech_room", "Press E to scan technical room role proof", -65, -35));
    this._makeKiosk(-52, -57, "canteen_kiosk", "Press E to redeem crew meal", "MEAL REDEMPTION");
    this.interactables.push(this._makeGate("green_room", "Press E for high-security green room scan", -12, -67, true));
    this.interactables.push(this._makeGate("stage_side", "Press E for stage-side authorisation", -2, -59, true));
    addSign(this.scene, "STAFF CANTEEN", -52, 4.2, -58);
    addSign(this.scene, "GREEN ROOM ACCESS", -12, 4.2, -69, 0, 0.85);
    addCrateStack(this.scene, this.mats, -58, -12);
    addCrateStack(this.scene, this.mats, -46, -12);
    addTable(this.scene, this.mats, -56, -56);
    addTable(this.scene, this.mats, -48, -56);
    addSofa(this.scene, this.mats, -16, -64, 0);
    const workLight = new THREE.PointLight(0x9eb6c4, 1.4, 14, 1.8);
    workLight.position.set(-52, 5.2, -20);
    this.scene.add(workLight);
  }

  _buildSoc() {
    addBox(this.scene, this.colliders, this.mats, { x: 46, y: 3.2, z: -55, w: 1.6, h: 6.4, d: 20, mat: this.mats.darkClad });
    addBox(this.scene, this.colliders, this.mats, { x: 70, y: 3.2, z: -55, w: 1.6, h: 6.4, d: 20, mat: this.mats.darkClad });
    addBox(this.scene, this.colliders, this.mats, { x: 58, y: 3.2, z: -65, w: 24, h: 6.4, d: 1.6, mat: this.mats.darkClad });
    addBox(this.scene, this.colliders, this.mats, { x: 58, y: 3.2, z: -45, w: 24, h: 6.4, d: 1.6, mat: this.mats.darkClad });
    addSign(this.scene, "SECURITY OPERATIONS CENTRE", 58, 4.6, -47.2, 0, 0.9);
    this.interactables.push(this._makeGate("soc_entry", "Press E to access Security Operations Centre", 58, -45, true));

    for (let i = 0; i < 4; i += 1) {
      const panel = new THREE.Mesh(
        new THREE.PlaneGeometry(3.4, 2.1),
        new THREE.MeshStandardMaterial({
          color: 0x0b2433,
          emissive: 0x14658a,
          emissiveIntensity: 0.7,
        })
      );
      panel.position.set(50 + i * 4.1, 3.4, -64.1);
      this.scene.add(panel);
      this.animated.push({ type: "monitor", object: panel, phase: i });
    }
    const socLight = new THREE.PointLight(0x4ec4ff, 1.6, 14, 1.7);
    socLight.position.set(58, 5.6, -55);
    this.scene.add(socLight);
  }

  _buildAtmosphere() {
    const hazeGeo = new THREE.BufferGeometry();
    const count = 260;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      pos[i * 3] = (Math.random() - 0.5) * 30;
      pos[i * 3 + 1] = 1.2 + Math.random() * 8;
      pos[i * 3 + 2] = -52 + (Math.random() - 0.5) * 18;
    }
    hazeGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const haze = new THREE.Points(hazeGeo, this.mats.haze);
    this.scene.add(haze);
    this.animated.push({ type: "haze", object: haze });
  }

  _registerZones() {
    this.zoneMarkers.push({ zone: "Exterior Arrival Zone", x: 0, z: 40, objective: "Find a valid parking and entrance checkpoint" });
    this.zoneMarkers.push({ zone: "Security Perimeter", x: 0, z: 6, objective: "Validate ticket or VIP lane proof" });
    this.zoneMarkers.push({ zone: "Main Concourse", x: 0, z: -20, objective: "Explore kiosks and seating entrances" });
    this.zoneMarkers.push({ zone: "Seating Bowl", x: 0, z: -48, objective: "Enter your permitted section" });
    this.zoneMarkers.push({ zone: "VIP Level", x: 54, z: -18, objective: "Pass VIP reception if entitled" });
    this.zoneMarkers.push({ zone: "Operational Backstage Zone", x: -52, z: -28, objective: "Access crew corridors and technical spaces" });
    this.zoneMarkers.push({ zone: "Staff Canteen", x: -50, z: -58, objective: "Redeem meal once using nullifier" });
    this.zoneMarkers.push({ zone: "Green Room and Stage Access", x: -12, z: -64, objective: "Pass high-security double proof checks" });
    this.zoneMarkers.push({ zone: "Security Operations Centre", x: 58, z: -55, objective: "Monitor live anonymous security activity" });
  }

  _makeKiosk(x, z, checkpointId, prompt, label) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 1.1), this.mats.cladding);
    body.position.y = 0.9;
    const desk = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.12, 1.3), this.mats.metal);
    desk.position.y = 1.72;
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(1.1, 0.7),
      new THREE.MeshStandardMaterial({ color: 0x0c2a3c, emissive: 0x1aa0d6, emissiveIntensity: 0.8 })
    );
    screen.position.set(0, 1.95, 0.56);
    const ring = addHighlightRing(this.mats);
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 0.5),
      new THREE.MeshStandardMaterial({ map: makeSignTexture(label), roughness: 0.4 })
    );
    sign.position.set(0, 2.55, 0.1);
    group.add(body, desk, screen, ring, sign);
    this.scene.add(group);
    this.colliders.push(new THREE.Box3().setFromObject(body));
    this.interactables.push({
      type: "panel",
      checkpointId,
      action: checkpointId,
      prompt,
      mesh: body,
      screen,
      highlight: ring,
      group,
    });
  }

  _makeGate(checkpointId, prompt, x, z, highSecurity = false) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.28, 3.2, 0.28), this.mats.metal);
    frame.position.set(-0.15, 1.6, 0);
    const frame2 = frame.clone();
    frame2.position.x = 3.55;
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(4, 0.22, 0.28), highSecurity ? this.mats.gold : this.mats.metal);
    lintel.position.set(1.7, 3.2, 0);
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(3.1, 2.9, 0.12),
      highSecurity ? this.mats.blackSteel : this.mats.glass
    );
    door.position.set(1.7, 1.5, 0);
    const scanner = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.5, 0.42), this.mats.cladding);
    scanner.position.set(-0.55, 0.85, 0.45);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), this.mats.emissiveWarn.clone());
    lamp.position.set(-0.55, 1.72, 0.7);
    const ring = addHighlightRing(this.mats);
    group.add(frame, frame2, lintel, door, scanner, lamp, ring);
    if (highSecurity) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.08, 0.14), this.mats.emissiveCool);
      stripe.position.set(1.7, 2.7, 0.08);
      group.add(stripe);
    }
    this.scene.add(group);
    this.colliders.push(new THREE.Box3().setFromObject(door));
    const interactable = {
      type: "door",
      checkpointId,
      action: checkpointId,
      prompt,
      mesh: scanner,
      door,
      indicator: lamp,
      highlight: ring,
      group,
      open: false,
      colliderIndex: this.colliders.length - 1,
      closedX: 1.7,
      openX: 4.2,
    };
    this.animated.push({ type: "indicator", object: lamp });
    this.animated.push({ type: "door", interactable });
    return interactable;
  }

  _makeTurnstile(checkpointId, prompt, x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 1.15, 18), this.mats.metal);
    base.position.y = 0.58;
    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.4, 12), this.mats.blackSteel);
    column.position.y = 1.5;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.08, 0.08), this.mats.whitePaint);
    arm.position.y = 1.05;
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 10), this.mats.emissiveWarn.clone());
    lamp.position.set(0, 2.15, 0);
    const ring = addHighlightRing(this.mats);
    group.add(base, column, arm, lamp, ring);
    this.scene.add(group);
    this.colliders.push(new THREE.Box3().setFromObject(arm));
    const interactable = {
      type: "turnstile",
      checkpointId,
      action: checkpointId,
      prompt,
      mesh: base,
      arm,
      indicator: lamp,
      highlight: ring,
      group,
      open: false,
      colliderIndex: this.colliders.length - 1,
      targetRot: 0,
    };
    this.animated.push({ type: "indicator", object: lamp });
    this.animated.push({ type: "turnstile", interactable });
    return interactable;
  }

  _makeBarrier(checkpointId, prompt, x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    const booth = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.2, 1.1), this.mats.cladding);
    booth.position.y = 1.1;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.12, 0.12), this.mats.whitePaint);
    arm.position.set(2.7, 1.15, 0);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.04, 0.13), this.mats.emissiveWarn);
    stripe.position.set(2.7, 1.15, 0);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), this.mats.emissiveWarn.clone());
    lamp.position.set(0, 2.35, 0.4);
    const ring = addHighlightRing(this.mats);
    group.add(booth, arm, stripe, lamp, ring);
    arm.add(stripe);
    stripe.position.set(0, 0, 0);
    this.scene.add(group);
    this.colliders.push(new THREE.Box3().setFromObject(arm));
    const interactable = {
      type: "barrier",
      checkpointId,
      action: checkpointId,
      prompt,
      mesh: booth,
      arm,
      indicator: lamp,
      highlight: ring,
      group,
      open: false,
      colliderIndex: this.colliders.length - 1,
      targetRot: 0,
    };
    this.animated.push({ type: "indicator", object: lamp });
    this.animated.push({ type: "barrier", interactable });
    return interactable;
  }

  setHovered(item) {
    for (const entry of this.interactables) {
      if (entry.highlight) entry.highlight.visible = entry === item;
    }
  }

  setInteractableState(interactable, allowed) {
    interactable.open = allowed;
    if (interactable.indicator) {
      interactable.indicator.material.color.set(allowed ? 0x7dffb2 : 0xff6b6b);
      interactable.indicator.material.emissive.set(allowed ? 0x1f8a4c : 0xbb2020);
    }
    if (interactable.type === "door") {
      if (allowed) this.colliders[interactable.colliderIndex].makeEmpty();
      else this.colliders[interactable.colliderIndex].setFromObject(interactable.door);
    }
    if (interactable.type === "turnstile") {
      interactable.targetRot = allowed ? Math.PI / 2 : 0;
      if (allowed) this.colliders[interactable.colliderIndex].makeEmpty();
      else this.colliders[interactable.colliderIndex].setFromObject(interactable.arm);
    }
    if (interactable.type === "barrier") {
      interactable.targetRot = allowed ? -Math.PI / 2 : 0;
      if (allowed) this.colliders[interactable.colliderIndex].makeEmpty();
      else this.colliders[interactable.colliderIndex].setFromObject(interactable.arm);
    }
  }

  nearestZone(position) {
    let best = this.zoneMarkers[0];
    let bestDist = Number.POSITIVE_INFINITY;
    for (const zone of this.zoneMarkers) {
      const d = Math.hypot(position.x - zone.x, position.z - zone.z);
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

    if (Math.floor(t * 8) !== Math.floor((t - delta) * 8)) {
      for (const screen of this.ledScreens) drawLedFrame(screen, t);
    }

    for (const item of this.animated) {
      if (item.type === "indicator") {
        const pulse = 0.85 + Math.sin(t * 5.2) * 0.18;
        item.object.scale.setScalar(pulse);
      } else if (item.type === "spot") {
        const swing = Math.sin(t * 0.8 + item.phase) * 4.5;
        item.object.target.position.x = swing;
        item.cone.rotation.z = Math.sin(t * 0.8 + item.phase) * 0.18;
        item.cone.material.opacity = 0.05 + Math.sin(t * 2 + item.phase) * 0.03;
      } else if (item.type === "sway") {
        item.object.rotation.y = Math.sin(t * 0.6 + item.phase) * 0.15;
      } else if (item.type === "haze") {
        item.object.position.y = Math.sin(t * 0.25) * 0.4;
      } else if (item.type === "monitor") {
        item.object.material.emissiveIntensity = 0.45 + Math.sin(t * 3 + item.phase) * 0.25;
      } else if (item.type === "door") {
        const door = item.interactable.door;
        const target = item.interactable.open ? item.interactable.openX : item.interactable.closedX;
        door.position.x += (target - door.position.x) * Math.min(1, delta * 6);
      } else if (item.type === "turnstile") {
        const arm = item.interactable.arm;
        arm.rotation.y += (item.interactable.targetRot - arm.rotation.y) * Math.min(1, delta * 5);
      } else if (item.type === "barrier") {
        const arm = item.interactable.arm;
        arm.rotation.z += (item.interactable.targetRot - arm.rotation.z) * Math.min(1, delta * 4);
      }
    }

    this.renderer.render(this.scene, this.camera);
    return delta;
  }
}
