import * as THREE from "three";

import type { A42Engine } from "@/editor/engine/A42Engine";
import { useEditorStore } from "@/editor/stores/editor/useEditorStore";

// Import modular controllers
import { AnimationController } from "@/editor/engine/interaction/AnimationController";
import { RaycastHandler } from "@/editor/engine/interaction/RaycastHandler";
import { SelectionController } from "@/editor/engine/interaction/SelectionController";
import { ModeHandlers } from "@/editor/engine/interaction/ModeHandlers";
import { TransformController } from "@/editor/engine/interaction/TransformController";

/**
 * Manages user interactions with the 3D scene
 * Handles object selection, transform controls, and raycasting
 * REFACTORED: Now delegates to specialized controllers
 */
export class InteractionManager {
  private engine: A42Engine;

  // Modular controllers (private)
  private animationController: AnimationController;
  private raycastHandler: RaycastHandler;
  private selectionController: SelectionController;
  private modeHandlers: ModeHandlers;
  private transformController: TransformController;

  // Public properties (maintain API compatibility)
  public get transformControl() {
    return this.transformController.transformControl;
  }

  public interactionPlane: THREE.Mesh;
  public isDraggingGizmo: boolean = false;

  constructor(engine: A42Engine) {
    this.engine = engine;

    // Create invisible plane for interactions
    this.interactionPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(5000, 5000),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    this.interactionPlane.rotation.x = -Math.PI / 2;
    this.interactionPlane.userData.isInteractionPlane = true;
    this.engine.scene.add(this.interactionPlane);

    // Initialize controllers
    this.animationController = new AnimationController(engine);
    this.raycastHandler = new RaycastHandler(engine);
    this.selectionController = new SelectionController(engine);
    this.modeHandlers = new ModeHandlers(
      engine,
      this.raycastHandler,
      this.selectionController
    );
    this.transformController = new TransformController(
      engine,
      this.animationController
    );

    // Initialize transform controls
    this.transformController.initialize();
  }

  /**
   * Updates the camera reference for transform controls
   */
  public updateCamera(camera: THREE.Camera): void {
    this.transformController.updateCamera(camera);
  }

  /**
   * Selects an item by its UUID
   */
  public selectItemByUUID(uuid: string | null): void {
    this.selectionController.selectItemByUUID(uuid);
  }

  /**
   * Main pointer down handler
   */
  public onPointerDown = (event: MouseEvent): void => {
    this.handleMouseDown(event);
  };

  /**
   * Handles mouse down events for different interaction modes
   */
  private handleMouseDown(event: MouseEvent): void {
    if (this.transformControl && this.isDraggingGizmo) return;

    // Calculate normalized device coordinates and setup raycaster
    this.raycastHandler.calculatePointer(event);

    const editor = useEditorStore.getState();
    const mode = editor.mode;

    // Delegate to appropriate mode handler
    switch (mode) {
      case "drawing_floor":
        this.modeHandlers.handleDrawingFloor(event);
        break;

      case "drawing_fence":
        this.modeHandlers.handleDrawingFence(event);
        break;

      case "measuring":
        this.modeHandlers.handleMeasuring();
        break;

      case "placing_item":
        this.modeHandlers.handlePlacingItem(event);
        break;

      case "idle":
      case "editing":
        this.modeHandlers.handleEditing(event);
        break;
    }
  }

  /**
   * Selects or deselects an object
   */
  public selectObject(object: THREE.Object3D | null): void {
    this.selectionController.selectObject(object);
  }

  /**
   * Sets the transform gizmo mode
   */
  public setGizmoMode(mode: "translate" | "rotate" | "scale"): void {
    this.transformController.setMode(mode);
  }
}