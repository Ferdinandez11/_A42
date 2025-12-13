// ============================================================================
// TRANSFORM CONTROLLER
// Manages TransformControls and its event listeners
// Extracted from InteractionManager.ts (lines 43-115)
// ============================================================================

import * as THREE from "three";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import type { A42Engine } from "@/editor/engine/A42Engine";
import type { AnimationController } from "./AnimationController";
import { useSceneStore } from "@/editor/stores/scene/useSceneStore";

export class TransformController {
  private engine: A42Engine;
  private animationController: AnimationController;
  public transformControl: TransformControls | null = null;
  private dragStartPosition: THREE.Vector3 = new THREE.Vector3();

  constructor(engine: A42Engine, animationController: AnimationController) {
    this.engine = engine;
    this.animationController = animationController;
  }

  /**
   * Initialize transform controls with all event listeners
   */
  public initialize(): void {
    try {
      this.transformControl = new TransformControls(
        this.engine.activeCamera as THREE.Camera,
        this.engine.renderer.domElement
      );

      this.transformControl.rotationSnap = Math.PI / 12;
      this.engine.scene.add(this.transformControl);

      this.setupEventListeners();

      this.transformControl.detach();
      this.transformControl.visible = false;
    } catch (error) {
      console.error("ERROR: TransformControls", error);
      this.transformControl = null;
    }
  }

  /**
   * Setup all transform control event listeners
   */
  private setupEventListeners(): void {
    if (!this.transformControl) return;

    // Dragging start/end
    this.transformControl.addEventListener(
      "dragging-changed",
      this.onDraggingChanged
    );

    // Update markers during drag
    this.transformControl.addEventListener("change", this.onChange);

    // Adjust to ground after transform
    this.transformControl.addEventListener(
      "objectChange",
      this.onObjectChange
    );
  }

  /**
   * Handle dragging started/stopped
   */
  private onDraggingChanged = (event: any): void => {
    const scene = useSceneStore.getState();
    const obj = this.transformControl?.object;

    this.engine.interactionManager.isDraggingGizmo = event.value;
    this.engine.sceneManager.controls.enabled = !event.value;

    if (!obj) return;

    if (event.value) {
      // Drag started - save position and create snapshot
      this.dragStartPosition.copy(obj.position);
      scene.saveSnapshot();
    } else {
      // Drag ended - check collisions and update
      if (this.engine.isObjectColliding(obj)) {
        this.animationController.animateRevert(obj, this.dragStartPosition);
      } else {
        if (obj.userData.isFloorMarker) {
          this.engine.toolsManager.updateFloorFromMarkers(obj);
        } else if (obj.userData.isItem) {
          this.engine.objectManager.adjustObjectToGround(obj);
          this.syncTransformToStore(obj);
        }
      }
    }
  };

  /**
   * Handle transform changes (during drag)
   */
  private onChange = (): void => {
    if (
      !this.engine.interactionManager.isDraggingGizmo ||
      !this.transformControl?.object
    ) {
      return;
    }

    const obj = this.transformControl.object;
    if (
      obj.userData.isItem &&
      (obj.userData.type === "floor" || obj.userData.type === "fence")
    ) {
      this.engine.toolsManager.syncMarkersWithObject(obj);
    }
  };

  /**
   * Handle object transform complete
   */
  private onObjectChange = (): void => {
    const obj = this.transformControl?.object;
    if (
      obj &&
      obj.userData.isItem &&
      !this.engine.interactionManager.isDraggingGizmo
    ) {
      this.engine.objectManager.adjustObjectToGround(obj);
    }
  };

  /**
   * Sync object transform to store
   */
  private syncTransformToStore(obj: THREE.Object3D): void {
    const scene = useSceneStore.getState();
    if (obj.userData.isItem) {
      scene.updateItemTransform(
        obj.userData.uuid,
        [obj.position.x, obj.position.y, obj.position.z],
        [obj.rotation.x, obj.rotation.y, obj.rotation.z],
        [obj.scale.x, obj.scale.y, obj.scale.z]
      );
    }
  }

  /**
   * Update camera reference
   */
  public updateCamera(camera: THREE.Camera): void {
    if (this.transformControl) {
      this.transformControl.camera = camera;
    }
  }

  /**
   * Set gizmo mode
   */
  public setMode(mode: "translate" | "rotate" | "scale"): void {
    if (this.transformControl) {
      this.transformControl.setMode(mode);
    }
  }
}