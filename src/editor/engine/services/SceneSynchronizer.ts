// ============================================================================
// SCENE SYNCHRONIZER
// Synchronizes Three.js scene with Zustand store state
// Extracted from A42Engine.ts (lines 310-409)
// CRITICAL: This is the most important synchronization logic
// ============================================================================

import * as THREE from "three";
import type { A42Engine } from "@/editor/engine/A42Engine";
import type { SceneItem } from "@/domain/types/editor";

export class SceneSynchronizer {
  private engine: A42Engine;

  constructor(engine: A42Engine) {
    this.engine = engine;
  }

  /**
   * Synchronize scene objects with store items
   * CRITICAL: Maintains bidirectional sync between Three.js and Zustand
   */
  public async syncFromStore(storeItems: SceneItem[]): Promise<void> {
    const sceneItemsMap = new Map<string, THREE.Object3D>();

    // Build map of existing scene items
    this.engine.scene.children.forEach((child) => {
      if (child.userData?.isItem && child.uuid) {
        sceneItemsMap.set(child.uuid, child);
      }
    });

    // Process store items
    for (const item of storeItems) {
      const sceneObj = sceneItemsMap.get(item.uuid);

      if (sceneObj) {
        // Update existing object
        await this.updateExistingItem(sceneObj, item);
        sceneItemsMap.delete(item.uuid);
      } else {
        // Create new object
        await this.createNewItem(item);
      }
    }

    // Remove orphaned items
    this.removeOrphanedItems(sceneItemsMap);
  }

  /**
   * Update an existing scene object from store item
   */
  private async updateExistingItem(
    sceneObj: THREE.Object3D,
    item: SceneItem
  ): Promise<void> {
    // Handle floor updates
    if (item.type === "floor") {
      const hasChanged =
        JSON.stringify(sceneObj.userData.points) !==
          JSON.stringify(item.points) ||
        sceneObj.userData.floorMaterial !== item.floorMaterial ||
        sceneObj.userData.textureUrl !== item.textureUrl ||
        sceneObj.userData.textureScale !== item.textureScale ||
        sceneObj.userData.textureRotation !== item.textureRotation;

      if (hasChanged) {
        // FIX: Detach controls before removing object to prevent scene graph error
        if (this.engine.interactionManager.transformControl?.object === sceneObj) {
          this.engine.interactionManager.transformControl.detach();
          this.engine.interactionManager.transformControl.visible = false;
        }

        this.engine.scene.remove(sceneObj);
        this.engine.objectManager.recreateFloor(item);
        return;
      }
    }

    // Handle fence updates
    if (item.type === "fence") {
      const hasConfigChanged =
        JSON.stringify(sceneObj.userData.fenceConfig) !==
        JSON.stringify(item.fenceConfig);
      const hasPointsChanged =
        JSON.stringify(sceneObj.userData.points) !==
        JSON.stringify(item.points);

      if (hasConfigChanged || hasPointsChanged) {
        // FIX: Detach controls before removing object to prevent scene graph error
        if (this.engine.interactionManager.transformControl?.object === sceneObj) {
          this.engine.interactionManager.transformControl.detach();
          this.engine.interactionManager.transformControl.visible = false;
        }

        this.engine.scene.remove(sceneObj);
        this.engine.objectManager.recreateFence(item);
        return;
      }
    }

    // Update transform for existing objects
    sceneObj.position.fromArray(item.position);
    sceneObj.rotation.fromArray(item.rotation);

    // ✅ NO actualizar escala si está animando
    if (!sceneObj.userData.isAnimating) {
      sceneObj.scale.fromArray(item.scale);
    }
  }

  /**
   * Create a new scene object from store item
   */
  private async createNewItem(item: SceneItem): Promise<void> {
    if (item.type === "model" && item.modelUrl) {
      await this.engine.objectManager.recreateModel(item);
    } else if (item.type === "floor" && item.points) {
      this.engine.objectManager.recreateFloor(item);
    } else if (item.type === "fence" && item.points) {
      this.engine.objectManager.recreateFence(item);
    }
  }

  /**
   * Remove items from scene that are no longer in store
   */
  private removeOrphanedItems(sceneItemsMap: Map<string, THREE.Object3D>): void {
    for (const [uuid, obj] of sceneItemsMap) {
      // FIX: Detach controls before removing object to prevent scene graph error
      if (this.engine.interactionManager.transformControl?.object?.uuid === uuid) {
        this.engine.interactionManager.transformControl.detach();
        this.engine.interactionManager.transformControl.visible = false;
      }

      this.engine.scene.remove(obj);

      // Clear floor edit markers if this was the active floor
      if (this.engine.toolsManager.activeFloorId === uuid) {
        this.engine.toolsManager.clearFloorEditMarkers();
      }
    }
  }
}