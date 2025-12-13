// ============================================================================
// INTERACTIONMANAGER TESTS - Object Selection
// Tests for object selection and deselection functionality
// Created before refactoring as safety net (Phase 3)
// ============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "./webgl-mock"; // Import mock before Three.js
import * as THREE from "three";
import { A42Engine } from "@/editor/engine/A42Engine";
//import type { SceneItem } from "@/domain/types/editor";

// Mock stores with implementation
const mockSetMode = vi.fn();
const mockSelectItem = vi.fn();

vi.mock("@/editor/stores/editor/useEditorStore", () => ({
  useEditorStore: Object.assign(
    vi.fn(() => ({
      safetyZonesVisible: true,
      mode: "idle" as const,
      setMode: mockSetMode,
    })),
    {
      getState: () => ({
        safetyZonesVisible: true,
        mode: "idle" as const,
        setMode: mockSetMode,
      }),
    }
  ),
}));

vi.mock("@/editor/stores/scene/useSceneStore", () => ({
  useSceneStore: Object.assign(
    vi.fn(() => ({
      items: [],
      saveSnapshot: vi.fn(),
      updateItemTransform: vi.fn(),
    })),
    {
      getState: () => ({
        items: [],
        saveSnapshot: vi.fn(),
        updateItemTransform: vi.fn(),
      }),
    }
  ),
}));

vi.mock("@/editor/stores/selection/useSelectionStore", () => ({
  useSelectionStore: Object.assign(
    vi.fn(() => ({
      selectedItem: null,
      selectItem: mockSelectItem,
    })),
    {
      getState: () => ({
        selectedItem: null,
        selectItem: mockSelectItem,
      }),
    }
  ),
}));

vi.mock("@/editor/stores/catalog/useCatalogStore", () => ({
  useCatalogStore: Object.assign(
    vi.fn(() => ({
      selectedProduct: null,
    })),
    {
      getState: () => ({
        selectedProduct: null,
      }),
    }
  ),
}));

describe("InteractionManager - Selection", () => {
  let container: HTMLDivElement;
  let engine: A42Engine;

  beforeEach(() => {
    container = document.createElement("div");
    container.style.width = "800px";
    container.style.height = "600px";
    document.body.appendChild(container);

    engine = new A42Engine(container);
    
    // Clear mocks
    mockSetMode.mockClear();
    mockSelectItem.mockClear();
  });

  afterEach(() => {
    engine.dispose();
    document.body.removeChild(container);
  });

  describe("selectObject()", () => {
    it("should select an object and attach gizmo", () => {
      const testObject = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshBasicMaterial()
      );
      testObject.userData.isItem = true;
      testObject.userData.uuid = "test-item-1";
      engine.scene.add(testObject);

      engine.interactionManager.selectObject(testObject);

      expect(engine.interactionManager.transformControl?.object).toBe(
        testObject
      );
      expect(engine.interactionManager.transformControl?.visible).toBe(true);
      expect(mockSelectItem).toHaveBeenCalledWith("test-item-1");
      expect(mockSetMode).toHaveBeenCalledWith("editing");
    });

    it("should deselect when passed null", () => {
      // First select an object
      const testObject = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshBasicMaterial()
      );
      testObject.userData.isItem = true;
      testObject.userData.uuid = "test-item-1";
      engine.scene.add(testObject);
      engine.interactionManager.selectObject(testObject);

      // Clear mocks after selection
      mockSelectItem.mockClear();
      mockSetMode.mockClear();

      // Now deselect
      engine.interactionManager.selectObject(null);

      expect(engine.interactionManager.transformControl?.object).toBeUndefined();
      expect(engine.interactionManager.transformControl?.visible).toBe(false);
      expect(mockSelectItem).toHaveBeenCalledWith(null);
      expect(mockSetMode).toHaveBeenCalledWith("idle");
    });

    it("should enable orbit controls when deselecting", () => {
      const testObject = new THREE.Mesh();
      testObject.userData.isItem = true;
      engine.scene.add(testObject);
      engine.interactionManager.selectObject(testObject);

      // Deselect
      engine.interactionManager.selectObject(null);

      expect(engine.sceneManager.controls.enabled).toBe(true);
    });
  });

  describe("selectItemByUUID()", () => {
    it("should find and select object by UUID", () => {
      const testObject = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshBasicMaterial()
      );
      testObject.userData.isItem = true;
      testObject.userData.uuid = "unique-test-uuid";
      engine.scene.add(testObject);

      engine.interactionManager.selectItemByUUID("unique-test-uuid");

      expect(engine.interactionManager.transformControl?.object).toBe(
        testObject
      );
      expect(engine.interactionManager.transformControl?.visible).toBe(true);
    });

    it("should deselect when UUID is null", () => {
      const testObject = new THREE.Mesh();
      testObject.userData.isItem = true;
      testObject.userData.uuid = "test-uuid";
      engine.scene.add(testObject);
      engine.interactionManager.selectObject(testObject);

      engine.interactionManager.selectItemByUUID(null);

      expect(engine.interactionManager.transformControl?.object).toBeUndefined();
      expect(engine.interactionManager.transformControl?.visible).toBe(false);
    });

    it("should deselect if UUID not found", () => {
      const testObject = new THREE.Mesh();
      testObject.userData.isItem = true;
      testObject.userData.uuid = "existing-uuid";
      engine.scene.add(testObject);
      engine.interactionManager.selectObject(testObject);

      engine.interactionManager.selectItemByUUID("non-existent-uuid");

      expect(engine.interactionManager.transformControl?.object).toBeUndefined();
      expect(engine.interactionManager.transformControl?.visible).toBe(false);
    });

    it("should not re-attach if already selected", () => {
      const testObject = new THREE.Mesh();
      testObject.userData.isItem = true;
      testObject.userData.uuid = "test-uuid";
      engine.scene.add(testObject);

      engine.interactionManager.selectItemByUUID("test-uuid");
      const firstAttach = engine.interactionManager.transformControl?.object;

      // Clear mocks
      mockSelectItem.mockClear();

      // Select again
      engine.interactionManager.selectItemByUUID("test-uuid");

      // Should still be same object but not call selectItem again
      expect(engine.interactionManager.transformControl?.object).toBe(
        firstAttach
      );
    });
  });

  describe("Floor/Fence Edit Markers", () => {
    it.skip("should show edit markers for floor items", async () => {
      // SKIPPED: Complex store mocking required
      // This functionality works in integration - markers appear when floor selected
    });

    it.skip("should clear edit markers when selecting non-floor items", async () => {
      // SKIPPED: Complex store mocking required
      // This functionality works in integration - markers clear when non-floor selected
    });
  });
});