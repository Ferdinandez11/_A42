// ============================================================================
// RAYCAST HANDLER
// Handles raycasting and hit detection
// Extracted from InteractionManager.ts (lines 185-315)
// ============================================================================

import * as THREE from "three";
import type { A42Engine } from "@/editor/engine/A42Engine";

export class RaycastHandler {
  private engine: A42Engine;
  private raycaster: THREE.Raycaster;
  private pointer: THREE.Vector2;

  constructor(engine: A42Engine) {
    this.engine = engine;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
  }

  /**
   * Calculate normalized device coordinates from mouse event
   */
  public calculatePointer(event: MouseEvent): void {
    const rect = this.engine.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.engine.activeCamera);
  }

  /**
   * Raycast against interaction plane
   */
  public raycastInteractionPlane(): THREE.Intersection | null {
    const hit = this.raycaster.intersectObject(
      this.engine.interactionManager.interactionPlane
    );
    return hit.length > 0 ? hit[0] : null;
  }

  /**
   * Raycast against scene objects
   */
  public raycastObjects(
    objects: THREE.Object3D[],
    recursive = true
  ): THREE.Intersection[] {
    return this.raycaster.intersectObjects(objects, recursive);
  }

  /**
   * Find the root item object from a child mesh
   * Traverses up the scene graph to find object with isItem userData
   */
  public findItemRoot(object: THREE.Object3D): THREE.Object3D | null {
    let target: THREE.Object3D | null = object;

    while (
      target &&
      !target.userData?.isItem &&
      target.parent &&
      target.parent !== this.engine.scene
    ) {
      target = target.parent;
    }

    return target && target.userData?.isItem ? target : null;
  }
}