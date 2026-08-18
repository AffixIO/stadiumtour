// Credit: @paparichens
import * as THREE from "/static/vendor/three.module.js?v=arena6";

export class InteractionSystem {
  constructor(camera, interactables, runScan) {
    this.camera = camera;
    this.interactables = interactables;
    this.runScan = runScan;
    this.raycaster = new THREE.Raycaster();
    this.current = null;
    this.busy = false;
  }

  update(originPosition) {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    let nearest = null;
    let best = Number.POSITIVE_INFINITY;
    const world = new THREE.Vector3();
    for (const item of this.interactables) {
      item.mesh.getWorldPosition(world);
      const dist = world.distanceTo(originPosition);
      if (dist > 5.4) continue;
      const target = item.group || item.mesh;
      const looking = this.raycaster.intersectObject(target, true).length > 0 || dist < 2.6;
      if (!looking) continue;
      if (dist < best) {
        nearest = item;
        best = dist;
      }
    }
    this.current = nearest;
    return nearest;
  }

  async interact(persona) {
    if (!this.current || this.busy) return null;
    this.busy = true;
    try {
      const action = this.current.action;
      const result = await this.runScan(persona, this.current.checkpointId, action);
      return { interactable: this.current, result };
    } finally {
      this.busy = false;
    }
  }
}
