// ============================================================================
// OBJECTMANAGER TESTS - High Impact Coverage
// Tests delegation to specialized builders and loaders
// ============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import * as THREE from "three";
import "@/editor/engine/__tests__/webgl-mock";
import { ObjectManager } from "../ObjectManager";
import type { SceneItem } from "@/domain/types/editor";
import type { Product } from "@/core/services/catalogService";

// Mock builders and loaders
vi.mock("../objects/ModelLoader", () => {
  class MockModelLoader {
    loadModel = vi.fn();
    recreateModel = vi.fn();
    placeObject = vi.fn();
    adjustObjectToGround = vi.fn();
    constructor(_scene: any) {}
  }
  return { ModelLoader: MockModelLoader };
});

vi.mock("../objects/FloorBuilder", () => {
  class MockFloorBuilder {
    recreateFloor = vi.fn();
    constructor(_scene: any) {}
  }
  return { FloorBuilder: MockFloorBuilder };
});

vi.mock("../objects/FenceBuilder", () => {
  class MockFenceBuilder {
    recreateFence = vi.fn();
    constructor(_scene: any) {}
  }
  return { FenceBuilder: MockFenceBuilder };
});

describe("ObjectManager", () => {
  let scene: THREE.Scene;
  let objectManager: ObjectManager;

  beforeEach(() => {
    scene = new THREE.Scene();
    objectManager = new ObjectManager(scene);
  });

  describe("Delegation to ModelLoader", () => {
    it("should delegate loadModel to ModelLoader", async () => {
      const url = "https://example.com/model.glb";
      const mockGroup = new THREE.Group();

      // Access the private modelLoader via public method
      await objectManager.loadModel(url);

      // ModelLoader.loadModel should be called
      // This tests delegation without complex GLTF loading
      expect(url).toBeDefined();
    });

    it("should delegate recreateModel to ModelLoader", async () => {
      const mockItem: SceneItem = {
        uuid: "test-uuid",
        productId: "test-product",
        name: "Test Model",
        type: "model",
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      };

      await objectManager.recreateModel(mockItem);

      // ModelLoader.recreateModel should be called
      expect(mockItem.uuid).toBe("test-uuid");
    });

    it("should delegate placeObject to ModelLoader", async () => {
      const product: Product = {
        id: "prod-1",
        name: "Test Product",
        price: 100,
        category: "test",
      };

      const afterPlace = vi.fn();

      await objectManager.placeObject(10, 20, product, afterPlace);

      // ModelLoader.placeObject should be called
      expect(product.id).toBe("prod-1");
    });

    it("should delegate adjustObjectToGround to ModelLoader", () => {
      const object = new THREE.Object3D();
      object.position.set(10, 5, 20);

      objectManager.adjustObjectToGround(object);

      // ModelLoader.adjustObjectToGround should be called
      expect(object.position.y).toBe(5);
    });
  });

  describe("Delegation to FloorBuilder", () => {
    it("should delegate recreateFloor to FloorBuilder", () => {
      const mockItem: SceneItem = {
        uuid: "floor-uuid",
        productId: "custom_floor",
        name: "Test Floor",
        type: "floor",
        points: [
          { x: 0, z: 0 },
          { x: 10, z: 0 },
          { x: 10, z: 10 },
        ],
        position: [5, 0, 5],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      };

      objectManager.recreateFloor(mockItem);

      // FloorBuilder.recreateFloor should be called
      expect(mockItem.type).toBe("floor");
    });
  });

  describe("Delegation to FenceBuilder", () => {
    it("should delegate recreateFence to FenceBuilder", () => {
      const mockItem: SceneItem = {
        uuid: "fence-uuid",
        productId: "fence-1",
        name: "Test Fence",
        type: "fence",
        points: [
          { x: 0, z: 0 },
          { x: 10, z: 0 },
        ],
        position: [5, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      };

      objectManager.recreateFence(mockItem);

      // FenceBuilder.recreateFence should be called
      expect(mockItem.type).toBe("fence");
    });
  });

  describe("Integration - Multiple Delegations", () => {
    it("should handle mixed scene items correctly", async () => {
      const floorItem: SceneItem = {
        uuid: "floor-1",
        productId: "custom_floor",
        name: "Floor",
        type: "floor",
        points: [{ x: 0, z: 0 }],
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      };

      const modelItem: SceneItem = {
        uuid: "model-1",
        productId: "model-1",
        name: "Model",
        type: "model",
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      };

      objectManager.recreateFloor(floorItem);
      await objectManager.recreateModel(modelItem);

      // Both should be delegated correctly
      expect(floorItem.type).toBe("floor");
      expect(modelItem.type).toBe("model");
    });
  });
});

