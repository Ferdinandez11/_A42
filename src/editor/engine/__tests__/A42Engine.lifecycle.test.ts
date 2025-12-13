// ============================================================================
// A42ENGINE TESTS - Lifecycle & Render Loop
// Tests for init, render, and dispose functionality
// Created before refactoring as safety net (Phase 2)
// ============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@/editor/engine/__tests__/webgl-mock"; // Import mock before Three.js
import { A42Engine } from "@/editor/engine/A42Engine";

// Mock stores with implementation
vi.mock("@/editor/stores/editor/useEditorStore", () => ({
  useEditorStore: Object.assign(
    vi.fn(() => ({
      safetyZonesVisible: true,
      gridVisible: true,
      mode: "idle" as const,
    })),
    {
      getState: () => ({
        safetyZonesVisible: true,
        gridVisible: true,
        mode: "idle" as const,
      }),
    }
  ),
}));

vi.mock("@/editor/stores/scene/useSceneStore", () => ({
  useSceneStore: Object.assign(
    vi.fn(() => ({
      items: [],
      undo: vi.fn(),
      removeItem: vi.fn(),
    })),
    {
      getState: () => ({
        items: [],
        undo: vi.fn(),
        removeItem: vi.fn(),
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

describe("A42Engine - Lifecycle", () => {
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

  describe("Constructor", () => {
    it("should initialize all managers", () => {
      expect(engine.sceneManager).toBeDefined();
      expect(engine.objectManager).toBeDefined();
      expect(engine.toolsManager).toBeDefined();
      expect(engine.interactionManager).toBeDefined();
      expect(engine.walkManager).toBeDefined();
      expect(engine.recorderManager).toBeDefined();
      expect(engine.exportManager).toBeDefined();
      expect(engine.pdfManager).toBeDefined();
    });

    it("should enable XR on renderer", () => {
      expect(engine.renderer.xr.enabled).toBe(true);
    });

    it("should setup window event listeners", () => {
      // Window listeners are added, we can verify by checking if dispose removes them
      const resizeSpy = vi.spyOn(window, "removeEventListener");
      engine.dispose();

      expect(resizeSpy).toHaveBeenCalledWith("resize", expect.any(Function));
      expect(resizeSpy).toHaveBeenCalledWith("keydown", expect.any(Function));

      resizeSpy.mockRestore();
    });
  });

  describe("Getters", () => {
    it("should return scene from sceneManager", () => {
      expect(engine.scene).toBe(engine.sceneManager.scene);
    });

    it("should return active camera from sceneManager", () => {
      expect(engine.activeCamera).toBe(engine.sceneManager.activeCamera);
    });

    it("should return renderer from sceneManager", () => {
      expect(engine.renderer).toBe(engine.sceneManager.renderer);
    });
  });

  describe("init()", () => {
    it("should set animation loop on renderer", () => {
      const setAnimationLoopSpy = vi.spyOn(
        engine.renderer,
        "setAnimationLoop"
      );

      engine.init();

      expect(setAnimationLoopSpy).toHaveBeenCalledWith(expect.any(Function));

      setAnimationLoopSpy.mockRestore();
    });
  });

  describe("dispose()", () => {
    it("should stop animation loop", () => {
      engine.init();

      const setAnimationLoopSpy = vi.spyOn(
        engine.renderer,
        "setAnimationLoop"
      );

      engine.dispose();

      expect(setAnimationLoopSpy).toHaveBeenCalledWith(null);

      setAnimationLoopSpy.mockRestore();
    });

    it("should remove window event listeners", () => {
      const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

      engine.dispose();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "resize",
        expect.any(Function)
      );
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "keydown",
        expect.any(Function)
      );

      removeEventListenerSpy.mockRestore();
    });

    it("should dispose scene manager", () => {
      const disposeSpy = vi.spyOn(engine.sceneManager, "dispose");

      engine.dispose();

      expect(disposeSpy).toHaveBeenCalled();

      disposeSpy.mockRestore();
    });
  });
});

describe("A42Engine - Render Loop", () => {
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

  describe("render()", () => {
    it("should clean up orphaned TransformControls", () => {
      // Create a mock object NOT in scene
      const orphanedObject = {
        parent: null,
        uuid: "orphaned",
      };

      // Attach to TransformControls
      if (engine.interactionManager.transformControl) {
        // @ts-ignore - forcing attachment for test
        engine.interactionManager.transformControl.object = orphanedObject;
        engine.interactionManager.transformControl.visible = true;
      }

      // Manually call render (normally called in animation loop)
      // @ts-ignore - accessing private method for testing
      engine.render();

      // Should detach and hide
      expect(engine.interactionManager.transformControl?.object).toBeUndefined();
      expect(engine.interactionManager.transformControl?.visible).toBe(false);
    });

    it("should update controls when walk mode disabled", () => {
      // Mock isEnabled getter to return false
      vi.spyOn(engine.walkManager, "isEnabled", "get").mockReturnValue(false);

      const updateSpy = vi.spyOn(engine.sceneManager.controls, "update");

      // @ts-ignore - accessing private method
      engine.render();

      expect(updateSpy).toHaveBeenCalled();

      updateSpy.mockRestore();
    });

    it("should not update controls when walk mode enabled", () => {
      // Mock isEnabled getter to return true
      vi.spyOn(engine.walkManager, "isEnabled", "get").mockReturnValue(true);

      const updateSpy = vi.spyOn(engine.sceneManager.controls, "update");

      // @ts-ignore - accessing private method
      engine.render();

      expect(updateSpy).not.toHaveBeenCalled();

      updateSpy.mockRestore();
    });

    it("should call renderer.render", () => {
      const renderSpy = vi.spyOn(engine.sceneManager.renderer, "render");

      // @ts-ignore - accessing private method
      engine.render();

      expect(renderSpy).toHaveBeenCalledWith(engine.scene, engine.activeCamera);

      renderSpy.mockRestore();
    });
  });
});