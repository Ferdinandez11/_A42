// ============================================================================
// EVENT HANDLERS
// Manages keyboard and window resize events
// Extracted from A42Engine.ts (lines 412-458)
// ============================================================================

import type { A42Engine } from "@/editor/engine/A42Engine";
import { useEditorStore } from "@/editor/stores/editor/useEditorStore";
import { useSelectionStore } from "@/editor/stores/selection/useSelectionStore";
import { useSceneStore } from "@/editor/stores/scene/useSceneStore";

export class EventHandlers {
  private engine: A42Engine;

  constructor(engine: A42Engine) {
    this.engine = engine;
  }

  /**
   * Handle keyboard events (shortcuts, delete, undo)
   */
  public onKeyDown = (e: KeyboardEvent): void => {
    if (this.engine.walkManager.isEnabled) return;

    const editor = useEditorStore.getState();
    const selection = useSelectionStore.getState();
    const scene = useSceneStore.getState();

    if (editor.mode !== "editing") return;

    // Undo functionality
    if (e.key === "z" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      scene.undo();
      return;
    }

    const tc = this.engine.interactionManager.transformControl;
    if (!tc?.visible) return;

    // Transform mode shortcuts
    if (e.key === "t") {
      tc.setMode("translate");
    } else if (e.key === "r") {
      tc.setMode("rotate");
    } else if (e.key === "e") {
      tc.setMode("scale");
    } else if (e.key === "Delete" || e.key === "Backspace") {
      // Delete selected object
      const obj = tc.object;
      if (obj && !obj.userData.isFloorMarker) {
        tc.detach();
        tc.visible = false;
        this.engine.scene.remove(obj);
        this.engine.sceneManager.controls.enabled = true;

        scene.removeItem(obj.uuid);
        selection.selectItem(null);
        this.engine.toolsManager.clearFloorEditMarkers();
      }
    }
  };

  /**
   * Handle window resize events
   */
  public onWindowResize = (): void => {
    this.engine.sceneManager.onWindowResize();
  };
}