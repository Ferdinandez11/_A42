import * as THREE from "three";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";

import type { A42Engine } from "@/editor/engine/A42Engine";

import { useEditorStore } from "@/editor/stores/editor/useEditorStore";
import { useSceneStore } from "@/editor/stores/scene/useSceneStore";
import { useSelectionStore } from "@/editor/stores/selection/useSelectionStore";
import { useCatalogStore } from "@/editor/stores/catalog/useCatalogStore";

/**
 * Manages user interactions with the 3D scene
 * Handles object selection, transform controls, and raycasting
 */
export class InteractionManager {
  private engine: A42Engine;
  public transformControl: TransformControls | null = null;

  private raycaster: THREE.Raycaster;
  private pointer: THREE.Vector2;
  public interactionPlane: THREE.Mesh;

  public isDraggingGizmo: boolean = false;
  private dragStartPosition: THREE.Vector3 = new THREE.Vector3();

  constructor(engine: A42Engine) {
    this.engine = engine;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    // Create invisible plane for interactions
    this.interactionPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(5000, 5000),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    this.interactionPlane.rotation.x = -Math.PI / 2;
    this.interactionPlane.userData.isInteractionPlane = true;
    this.engine.scene.add(this.interactionPlane);

    this.initTransformControls();
  }

  /**
   * Initializes transform controls (gizmo) for object manipulation
   */
  private initTransformControls(): void {
    try {
      this.transformControl = new TransformControls(
        this.engine.activeCamera as THREE.Camera,
        this.engine.renderer.domElement
      );

      this.transformControl.rotationSnap = Math.PI / 12;
      this.engine.scene.add(this.transformControl);

      // Handle dragging start/end
      this.transformControl.addEventListener(
        "dragging-changed",
        (event: any) => {
          const scene = useSceneStore.getState();

          this.isDraggingGizmo = event.value;
          this.engine.sceneManager.controls.enabled = !event.value;

          const obj = this.transformControl?.object;
          if (!obj) return;

          if (event.value) {
            // Drag started - save position and create snapshot
            this.dragStartPosition.copy(obj.position);
            scene.saveSnapshot();
          } else {
            // Drag ended - check collisions and update
            if (this.engine.isObjectColliding(obj)) {
              this.animateRevert(obj, this.dragStartPosition);
            } else {
              if (obj.userData.isFloorMarker) {
                this.engine.toolsManager.updateFloorFromMarkers(obj);
              } else if (obj.userData.isItem) {
                this.engine.objectManager.adjustObjectToGround(obj);
                this.syncTransformToStore(obj);
              }
            }
          }
        }
      );

      // Update markers during drag for floors/fences
      this.transformControl.addEventListener("change", () => {
        if (this.isDraggingGizmo && this.transformControl?.object) {
          const obj = this.transformControl.object;
          if (
            obj.userData.isItem &&
            (obj.userData.type === "floor" || obj.userData.type === "fence")
          ) {
            this.engine.toolsManager.syncMarkersWithObject(obj);
          }
        }
      });

      // Adjust to ground after transform
      this.transformControl.addEventListener("objectChange", () => {
        const obj = this.transformControl?.object;
        if (obj && obj.userData.isItem && !this.isDraggingGizmo) {
          this.engine.objectManager.adjustObjectToGround(obj);
        }
      });

      this.transformControl.detach();
      this.transformControl.visible = false;
    } catch (error) {
      console.error("ERROR: TransformControls", error);
      this.transformControl = null;
    }
  }

  /**
   * Animates object reverting to original position (collision detected)
   */
  private animateRevert(
    obj: THREE.Object3D,
    targetPos: THREE.Vector3
  ): void {
    const startPos = obj.position.clone();
    let t = 0;

    const animate = (): void => {
      t += 0.1;
      if (t >= 1) {
        obj.position.copy(targetPos);
        this.engine.checkSafetyCollisions();
        return;
      }
      obj.position.lerpVectors(startPos, targetPos, t);
      this.engine.checkSafetyCollisions();
      requestAnimationFrame(animate);
    };

    animate();
  }

  /**
   * Updates the camera reference for transform controls
   */
  public updateCamera(camera: THREE.Camera): void {
    if (this.transformControl) {
      this.transformControl.camera = camera;
    }
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
      if (this.transformControl?.object === foundObject) return;
      this.attachGizmo(foundObject);
    } else {
      this.selectObject(null);
    }
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

    // Calculate normalized device coordinates
    const rect = this.engine.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.engine.activeCamera);

    const editor = useEditorStore.getState();
    const catalog = useCatalogStore.getState();
    const selectionStore = useSelectionStore.getState();

    const mode = editor.mode;

    // Drawing floor mode
    if (mode === "drawing_floor") {
      const hit = this.raycaster.intersectObject(this.interactionPlane);
      if (hit.length > 0) {
        if (event.button === 0) {
          this.engine.toolsManager.addDraftPoint(hit[0].point);
        } else if (event.button === 2) {
          this.engine.toolsManager.createSolidFloor();
        }
      }
      return;
    }

    // Drawing fence mode
    if (mode === "drawing_fence") {
      const hit = this.raycaster.intersectObject(this.interactionPlane);
      if (hit.length > 0) {
        if (event.button === 0) {
          this.engine.toolsManager.addFenceDraftPoint(hit[0].point);
        } else if (event.button === 2) {
          this.engine.toolsManager.createSolidFence();
        }
      }
      return;
    }

    // Measuring mode
    if (mode === "measuring") {
      const hit = this.raycaster.intersectObject(this.interactionPlane);
      if (hit.length > 0) {
        this.engine.toolsManager.handleMeasurementClick(hit[0].point);
      }
      return;
    }

    // Placing item mode
    if (mode === "placing_item" && catalog.selectedProduct) {
      if (event.button !== 0) return;
      const hit = this.raycaster.intersectObject(this.interactionPlane);
      if (hit.length > 0) {
        this.engine.objectManager.placeObject(
          hit[0].point.x,
          hit[0].point.z,
          catalog.selectedProduct,
          (uuid) => {
            selectionStore.selectItem(uuid);
            editor.setMode("editing");
          }
        );
      }
      return;
    }

    // Idle or editing mode - object selection
    if (mode === "idle" || mode === "editing") {
      if (event.button !== 0) return;

      // Check for floor marker clicks
      const markerHit = this.raycaster.intersectObjects(
        this.engine.toolsManager.floorEditMarkers
      );
      if (markerHit.length > 0) {
        const hit = markerHit[0].object;
        const idx = hit.userData.pointIndex;

        if (event.shiftKey || event.ctrlKey) {
          this.engine.toolsManager.selectVertex(idx, true);
          this.transformControl?.detach();
          return;
        }

        this.engine.toolsManager.selectVertex(idx, false);
        if (this.transformControl) {
          this.transformControl.attach(hit);
          this.transformControl.setMode("translate");
          this.transformControl.visible = true;
        }
        return;
      }

      // Check for object clicks
      const interactables = this.engine.scene.children.filter(
        (obj) => obj.userData?.isItem && obj !== this.transformControl
      );
      const intersects = this.raycaster.intersectObjects(interactables, true);

      if (intersects.length > 0) {
        let target: THREE.Object3D | null = intersects[0].object;

        // Traverse up to find the item root
        while (
          target &&
          !target.userData?.isItem &&
          target.parent &&
          target.parent !== this.engine.scene
        ) {
          target = target.parent;
        }

        if (target && target.userData?.isItem) {
          this.selectObject(target);
        }
      } else {
        // Clicked empty space - deselect if not editing floor markers
        if (
          this.transformControl?.object &&
          !this.engine.toolsManager.floorEditMarkers.includes(
            this.transformControl.object as THREE.Mesh
          )
        ) {
          this.selectObject(null);
        }
      }
    }
  }

  /**
   * Attaches the transform gizmo to an object
   */
  private attachGizmo(object: THREE.Object3D): void {
    if (!this.transformControl) return;

    this.transformControl.attach(object);
    this.transformControl.visible = true;

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

  /**
   * Selects or deselects an object
   */
  public selectObject(object: THREE.Object3D | null): void {
    const selection = useSelectionStore.getState();
    const editor = useEditorStore.getState();

    if (!this.transformControl) return;

    if (!object) {
      // Deselect
      this.transformControl.detach();
      this.transformControl.visible = false;
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
   * Syncs object transform to the store
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
   * Sets the transform gizmo mode
   */
  public setGizmoMode(mode: "translate" | "rotate" | "scale"): void {
    if (this.transformControl) {
      this.transformControl.setMode(mode);
    }
  }
}