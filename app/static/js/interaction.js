// Credit: @paparichens
import * as THREE from "three";

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
    let distance = Number.POSITIVE_INFINITY;
    for (const item of this.interactables) {
      const mesh = item.mesh;
      const intersects = this.raycaster.intersectObject(mesh, false);
      if (!intersects.length) continue;
      const d = intersects[0].distance;
      const realDist = mesh.position.distanceTo(originPosition);
      if (d < distance && realDist < 4.5) {
        nearest = item;
        distance = d;
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
