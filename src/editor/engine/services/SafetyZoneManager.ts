// ============================================================================
// SAFETY ZONE MANAGER
// Manages safety zones visibility and collision detection
// Extracted from A42Engine.ts (lines 120-213)
// ============================================================================

import * as THREE from "three";
import { useEditorStore } from "@/editor/stores/editor/useEditorStore";

export class SafetyZoneManager {
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /**
   * Update visibility of all safety zones
   */
  public updateVisibility(visible: boolean): void {
    this.scene.traverse((obj) => {
      if (obj.userData?.isSafetyZone) {
        obj.visible = visible;
      }
    });
  }

  /**
   * Check collisions between all safety zones and update materials
   */
  public checkCollisions(): void {
    const { safetyZonesVisible } = useEditorStore.getState();
    if (!safetyZonesVisible) return;

    const zones: THREE.Mesh[] = [];
    const boxes: THREE.Box3[] = [];

    // Collect all safety zones
    this.scene.traverse((obj) => {
      if (obj.userData?.isSafetyZone && obj.visible) {
        zones.push(obj as THREE.Mesh);
        boxes.push(new THREE.Box3().setFromObject(obj));

        // Set default material
        (obj as THREE.Mesh).material = new THREE.MeshBasicMaterial({
          color: 0xff0000,
          transparent: true,
          opacity: 0.3,
          depthWrite: false,
          side: THREE.DoubleSide,
        });
      }
    });

    // Check for intersections
    for (let i = 0; i < zones.length; i++) {
      for (let j = i + 1; j < zones.length; j++) {
        if (boxes[i].intersectsBox(boxes[j])) {
          const alertMat = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.8,
            depthWrite: false,
            side: THREE.DoubleSide,
          });
          zones[i].material = alertMat;
          zones[j].material = alertMat;
        }
      }
    }
  }

  /**
   * Check if a specific object is colliding with any other safety zones
   */
  public isObjectColliding(target: THREE.Object3D): boolean {
    const { safetyZonesVisible } = useEditorStore.getState();
    if (!safetyZonesVisible) return false;

    // Get target safety zones
    const targetZones: THREE.Box3[] = [];
    target.traverse((child) => {
      if (child.userData?.isSafetyZone) {
        targetZones.push(new THREE.Box3().setFromObject(child));
      }
    });

    if (targetZones.length === 0) return false;

    // Get other safety zones (excluding target's children)
    const otherZones: THREE.Box3[] = [];
    this.scene.traverse((obj) => {
      if (obj.userData?.isSafetyZone && obj.visible) {
        let isChildOfTarget = false;
        let parent = obj.parent;
        while (parent) {
          if (parent === target) {
            isChildOfTarget = true;
            break;
          }
          parent = parent.parent;
        }
        if (!isChildOfTarget) {
          otherZones.push(new THREE.Box3().setFromObject(obj));
        }
      }
    });

    // Check for collisions
    for (const tBox of targetZones) {
      for (const oBox of otherZones) {
        if (tBox.intersectsBox(oBox)) {
          return true;
        }
      }
    }

    return false;
  }
}