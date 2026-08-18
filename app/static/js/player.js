// Credit: @paparichens
import * as THREE from "/static/vendor/three.module.js?v=arena6";

export class FirstPersonPlayer {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    this.position = new THREE.Vector3(0, 2.2, 38);
    this.yaw = Math.PI;
    this.pitch = 0;
    this.locked = false;
    this.keys = new Set();
    this.onGround = true;
    this.height = 1.8;
    this.radius = 0.65;
    this.speed = 8;
    this.sprintSpeed = 13;
    this.gravity = 26;
    this.jumpSpeed = 9.5;
    this._bind();
    this.camera.position.copy(this.position);
  }

  _bind() {
    document.addEventListener("keydown", (evt) => {
      if (evt.code === "Tab") evt.preventDefault();
      this.keys.add(evt.code);
      if (evt.code === "Space" && this.onGround && this.locked) {
        this.velocity.y = this.jumpSpeed;
        this.onGround = false;
      }
    });
    document.addEventListener("keyup", (evt) => this.keys.delete(evt.code));
    document.addEventListener("pointerlockchange", () => {
      this.locked = document.pointerLockElement === this.domElement;
    });
    document.addEventListener("mousemove", (evt) => {
      if (!this.locked) return;
      this.yaw -= evt.movementX * 0.0023;
      this.pitch -= evt.movementY * 0.0023;
      this.pitch = Math.max(-1.35, Math.min(1.35, this.pitch));
    });
  }

  lock() {
    this.domElement.requestPointerLock();
  }

  unlock() {
    document.exitPointerLock();
  }

  update(delta, colliders = []) {
    if (!this.locked) {
      this.camera.position.copy(this.position);
      this.camera.rotation.set(this.pitch, this.yaw, 0, "YXZ");
      return;
    }
    const speed = this.keys.has("ShiftLeft") ? this.sprintSpeed : this.speed;
    this.direction.set(0, 0, 0);
    if (this.keys.has("KeyW")) this.direction.z -= 1;
    if (this.keys.has("KeyS")) this.direction.z += 1;
    if (this.keys.has("KeyA")) this.direction.x -= 1;
    if (this.keys.has("KeyD")) this.direction.x += 1;
    this.direction.normalize();

    const forward = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    const right = new THREE.Vector3(forward.z, 0, -forward.x);
    const move = new THREE.Vector3()
      .addScaledVector(forward, -this.direction.z * speed * delta)
      .addScaledVector(right, this.direction.x * speed * delta);

    this.velocity.y -= this.gravity * delta;
    const target = this.position.clone().add(move);
    target.y += this.velocity.y * delta;

    if (target.y < this.height + 0.4) {
      target.y = this.height + 0.4;
      this.velocity.y = 0;
      this.onGround = true;
    }

    const probe = new THREE.Sphere(target.clone().setY(this.height), this.radius);
    for (const box of colliders) {
      const near = box.clampPoint(probe.center, new THREE.Vector3());
      if (near.distanceToSquared(probe.center) < this.radius * this.radius) {
        const push = probe.center.clone().sub(near).setY(0);
        if (push.lengthSq() < 0.0001) continue;
        push.normalize().multiplyScalar(0.22);
        target.add(push);
      }
    }

    this.position.copy(target);
    this.camera.position.copy(this.position);
    this.camera.rotation.set(this.pitch, this.yaw, 0, "YXZ");
  }
}
