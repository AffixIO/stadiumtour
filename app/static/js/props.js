// Credit: @paparichens
import * as THREE from "three";
import { makePosterTexture, makeSignTexture } from "./materials.js";

export function addBox(scene, colliders, mats, spec) {
  const {
    x,
    y,
    z,
    w,
    h,
    d,
    mat = mats.cladding,
    collide = true,
    cast = true,
    receive = true,
    ry = 0,
  } = spec;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.rotation.y = ry;
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  scene.add(mesh);
  if (collide) colliders.push(new THREE.Box3().setFromObject(mesh));
  return mesh;
}

export function addSign(scene, text, x, y, z, ry = 0, scale = 1) {
  const texture = makeSignTexture(text);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(6.4 * scale, 1.6 * scale),
    new THREE.MeshStandardMaterial({ map: texture, roughness: 0.45, metalness: 0.1, emissive: 0x102230, emissiveIntensity: 0.35 })
  );
  mesh.position.set(x, y, z);
  mesh.rotation.y = ry;
  scene.add(mesh);
  return mesh;
}

export function addPoster(scene, title, subtitle, x, y, z, ry = 0) {
  const texture = makePosterTexture(title, subtitle);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(3.2, 4.8),
    new THREE.MeshStandardMaterial({ map: texture, roughness: 0.5, emissive: 0x08141d, emissiveIntensity: 0.4 })
  );
  mesh.position.set(x, y, z);
  mesh.rotation.y = ry;
  scene.add(mesh);
}

export function addLampPost(scene, mats, x, z, color = 0xffc27a) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 6.4, 8), mats.blackSteel);
  pole.position.y = 3.2;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.18, 0.7), mats.metal);
  head.position.y = 6.45;
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 10), mats.emissiveWarm);
  glow.position.y = 6.2;
  const light = new THREE.PointLight(color, 2.4, 18, 1.8);
  light.position.y = 6.1;
  group.add(pole, head, glow, light);
  scene.add(group);
  return group;
}

export function addCar(scene, mats, x, z, ry, body = 0x2c3d4d) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = ry;
  const hull = new THREE.Mesh(
    new THREE.BoxGeometry(4.4, 1.2, 1.9),
    new THREE.MeshStandardMaterial({ color: body, roughness: 0.42, metalness: 0.35 })
  );
  hull.position.y = 0.85;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.8, 1.7), mats.glass);
  cabin.position.set(-0.3, 1.6, 0);
  const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.22, 10);
  const wheels = [
    [-1.4, 0.32, 0.85],
    [1.3, 0.32, 0.85],
    [-1.4, 0.32, -0.85],
    [1.3, 0.32, -0.85],
  ];
  wheels.forEach(([wx, wy, wz]) => {
    const wheel = new THREE.Mesh(wheelGeo, mats.blackSteel);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, wy, wz);
    group.add(wheel);
  });
  const lampL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.28), mats.emissiveWarm);
  lampL.position.set(2.18, 0.85, 0.55);
  const lampR = lampL.clone();
  lampR.position.z = -0.55;
  group.add(hull, cabin, lampL, lampR);
  scene.add(group);
}

export function addPerson(scene, mats, x, z, ry, swayPhase = 0) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = ry;
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.7, 4, 8), mats.cloth.clone());
  torso.material.color.setHSL(0.55 + Math.random() * 0.08, 0.18, 0.18 + Math.random() * 0.1);
  torso.position.y = 1.15;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), mats.skin);
  head.position.y = 1.72;
  group.add(torso, head);
  scene.add(group);
  return { type: "sway", object: group, phase: swayPhase };
}

export function addBarrierRun(scene, mats, x, z, length, ry = 0) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = ry;
  const count = Math.max(2, Math.floor(length / 1.6));
  for (let i = 0; i < count; i += 1) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.1, 8), mats.whitePaint);
    post.position.set(i * 1.6 - length / 2, 0.55, 0);
    group.add(post);
  }
  const tape = new THREE.Mesh(
    new THREE.BoxGeometry(length, 0.05, 0.04),
    new THREE.MeshStandardMaterial({ color: 0xc45c4a, roughness: 0.5 })
  );
  tape.position.y = 0.92;
  group.add(tape);
  scene.add(group);
}

export function addTree(scene, mats, x, z) {
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 1.6, 7), mats.wood);
  trunk.position.set(x, 0.8, z);
  const canopy = new THREE.Mesh(
    new THREE.SphereGeometry(1.4, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0x1a3a2a, roughness: 0.9 })
  );
  canopy.position.set(x, 2.4, z);
  scene.add(trunk, canopy);
}

export function addCrateStack(scene, mats, x, z) {
  for (let i = 0; i < 3; i += 1) {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.0, 1.1), mats.wood);
    crate.position.set(x + (i % 2) * 0.2, 0.5 + i * 1.0, z);
    crate.rotation.y = i * 0.2;
    crate.castShadow = true;
    scene.add(crate);
  }
}

export function addSofa(scene, mats, x, z, ry = 0) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = ry;
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.5, 1.1), mats.seatNavy);
  base.position.y = 0.4;
  const back = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.8, 0.24), mats.seatNavy);
  back.position.set(0, 0.9, -0.42);
  group.add(base, back);
  scene.add(group);
}

export function addTable(scene, mats, x, z) {
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.08, 16), mats.wood);
  top.position.set(x, 0.92, z);
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.9, 8), mats.blackSteel);
  leg.position.set(x, 0.45, z);
  scene.add(top, leg);
}

export function addHighlightRing(mats) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.035, 8, 24), mats.emissiveCool.clone());
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.08;
  ring.visible = false;
  return ring;
}
