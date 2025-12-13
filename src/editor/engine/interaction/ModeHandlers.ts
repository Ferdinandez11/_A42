// ============================================================================
// MODE HANDLERS
// Handles different interaction modes (drawing, measuring, placing, editing)
// Extracted from InteractionManager.ts (lines 199-314)
// ============================================================================

import * as THREE from "three";
import type { A42Engine } from "@/editor/engine/A42Engine";
import type { RaycastHandler } from "./RaycastHandler";
import type { SelectionController } from "./SelectionController";
import { useEditorStore } from "@/editor/stores/editor/useEditorStore";
import { useCatalogStore } from "@/editor/stores/catalog/useCatalogStore";
import { useSelectionStore } from "@/editor/stores/selection/useSelectionStore";

export class ModeHandlers {
  private engine: A42Engine;
  private raycastHandler: RaycastHandler;
  private selectionController: SelectionController;

  constructor(
    engine: A42Engine,
    raycastHandler: RaycastHandler,
    selectionController: SelectionController
  ) {
    this.engine = engine;
    this.raycastHandler = raycastHandler;
    this.selectionController = selectionController;
  }

  /**
   * Handle drawing floor mode
   */
  public handleDrawingFloor(event: MouseEvent): void {
    const hit = this.raycastHandler.raycastInteractionPlane();
    if (!hit) return;

    if (event.button === 0) {
      // Left click - add point
      this.engine.toolsManager.addDraftPoint(hit.point);
    } else if (event.button === 2) {
      // Right click - create floor
      this.engine.toolsManager.createSolidFloor();
    }
  }

  /**
   * Handle drawing fence mode
   */
  public handleDrawingFence(event: MouseEvent): void {
    const hit = this.raycastHandler.raycastInteractionPlane();
    if (!hit) return;

    if (event.button === 0) {
      // Left click - add point
      this.engine.toolsManager.addFenceDraftPoint(hit.point);
    } else if (event.button === 2) {
      // Right click - create fence
      this.engine.toolsManager.createSolidFence();
    }
  }

  /**
   * Handle measuring mode
   */
  public handleMeasuring(): void {
    const hit = this.raycastHandler.raycastInteractionPlane();
    if (!hit) return;

    this.engine.toolsManager.handleMeasurementClick(hit.point);
  }

  /**
   * Handle placing item mode
   */
  public handlePlacingItem(event: MouseEvent): void {
    if (event.button !== 0) return;

    const catalog = useCatalogStore.getState();
    const selectionStore = useSelectionStore.getState();
    const editor = useEditorStore.getState();

    if (!catalog.selectedProduct) return;

    const hit = this.raycastHandler.raycastInteractionPlane();
    if (!hit) return;

    this.engine.objectManager.placeObject(
      hit.point.x,
      hit.point.z,
      catalog.selectedProduct,
      (uuid) => {
        selectionStore.selectItem(uuid);
        editor.setMode("editing");
      }
    );
  }

  /**
   * Handle idle/editing mode (object selection)
   */
  public handleEditing(event: MouseEvent): void {
    if (event.button !== 0) return;

    // Check for floor marker clicks first
    const markerHit = this.raycastHandler.raycastObjects(
      this.engine.toolsManager.floorEditMarkers
    );

    if (markerHit.length > 0) {
      this.handleMarkerClick(markerHit[0], event);
      return;
    }

    // Check for object clicks
    const interactables = this.engine.scene.children.filter(
      (obj) =>
        obj.userData?.isItem &&
        obj !== this.engine.interactionManager.transformControl
    );
    const intersects = this.raycastHandler.raycastObjects(interactables, true);

    if (intersects.length > 0) {
      const target = this.raycastHandler.findItemRoot(intersects[0].object);
      if (target && target.userData?.isItem) {
        this.selectionController.selectObject(target);
      }
    } else {
      // Clicked empty space - deselect if not editing floor markers
      const tc = this.engine.interactionManager.transformControl;
      if (
        tc?.object &&
        !this.engine.toolsManager.floorEditMarkers.includes(
          tc.object as THREE.Mesh
        )
      ) {
        this.selectionController.selectObject(null);
      }
    }
  }

  /**
   * Handle floor marker vertex selection
   */
  private handleMarkerClick(
    hit: THREE.Intersection,
    event: MouseEvent
  ): void {
    const marker = hit.object;
    const idx = marker.userData.pointIndex;
    const tc = this.engine.interactionManager.transformControl;

    if (event.shiftKey || event.ctrlKey) {
      // Multi-select mode
      this.engine.toolsManager.selectVertex(idx, true);
      tc?.detach();
      return;
    }

    // Single select
    this.engine.toolsManager.selectVertex(idx, false);
    if (tc) {
      tc.attach(marker);
      tc.setMode("translate");
      tc.visible = true;
    }
  }
}