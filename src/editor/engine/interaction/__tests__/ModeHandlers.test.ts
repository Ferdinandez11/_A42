// ============================================================================
// MODEHANDLERS TESTS - Branch & Decision Coverage
// Cubre:
// - early returns por raycast vacío / botón incorrecto / producto no seleccionado
// - combinaciones válidas/ inválidas de modos de interacción (dibujo, medición,
//   colocación de items y edición/selección)
// ============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import * as THREE from "three";

import { ModeHandlers } from "../ModeHandlers";
import type { RaycastHandler } from "../RaycastHandler";
import type { SelectionController } from "../SelectionController";

// Stores
vi.mock("@/editor/stores/editor/useEditorStore", () => ({
  useEditorStore: {
    getState: vi.fn(),
  },
}));

vi.mock("@/editor/stores/catalog/useCatalogStore", () => ({
  useCatalogStore: {
    getState: vi.fn(),
  },
}));

vi.mock("@/editor/stores/selection/useSelectionStore", () => ({
  useSelectionStore: {
    getState: vi.fn(),
  },
}));

// Helpers para tipos
type EditorStoreModule = typeof import("@/editor/stores/editor/useEditorStore");
type CatalogStoreModule = typeof import("@/editor/stores/catalog/useCatalogStore");
type SelectionStoreModule = typeof import("@/editor/stores/selection/useSelectionStore");

const useEditorStore = vi.mocked(
  (await import("@/editor/stores/editor/useEditorStore")) as EditorStoreModule
).useEditorStore;
const useCatalogStore = vi.mocked(
  (await import("@/editor/stores/catalog/useCatalogStore")) as CatalogStoreModule
).useCatalogStore;
const useSelectionStore = vi.mocked(
  (await import("@/editor/stores/selection/useSelectionStore")) as SelectionStoreModule
).useSelectionStore;

describe("ModeHandlers", () => {
  let engine: any;
  let raycastHandler: RaycastHandler;
  let selectionController: SelectionController;
  let modeHandlers: ModeHandlers;

  const makeMouseEvent = (overrides: Partial<MouseEvent> = {}): MouseEvent =>
    ({
      button: 0,
      shiftKey: false,
      ctrlKey: false,
      ...overrides,
    } as MouseEvent);

  beforeEach(() => {
    vi.clearAllMocks();

    // Stub mínimo del engine con sólo lo necesario para las decisiones de ModeHandlers
    engine = {
      toolsManager: {
        addDraftPoint: vi.fn(),
        createSolidFloor: vi.fn(),
        addFenceDraftPoint: vi.fn(),
        createSolidFence: vi.fn(),
        handleMeasurementClick: vi.fn(),
        floorEditMarkers: [] as THREE.Mesh[],
        selectVertex: vi.fn(),
      },
      objectManager: {
        placeObject: vi.fn(),
      },
      scene: new THREE.Scene(),
      interactionManager: {
        transformControl: {
          object: null as THREE.Object3D | null,
          detach: vi.fn(),
          attach: vi.fn(),
          setMode: vi.fn(),
          visible: false,
        },
      },
    };

    // RaycastHandler y SelectionController stub
    raycastHandler = {
      raycastInteractionPlane: vi.fn(),
      raycastObjects: vi.fn(),
      findItemRoot: vi.fn(),
    } as unknown as RaycastHandler;

    selectionController = {
      selectObject: vi.fn(),
    } as unknown as SelectionController;

    // Stores por defecto
    (useCatalogStore.getState as any).mockReturnValue({
      selectedProduct: null,
    });
    (useSelectionStore.getState as any).mockReturnValue({
      selectItem: vi.fn(),
    });
    (useEditorStore.getState as any).mockReturnValue({
      setMode: vi.fn(),
    });

    modeHandlers = new ModeHandlers(engine, raycastHandler, selectionController);
  });

  describe("handleDrawingFloor", () => {
    it("no debe hacer nada si el raycast no golpea el plano (early return)", () => {
      // Cubre: early return cuando raycastInteractionPlane devuelve null
      (raycastHandler.raycastInteractionPlane as any).mockReturnValue(null);

      const event = makeMouseEvent({ button: 0 });
      modeHandlers.handleDrawingFloor(event);

      expect(engine.toolsManager.addDraftPoint).not.toHaveBeenCalled();
      expect(engine.toolsManager.createSolidFloor).not.toHaveBeenCalled();
    });

    it("debe añadir punto con click izquierdo", () => {
      // Cubre: rama event.button === 0
      const point = new THREE.Vector3(1, 0, 2);
      (raycastHandler.raycastInteractionPlane as any).mockReturnValue({ point });

      const event = makeMouseEvent({ button: 0 });
      modeHandlers.handleDrawingFloor(event);

      expect(engine.toolsManager.addDraftPoint).toHaveBeenCalledWith(point);
      expect(engine.toolsManager.createSolidFloor).not.toHaveBeenCalled();
    });

    it("debe crear suelo con click derecho", () => {
      // Cubre: rama event.button === 2
      const point = new THREE.Vector3(1, 0, 2);
      (raycastHandler.raycastInteractionPlane as any).mockReturnValue({ point });

      const event = makeMouseEvent({ button: 2 });
      modeHandlers.handleDrawingFloor(event);

      expect(engine.toolsManager.createSolidFloor).toHaveBeenCalledTimes(1);
      expect(engine.toolsManager.addDraftPoint).not.toHaveBeenCalled();
    });
  });

  describe("handleDrawingFence", () => {
    it("no debe hacer nada si el raycast no golpea el plano (early return)", () => {
      // Cubre: early return en modo valla
      (raycastHandler.raycastInteractionPlane as any).mockReturnValue(null);

      const event = makeMouseEvent({ button: 0 });
      modeHandlers.handleDrawingFence(event);

      expect(engine.toolsManager.addFenceDraftPoint).not.toHaveBeenCalled();
      expect(engine.toolsManager.createSolidFence).not.toHaveBeenCalled();
    });

    it("debe añadir punto de valla con click izquierdo", () => {
      // Cubre: rama event.button === 0 en valla
      const point = new THREE.Vector3(3, 0, 4);
      (raycastHandler.raycastInteractionPlane as any).mockReturnValue({ point });

      const event = makeMouseEvent({ button: 0 });
      modeHandlers.handleDrawingFence(event);

      expect(engine.toolsManager.addFenceDraftPoint).toHaveBeenCalledWith(point);
      expect(engine.toolsManager.createSolidFence).not.toHaveBeenCalled();
    });

    it("debe crear valla con click derecho", () => {
      // Cubre: rama event.button === 2 en valla
      const point = new THREE.Vector3(3, 0, 4);
      (raycastHandler.raycastInteractionPlane as any).mockReturnValue({ point });

      const event = makeMouseEvent({ button: 2 });
      modeHandlers.handleDrawingFence(event);

      expect(engine.toolsManager.createSolidFence).toHaveBeenCalledTimes(1);
      expect(engine.toolsManager.addFenceDraftPoint).not.toHaveBeenCalled();
    });
  });

  describe("handleMeasuring", () => {
    it("no debe medir si no hay hit en el plano", () => {
      // Cubre: early return en modo medición
      (raycastHandler.raycastInteractionPlane as any).mockReturnValue(null);

      modeHandlers.handleMeasuring();

      expect(engine.toolsManager.handleMeasurementClick).not.toHaveBeenCalled();
    });

    it("debe enviar el punto a la herramienta de medición cuando hay hit", () => {
      // Cubre: rama con hit válido en modo medición
      const point = new THREE.Vector3(5, 0, 6);
      (raycastHandler.raycastInteractionPlane as any).mockReturnValue({ point });

      modeHandlers.handleMeasuring();

      expect(engine.toolsManager.handleMeasurementClick).toHaveBeenCalledWith(
        point
      );
    });
  });

  describe("handlePlacingItem", () => {
    it("no debe hacer nada si el botón no es el izquierdo", () => {
      // Cubre: early return por botón != 0
      const event = makeMouseEvent({ button: 1 });
      modeHandlers.handlePlacingItem(event);

      expect(engine.objectManager.placeObject).not.toHaveBeenCalled();
    });

    it("no debe colocar nada si no hay producto seleccionado", () => {
      // Cubre: guard !catalog.selectedProduct
      (useCatalogStore.getState as any).mockReturnValue({
        selectedProduct: null,
      });

      const event = makeMouseEvent({ button: 0 });
      modeHandlers.handlePlacingItem(event);

      expect(engine.objectManager.placeObject).not.toHaveBeenCalled();
    });

    it("no debe colocar nada si el raycast no devuelve punto", () => {
      // Cubre: guard !hit después de tener producto seleccionado
      (useCatalogStore.getState as any).mockReturnValue({
        selectedProduct: { id: "prod-1" },
      });
      (raycastHandler.raycastInteractionPlane as any).mockReturnValue(null);

      const event = makeMouseEvent({ button: 0 });
      modeHandlers.handlePlacingItem(event);

      expect(engine.objectManager.placeObject).not.toHaveBeenCalled();
    });

    it("debe colocar el objeto y ejecutar callbacks de selección y modo edición", () => {
      // Cubre:
      // - rama válida con producto + hit
      // - callback afterPlace selecciona item y cambia modo a 'editing'
      const selectedProduct = { id: "prod-1" };
      const point = new THREE.Vector3(10, 0, 20);
      const selectItem = vi.fn();
      const setMode = vi.fn();

      (useCatalogStore.getState as any).mockReturnValue({
        selectedProduct,
      });
      (useSelectionStore.getState as any).mockReturnValue({
        selectItem,
      });
      (useEditorStore.getState as any).mockReturnValue({
        setMode,
      });
      (raycastHandler.raycastInteractionPlane as any).mockReturnValue({ point });

      const event = makeMouseEvent({ button: 0 });
      modeHandlers.handlePlacingItem(event);

      expect(engine.objectManager.placeObject).toHaveBeenCalledTimes(1);
      const [x, z, product, cb] =
        (engine.objectManager.placeObject as any).mock.calls[0];
      expect(x).toBe(point.x);
      expect(z).toBe(point.z);
      expect(product).toBe(selectedProduct);
      expect(typeof cb).toBe("function");

      // Ejecutar callback y verificar efectos secundarios
      cb("uuid-123");
      expect(selectItem).toHaveBeenCalledWith("uuid-123");
      expect(setMode).toHaveBeenCalledWith("editing");
    });
  });

  describe("handleEditing", () => {
    it("no debe hacer nada si el botón no es el izquierdo", () => {
      // Cubre: early return en modo edición por botón != 0
      const event = makeMouseEvent({ button: 1 });
      modeHandlers.handleEditing(event);

      expect(
        (raycastHandler.raycastObjects as any).mock.calls.length
      ).toBe(0);
      expect(
        (selectionController.selectObject as any).mock.calls.length
      ).toBe(0);
    });

    it("debe manejar multi-select de marcador cuando se pulsa Shift/Ctrl", () => {
      // Cubre:
      // - rama markerHit.length > 0
      // - handleMarkerClick con (event.shiftKey || event.ctrlKey)
      const marker = new THREE.Mesh();
      marker.userData.pointIndex = 3;
      engine.toolsManager.floorEditMarkers = [marker];

      (raycastHandler.raycastObjects as any)
        // Primer raycast: contra floorEditMarkers
        .mockReturnValueOnce([{ object: marker }])
        // No se usa el segundo en este flujo
        .mockReturnValueOnce([]);

      const event = makeMouseEvent({ button: 0, shiftKey: true });
      modeHandlers.handleEditing(event);

      expect(engine.toolsManager.selectVertex).toHaveBeenCalledWith(3, true);
      expect(
        engine.interactionManager.transformControl.detach
      ).toHaveBeenCalled();
      expect(selectionController.selectObject).not.toHaveBeenCalled();
    });

    it("debe manejar single-select de marcador y adjuntar transformControl", () => {
      // Cubre:
      // - rama single-select en handleMarkerClick
      const marker = new THREE.Mesh();
      marker.userData.pointIndex = 5;
      engine.toolsManager.floorEditMarkers = [marker];
      engine.interactionManager.transformControl.object = null;

      (raycastHandler.raycastObjects as any)
        .mockReturnValueOnce([{ object: marker }])
        .mockReturnValueOnce([]);

      const event = makeMouseEvent({ button: 0 });
      modeHandlers.handleEditing(event);

      expect(engine.toolsManager.selectVertex).toHaveBeenCalledWith(5, false);
      expect(
        engine.interactionManager.transformControl.attach
      ).toHaveBeenCalledWith(marker);
      expect(
        engine.interactionManager.transformControl.setMode
      ).toHaveBeenCalledWith("translate");
      expect(engine.interactionManager.transformControl.visible).toBe(true);
    });

    it("debe seleccionar objeto cuando se hace click sobre un item interactuable", () => {
      // Cubre:
      // - rama intersects.length > 0
      // - findItemRoot devuelve item con userData.isItem = true
      const item = new THREE.Object3D();
      item.userData.isItem = true;
      engine.scene.add(item);

      (raycastHandler.raycastObjects as any)
        // Primer raycast (markers) -> vacío
        .mockReturnValueOnce([])
        // Segundo raycast (interactables) -> hit
        .mockReturnValueOnce([{ object: item }]);

      (raycastHandler.findItemRoot as any).mockReturnValue(item);

      const event = makeMouseEvent({ button: 0 });
      modeHandlers.handleEditing(event);

      expect(selectionController.selectObject).toHaveBeenCalledWith(item);
    });

    it("debe deseleccionar cuando se hace click en vacío y el transformControl no edita markers", () => {
      // Cubre:
      // - rama else (intersects.length === 0)
      // - transformControl.object existe y no es un floorEditMarker
      const tcObject = new THREE.Mesh();
      engine.interactionManager.transformControl.object = tcObject;
      engine.toolsManager.floorEditMarkers = []; // no contiene el objeto TC

      (raycastHandler.raycastObjects as any)
        // markers
        .mockReturnValueOnce([])
        // interactables
        .mockReturnValueOnce([]);

      const event = makeMouseEvent({ button: 0 });
      modeHandlers.handleEditing(event);

      expect(selectionController.selectObject).toHaveBeenCalledWith(null);
    });

    it("no debe deseleccionar cuando el transformControl está sobre un marker activo", () => {
      // Cubre:
      // - rama donde tc.object está incluido en floorEditMarkers
      const marker = new THREE.Mesh();
      engine.toolsManager.floorEditMarkers = [marker];
      engine.interactionManager.transformControl.object = marker;

      (raycastHandler.raycastObjects as any)
        // markers
        .mockReturnValueOnce([])
        // interactables
        .mockReturnValueOnce([]);

      const event = makeMouseEvent({ button: 0 });
      modeHandlers.handleEditing(event);

      expect(selectionController.selectObject).not.toHaveBeenCalled();
    });
  });
});


