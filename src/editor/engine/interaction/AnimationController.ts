// ============================================================================
// ANIMATION CONTROLLER
// Handles object animations (collision revert)
// Extracted from InteractionManager.ts (lines 117-140)
// ============================================================================

import * as THREE from "three";
import type { A42Engine } from "@/editor/engine/A42Engine";

export class AnimationController {
  private engine: A42Engine;

  constructor(engine: A42Engine) {
    this.engine = engine;
  }

  /**
   * Animates object reverting to original position (collision detected)
   * Uses linear interpolation to smoothly move object back
   */
  public animateRevert(
    obj: THREE.Object3D,
    targetPos: THREE.Vector3
  ): void {
    const startPos = obj.position.clone();
    let t = 0;

    const animate = (): void => {
      t += 0.1;
      if (t >= 1) {
        obj.position.copy(targetPos);
        this.engine.checkSafetyCollisions();
        return;
      }
      obj.position.lerpVectors(startPos, targetPos, t);
      this.engine.checkSafetyCollisions();
      requestAnimationFrame(animate);
    };

    animate();
  }
}