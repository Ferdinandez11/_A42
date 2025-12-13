// ============================================================================
// SELECTION CONTROLLER
// Handles object selection and deselection
// Extracted from InteractionManager.ts (lines 151-366)
// ============================================================================

import * as THREE from "three";
import type { A42Engine } from "@/editor/engine/A42Engine";
import { useEditorStore } from "@/editor/stores/editor/useEditorStore";
import { useSelectionStore } from "@/editor/stores/selection/useSelectionStore";
import { useSceneStore } from "@/editor/stores/scene/useSceneStore";

export class SelectionController {
  private engine: A42Engine;

  constructor(engine: A42Engine) {
    this.engine = engine;
  }

  /**
   * Selects an item by its UUID
   */
  public selectItemByUUID(uuid: string | null): void {
    if (!uuid) {
      this.selectObject(null);
      return;
    }

    let foundObject: THREE.Object3D | null = null;
    this.engine.scene.traverse((obj) => {
      if (obj.userData?.uuid === uuid && obj.userData?.isItem) {
        foundObject = obj;
      }
    });

    if (foundObject) {
      if (this.engine.interactionManager.transformControl?.object === foundObject) {
        return;
      }
      this.attachGizmo(foundObject);
    } else {
      this.selectObject(null);
    }
  }

  /**
   * Selects or deselects an object
   */
  public selectObject(object: THREE.Object3D | null): void {
    const selection = useSelectionStore.getState();
    const editor = useEditorStore.getState();
    const tc = this.engine.interactionManager.transformControl;

    if (!tc) return;

    if (!object) {
      // Deselect
      tc.detach();
      tc.visible = false;
      this.engine.sceneManager.controls.enabled = true;
      this.engine.toolsManager.clearFloorEditMarkers();

      selection.selectItem(null);
      editor.setMode("idle");
      return;
    }

    // Select
    selection.selectItem(object.userData.uuid);
    editor.setMode("editing");
    this.attachGizmo(object);
  }

  /**
   * Attaches the transform gizmo to an object
   */
  public attachGizmo(object: THREE.Object3D): void {
    const tc = this.engine.interactionManager.transformControl;
    if (!tc) return;

    tc.attach(object);
    tc.visible = true;

    // Show edit markers for floors and fences
    const item = useSceneStore
      .getState()
      .items.find((i) => i.uuid === object.userData.uuid);

    if (item && (item.type === "floor" || item.type === "fence")) {
      this.engine.toolsManager.showFloorEditMarkers(
        object.userData.uuid,
        item.points
      );
    } else {
      this.engine.toolsManager.clearFloorEditMarkers();
    }
  }
}