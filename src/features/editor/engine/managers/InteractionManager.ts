// --- START OF FILE src/features/editor/engine/managers/InteractionManager.ts ---
import * as THREE from "three";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";

import type { A42Engine } from "../A42Engine";

import { useEditorStore } from "@/stores/editor/useEditorStore";
import { useSceneStore } from "@/stores/scene/useSceneStore"; // 🔥 NUEVO
import { useSelectionStore } from "@/stores/selection/useSelectionStore";
import { useCatalogStore } from "@/stores/catalog/useCatalogStore";

export class InteractionManager {
  private engine: A42Engine;
  public transformControl: TransformControls | null = null;

  private raycaster: THREE.Raycaster;
  private pointer: THREE.Vector2;
  public interactionPlane: THREE.Mesh;

  public isDraggingGizmo = false;
  private dragStartPosition = new THREE.Vector3();

  constructor(engine: A42Engine) {
    this.engine = engine;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    this.interactionPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(5000, 5000),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    this.interactionPlane.rotation.x = -Math.PI / 2;
    this.interactionPlane.userData.isInteractionPlane = true;
    this.engine.scene.add(this.interactionPlane);

    this.initTransformControls();
  }

  private initTransformControls() {
    try {
      this.transformControl = new TransformControls(
        this.engine.activeCamera as THREE.Camera,
        this.engine.renderer.domElement
      );

      this.transformControl.rotationSnap = Math.PI / 12;
      this.engine.scene.add(this.transformControl);

      this.transformControl.addEventListener("dragging-changed", (event: any) => {
        const scene = useSceneStore.getState(); // 🔥 Usamos SceneStore para datos

        this.isDraggingGizmo = event.value;
        this.engine.sceneManager.controls.enabled = !event.value;

        const obj = this.transformControl?.object;
        if (!obj) return;

        if (event.value) {
          this.dragStartPosition.copy(obj.position);
          scene.saveSnapshot(); // 🔥 Snapshot en SceneStore
        } else {
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
      });

      this.transformControl.addEventListener("change", () => {
        if (this.isDraggingGizmo && this.transformControl?.object) {
           const obj = this.transformControl.object;
           if (obj.userData.isItem && (obj.userData.type === 'floor' || obj.userData.type === 'fence')) {
             this.engine.toolsManager.syncMarkersWithObject(obj);
           }
        }
      });

      this.transformControl.addEventListener("objectChange", () => {
        const obj = this.transformControl?.object;
        if (obj && obj.userData.isItem && !this.isDraggingGizmo) {
          this.engine.objectManager.adjustObjectToGround(obj);
        }
      });

      this.transformControl.detach();
      this.transformControl.visible = false;
    } catch (e) {
      console.error("ERROR: TransformControls", e);
      this.transformControl = null;
    }
  }

  private animateRevert(obj: THREE.Object3D, targetPos: THREE.Vector3) {
    const startPos = obj.position.clone();
    let t = 0;
    const animate = () => {
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

  public updateCamera(camera: THREE.Camera) {
    if (this.transformControl) {
      this.transformControl.camera = camera;
    }
  }

  public selectItemByUUID(uuid: string | null) {
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

  public onPointerDown = (event: MouseEvent) => {
    this.handleMouseDown(event);
  };

  private handleMouseDown(event: MouseEvent) {
    if (this.transformControl && this.isDraggingGizmo) return;

    const rect = this.engine.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.engine.activeCamera);

    const editor = useEditorStore.getState(); // UI State
    const catalog = useCatalogStore.getState();
    const selectionStore = useSelectionStore.getState();

    const mode = editor.mode;

    if (mode === "drawing_floor") {
      const hit = this.raycaster.intersectObject(this.interactionPlane);
      if (hit.length > 0) {
        if (event.button === 0) this.engine.toolsManager.addDraftPoint(hit[0].point);
        else if (event.button === 2) this.engine.toolsManager.createSolidFloor();
      }
      return;
    }

    if (mode === "drawing_fence") {
      const hit = this.raycaster.intersectObject(this.interactionPlane);
      if (hit.length > 0) {
        if (event.button === 0) this.engine.toolsManager.addFenceDraftPoint(hit[0].point);
        else if (event.button === 2) this.engine.toolsManager.createSolidFence();
      }
      return;
    }

    if (mode === "measuring") {
      const hit = this.raycaster.intersectObject(this.interactionPlane);
      if (hit.length > 0) this.engine.toolsManager.handleMeasurementClick(hit[0].point);
      return;
    }

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

    if (mode === "idle" || mode === "editing") {
      if (event.button !== 0) return;

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

      const interactables = this.engine.scene.children.filter(
        (obj) => obj.userData?.isItem && obj !== this.transformControl
      );
      const intersects = this.raycaster.intersectObjects(interactables, true);
      if (intersects.length > 0) {
        let target: THREE.Object3D | null = intersects[0].object;
        while (target && !target.userData?.isItem && target.parent && target.parent !== this.engine.scene) {
          target = target.parent;
        }
        if (target && target.userData?.isItem) {
          this.selectObject(target);
        }
      } else {
        if (this.transformControl?.object && !this.engine.toolsManager.floorEditMarkers.includes(this.transformControl.object as THREE.Mesh)) {
          this.selectObject(null);
        }
      }
    }
  }

  private attachGizmo(object: THREE.Object3D) {
    if (!this.transformControl) return;
    this.transformControl.attach(object);
    this.transformControl.visible = true;
    
    // 🔥 BUSCAMOS EN SCENE STORE
    const item = useSceneStore.getState().items.find(
      (i) => i.uuid === object.userData.uuid
    );

    if (item && (item.type === "floor" || item.type === "fence")) {
      this.engine.toolsManager.showFloorEditMarkers(object.userData.uuid, item.points);
    } else {
      this.engine.toolsManager.clearFloorEditMarkers();
    }
  }

  public selectObject(object: THREE.Object3D | null) {
    const selection = useSelectionStore.getState();
    const editor = useEditorStore.getState();

    if (!this.transformControl) return;

    if (!object) {
      this.transformControl.detach();
      this.transformControl.visible = false;
      this.engine.sceneManager.controls.enabled = true;
      this.engine.toolsManager.clearFloorEditMarkers();
      
      selection.selectItem(null);
      editor.setMode("idle");
      return;
    }

    selection.selectItem(object.userData.uuid);
    editor.setMode("editing");
    this.attachGizmo(object);
  }

  private syncTransformToStore(obj: THREE.Object3D) {
    const scene = useSceneStore.getState(); // 🔥 SceneStore para updates
    if (obj.userData.isItem) {
      scene.updateItemTransform(
        obj.userData.uuid,
        [obj.position.x, obj.position.y, obj.position.z],
        [obj.rotation.x, obj.rotation.y, obj.rotation.z],
        [obj.scale.x, obj.scale.y, obj.scale.z]
      );
    }
  }

  public setGizmoMode(mode: "translate" | "rotate" | "scale") {
    if (this.transformControl) this.transformControl.setMode(mode);
  }
}
// --- END OF FILE ---