// ============================================================================
// A42ENGINE TESTS - Scene Synchronization
// Tests for critical syncSceneFromStore() functionality
// Created before refactoring as safety net (Phase 2)
// ============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as THREE from "three";
import { A42Engine } from "@/editor/engine/A42Engine";
import type { SceneItem } from "@/domain/types/editor";

// Mock stores
vi.mock("@/editor/stores/editor/useEditorStore");
vi.mock("@/editor/stores/scene/useSceneStore");
vi.mock("@/editor/stores/selection/useSelectionStore");

describe("A42Engine - Scene Synchronization", () => {
  let container: HTMLDivElement;
  let engine: A42Engine;

  beforeEach(() => {
    // Create container
    container = document.createElement("div");
    container.style.width = "800px";
    container.style.height = "600px";
    document.body.appendChild(container);

    // Create engine
    engine = new A42Engine(container);
  });

  afterEach(() => {
    engine.dispose();
    document.body.removeChild(container);
  });

  describe("syncSceneFromStore()", () => {
    it("should add new floor item to scene", async () => {
      const floorItem: SceneItem = {
        uuid: "floor-test-1",
        productId: "custom_floor",
        name: "Test Floor",
        type: "floor",
        price: 100,
        points: [
          { x: 0, z: 0 },
          { x: 5, z: 0 },
          { x: 5, z: 5 },
          { x: 0, z: 5 },
        ],
        floorMaterial: "rubber_red",
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      };

      await engine.syncSceneFromStore([floorItem]);

      const sceneFloor = engine.scene.getObjectByProperty(
        "uuid",
        "floor-test-1"
      );
      expect(sceneFloor).toBeDefined();
      expect(sceneFloor?.userData.isItem).toBe(true);
      expect(sceneFloor?.userData.type).toBe("floor");
    });

    it("should add new fence item to scene", async () => {
      const fenceItem: SceneItem = {
        uuid: "fence-test-1",
        productId: "fence_wood",
        name: "Test Fence",
        type: "fence",
        price: 200,
        points: [
          { x: 0, z: 0 },
          { x: 5, z: 0 },
        ],
        fenceConfig: {
          presetId: "wood",
          colors: { post: 0x8b4513, slatA: 0x654321 },
        },
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      };

      await engine.syncSceneFromStore([fenceItem]);

      const sceneFence = engine.scene.getObjectByProperty(
        "uuid",
        "fence-test-1"
      );
      expect(sceneFence).toBeDefined();
      expect(sceneFence?.userData.isItem).toBe(true);
      expect(sceneFence?.userData.type).toBe("fence");
    });

    it("should update existing item transform", async () => {
      const item: SceneItem = {
        uuid: "model-test-1",
        productId: "test-model",
        name: "Test Model",
        type: "model",
        price: 50,
        modelUrl: "test.glb",
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      };

      // First sync - create item
      await engine.syncSceneFromStore([item]);

      // Second sync - update transform
      const updatedItem = {
        ...item,
        position: [5, 0, 5] as [number, number, number],
        rotation: [0, Math.PI / 2, 0] as [number, number, number],
        scale: [2, 2, 2] as [number, number, number],
      };

      await engine.syncSceneFromStore([updatedItem]);

      const sceneObj = engine.scene.getObjectByProperty("uuid", "model-test-1");
      expect(sceneObj).toBeDefined();
      expect(sceneObj?.position.toArray()).toEqual([5, 0, 5]);
      expect(sceneObj?.rotation.toArray().slice(0, 3)).toEqual([
        0,
        Math.PI / 2,
        0,
      ]);
      expect(sceneObj?.scale.toArray()).toEqual([2, 2, 2]);
    });

    it("should recreate floor when points change", async () => {
      const floorItem: SceneItem = {
        uuid: "floor-test-2",
        productId: "custom_floor",
        name: "Test Floor",
        type: "floor",
        price: 100,
        points: [
          { x: 0, z: 0 },
          { x: 5, z: 0 },
          { x: 5, z: 5 },
          { x: 0, z: 5 },
        ],
        floorMaterial: "rubber_red",
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      };

      // First sync
      await engine.syncSceneFromStore([floorItem]);
      const firstFloor = engine.scene.getObjectByProperty(
        "uuid",
        "floor-test-2"
      );
      const firstChildrenCount = firstFloor?.children.length;

      // Second sync with different points
      const updatedFloor = {
        ...floorItem,
        points: [
          { x: 0, z: 0 },
          { x: 10, z: 0 },
          { x: 10, z: 10 },
          { x: 0, z: 10 },
        ],
      };

      await engine.syncSceneFromStore([updatedFloor]);

      const secondFloor = engine.scene.getObjectByProperty(
        "uuid",
        "floor-test-2"
      );
      expect(secondFloor).toBeDefined();
      // Should be recreated (may have different structure)
      expect(secondFloor?.userData.points).toEqual(updatedFloor.points);
    });

    it("should recreate floor when material changes", async () => {
      const floorItem: SceneItem = {
        uuid: "floor-test-3",
        productId: "custom_floor",
        name: "Test Floor",
        type: "floor",
        price: 100,
        points: [
          { x: 0, z: 0 },
          { x: 5, z: 0 },
          { x: 5, z: 5 },
          { x: 0, z: 5 },
        ],
        floorMaterial: "rubber_red",
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      };

      await engine.syncSceneFromStore([floorItem]);

      // Change material
      const updatedFloor = {
        ...floorItem,
        floorMaterial: "rubber_blue" as any,
      };

      await engine.syncSceneFromStore([updatedFloor]);

      const sceneFloor = engine.scene.getObjectByProperty(
        "uuid",
        "floor-test-3"
      );
      expect(sceneFloor?.userData.floorMaterial).toBe("rubber_blue");
    });

    it("should remove items not in store", async () => {
      const item1: SceneItem = {
        uuid: "item-1",
        productId: "test",
        name: "Item 1",
        type: "model",
        price: 50,
        modelUrl: "test.glb",
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      };

      const item2: SceneItem = {
        uuid: "item-2",
        productId: "test",
        name: "Item 2",
        type: "model",
        price: 50,
        modelUrl: "test.glb",
        position: [5, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      };

      // Add both items
      await engine.syncSceneFromStore([item1, item2]);

      expect(engine.scene.getObjectByProperty("uuid", "item-1")).toBeDefined();
      expect(engine.scene.getObjectByProperty("uuid", "item-2")).toBeDefined();

      // Sync with only item1
      await engine.syncSceneFromStore([item1]);

      expect(engine.scene.getObjectByProperty("uuid", "item-1")).toBeDefined();
      expect(engine.scene.getObjectByProperty("uuid", "item-2")).toBeUndefined();
    });

    it("should detach transform controls before removing object", async () => {
      const item: SceneItem = {
        uuid: "item-to-remove",
        productId: "test",
        name: "Test",
        type: "model",
        price: 50,
        modelUrl: "test.glb",
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      };

      await engine.syncSceneFromStore([item]);
      const sceneObj = engine.scene.getObjectByProperty("uuid", "item-to-remove");

      // Attach transform controls
      if (sceneObj && engine.interactionManager.transformControl) {
        engine.interactionManager.transformControl.attach(sceneObj);
      }

      // Remove item - should detach controls
      await engine.syncSceneFromStore([]);

      expect(
        engine.interactionManager.transformControl?.object
      ).toBeUndefined();
    });

    it("should handle empty items array", async () => {
      await engine.syncSceneFromStore([]);

      const itemCount = engine.scene.children.filter(
        (child) => child.userData?.isItem
      ).length;
      expect(itemCount).toBe(0);
    });

    it("should not update scale if object is animating", async () => {
      const item: SceneItem = {
        uuid: "animating-item",
        productId: "test",
        name: "Test",
        type: "model",
        price: 50,
        modelUrl: "test.glb",
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      };

      await engine.syncSceneFromStore([item]);
      const sceneObj = engine.scene.getObjectByProperty("uuid", "animating-item");

      // Mark as animating
      if (sceneObj) {
        sceneObj.userData.isAnimating = true;
      }

      // Try to update scale
      const updatedItem = {
        ...item,
        scale: [5, 5, 5] as [number, number, number],
      };

      await engine.syncSceneFromStore([updatedItem]);

      // Scale should NOT be updated
      expect(sceneObj?.scale.toArray()).toEqual([1, 1, 1]);
    });
  });
});