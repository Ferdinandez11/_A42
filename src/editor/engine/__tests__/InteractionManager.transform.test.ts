// ============================================================================
// INTERACTIONMANAGER TESTS - Transform Controls
// Tests for transform controls initialization and events
// Created before refactoring as safety net (Phase 3)
// ============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "./webgl-mock"; // Import mock before Three.js
import * as THREE from "three";
import { A42Engine } from "@/editor/engine/A42Engine";

// Mock stores with implementation
vi.mock("@/editor/stores/editor/useEditorStore", () => ({
  useEditorStore: Object.assign(
    vi.fn(() => ({
      safetyZonesVisible: true,
      mode: "idle" as const,
      setMode: vi.fn(),
    })),
    {
      getState: () => ({
        safetyZonesVisible: true,
        mode: "idle" as const,
        setMode: vi.fn(),
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
      selectItem: vi.fn(),
    })),
    {
      getState: () => ({
        selectedItem: null,
        selectItem: vi.fn(),
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

describe("InteractionManager - Transform Controls", () => {
  let container: HTMLDivElement;
  let engine: A42Engine;

  beforeEach(() => {
    container = document.createElement("div");
    container.style.width = "800px";
    container.style.height = "600px";
    document.body.appendChild(container);

    engine = new A42Engine(container);
  });

  afterEach(() => {
    engine.dispose();
    document.body.removeChild(container);
  });

  describe("Initialization", () => {
    it("should initialize transform controls", () => {
      expect(engine.interactionManager.transformControl).toBeDefined();
      expect(engine.interactionManager.transformControl).not.toBeNull();
    });

    it("should add transform controls to scene", () => {
      const tc = engine.interactionManager.transformControl;
      expect(tc?.parent).toBe(engine.scene);
    });

    it("should initialize detached and invisible", () => {
      const tc = engine.interactionManager.transformControl;
      expect(tc?.object).toBeUndefined();
      expect(tc?.visible).toBe(false);
    });

    it("should set rotation snap to PI/12", () => {
      const tc = engine.interactionManager.transformControl;
      expect(tc?.rotationSnap).toBe(Math.PI / 12);
    });
  });

  describe("Interaction Plane", () => {
    it("should create interaction plane", () => {
      expect(engine.interactionManager.interactionPlane).toBeDefined();
    });

    it("should add interaction plane to scene", () => {
      expect(engine.interactionManager.interactionPlane.parent).toBe(
        engine.scene
      );
    });

    it("should mark interaction plane in userData", () => {
      expect(
        engine.interactionManager.interactionPlane.userData.isInteractionPlane
      ).toBe(true);
    });

    it("should rotate interaction plane to horizontal", () => {
      const rotation = engine.interactionManager.interactionPlane.rotation;
      expect(rotation.x).toBeCloseTo(-Math.PI / 2);
    });
  });

  describe("updateCamera()", () => {
    it("should update transform control camera", () => {
      const newCamera = new THREE.PerspectiveCamera();
      engine.interactionManager.updateCamera(newCamera);

      expect(engine.interactionManager.transformControl?.camera).toBe(
        newCamera
      );
    });

    it("should handle null transform control gracefully", () => {
      engine.interactionManager.transformControl = null;
      const newCamera = new THREE.PerspectiveCamera();

      expect(() => {
        engine.interactionManager.updateCamera(newCamera);
      }).not.toThrow();
    });
  });

  describe("setGizmoMode()", () => {
    it("should set transform control to translate mode", () => {
      const tc = engine.interactionManager.transformControl;
      if (!tc) throw new Error("Transform control not initialized");

      engine.interactionManager.setGizmoMode("translate");
      expect(tc.mode).toBe("translate");
    });

    it("should set transform control to rotate mode", () => {
      const tc = engine.interactionManager.transformControl;
      if (!tc) throw new Error("Transform control not initialized");

      engine.interactionManager.setGizmoMode("rotate");
      expect(tc.mode).toBe("rotate");
    });

    it("should set transform control to scale mode", () => {
      const tc = engine.interactionManager.transformControl;
      if (!tc) throw new Error("Transform control not initialized");

      engine.interactionManager.setGizmoMode("scale");
      expect(tc.mode).toBe("scale");
    });

    it("should handle null transform control gracefully", () => {
      engine.interactionManager.transformControl = null;

      expect(() => {
        engine.interactionManager.setGizmoMode("translate");
      }).not.toThrow();
    });
  });

  describe("isDraggingGizmo", () => {
    it("should initialize as false", () => {
      expect(engine.interactionManager.isDraggingGizmo).toBe(false);
    });
  });
});