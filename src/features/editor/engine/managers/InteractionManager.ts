// --- START OF FILE src/features/editor/engine/managers/InteractionManager.ts ---
import * as THREE from "three";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";

import type { A42Engine } from "../A42Engine";

import { useEditorStore } from "@/stores/editor/useEditorStore";
import { useSelectionStore } from "@/stores/selection/useSelectionStore";
import { useCatalogStore } from "@/stores/catalog/useCatalogStore";

export class InteractionManager {
  private engine: A42Engine;
  public transformControl: TransformControls | null = null;
  private raycaster: THREE.Raycaster;
  private pointer: THREE.Vector2;
  private interactionPlane: THREE.Mesh;
  public isDraggingGizmo = false;

  private dragStartPosition = new THREE.Vector3();

  constructor(engine: A42Engine) {
    this.engine = engine;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    this.interactionPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(1000, 1000),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    this.interactionPlane.rotation.x = -Math.PI / 2;
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

      // --- DRAG EVENTS ---
      this.transformControl.addEventListener(
        "dragging-changed",
        (event: any) => {
          this.isDraggingGizmo = event.value;
          this.engine.sceneManager.controls.enabled = !event.value;

          const obj = this.transformControl?.object;
          if (!obj) return;

          const editor = useEditorStore.getState();

          if (event.value) {
            // empezar drag -> guardamos snapshot para UNDO
            this.dragStartPosition.copy(obj.position);
            editor.saveSnapshot();
          } else {
            // terminar drag
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

  // --- ANIMACIÓN DE REBOTE ---
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
    if (this.transformControl) this.transformControl.camera = camera;
  }

  public onMouseDown = (event: MouseEvent) => {
    if (this.transformControl && this.isDraggingGizmo) return;

    const rect = this.engine.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.engine.activeCamera);

    const editor = useEditorStore.getState();
    const catalog = useCatalogStore.getState();
    const selection = useSelectionStore.getState();

    const mode = editor.mode;

    // --- DRAW FLOOR ---
    if (mode === "drawing_floor") {
      const intersects = this.raycaster.intersectObject(this.interactionPlane);
      if (intersects.length > 0) {
        if (event.button === 0) {
          this.engine.toolsManager.addDraftPoint(intersects[0].point);
        } else if (event.button === 2) {
          if (this.engine.toolsManager.floorPoints.length >= 3) {
            this.engine.toolsManager.createSolidFloor();
          }
        }
      }
      return;
    }

    // --- DRAW FENCE ---
    if (mode === "drawing_fence") {
      const intersects = this.raycaster.intersectObject(this.interactionPlane);
      if (intersects.length > 0) {
        if (event.button === 0) {
          this.engine.toolsManager.addFenceDraftPoint(intersects[0].point);
        } else if (event.button === 2) {
          this.engine.toolsManager.createSolidFence();
        }
      }
      return;
    }

    // --- MEASURING ---
    if (mode === "measuring") {
      const intersects = this.raycaster.intersectObjects(
        this.engine.scene.children,
        true
      );
      const hit = intersects.find(
        (i) =>
          i.object.visible &&
          (i.object.userData.isItem || i.object === this.interactionPlane)
      );
      if (hit) {
        this.engine.toolsManager.handleMeasurementClick(hit.point);
      } else {
        const planeHit = this.raycaster.intersectObject(this.interactionPlane);
        if (planeHit.length > 0) {
          this.engine.toolsManager.handleMeasurementClick(planeHit[0].point);
        }
      }
      return;
    }

    // --- PLACE ITEM ---
    if (mode === "placing_item" && catalog.selectedProduct) {
      if (event.button !== 0) return;

      const intersects = this.raycaster.intersectObject(this.interactionPlane);
      if (intersects.length > 0) {
        this.engine.objectManager.placeObject(
          intersects[0].point.x,
          intersects[0].point.z,
          catalog.selectedProduct,
          (uuid) => {
            // Seleccionamos el nuevo objeto y pasamos a modo edición
            selection.selectItem(uuid);
            editor.setMode("editing");
          }
        );
        editor.setMode("idle");
      }
      return;
    }

    // --- IDLE / EDITING ---
    if (mode === "idle" || mode === "editing") {
      if (event.button !== 0) return;

      // --- Edición de vértices ---
      if (this.engine.toolsManager.floorEditMarkers.length > 0) {
        const markerIntersects = this.raycaster.intersectObjects(
          this.engine.toolsManager.floorEditMarkers
        );

        if (markerIntersects.length > 0) {
          const hit = markerIntersects[0].object;
          const index = hit.userData.pointIndex;

          if (event.shiftKey || event.ctrlKey) {
            this.engine.toolsManager.selectVertex(index, true);
            if (this.transformControl) this.transformControl.detach();
            return;
          }

          this.engine.toolsManager.selectVertex(index, false);
          if (this.transformControl) {
            this.transformControl.attach(hit);
            this.transformControl.setMode("translate");
            this.transformControl.visible = true;
          }
          return;
        }
      }

      // --- Selección de objetos ---
      const interactables = this.engine.scene.children.filter(
        (obj) => obj.userData?.isItem && obj !== this.transformControl
      );

      const intersects = this.raycaster.intersectObjects(interactables, true);

      if (intersects.length > 0) {
        let target: THREE.Object3D | null = intersects[0].object;

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

          const item = editor.items.find((i) => i.uuid === target!.uuid);

          if (target.userData.type === "floor" && item && item.points) {
            this.engine.toolsManager.showFloorEditMarkers(
              target.uuid,
              item.points
            );
          } else {
            this.engine.toolsManager.clearFloorEditMarkers();
          }
        }
      } else {
        // Click en vacío -> deseleccionar
        if (
          this.transformControl?.object &&
          !this.engine.toolsManager.floorEditMarkers.includes(
            this.transformControl.object as THREE.Mesh
          )
        ) {
          this.selectObject(null);
          this.engine.toolsManager.clearFloorEditMarkers();
        }
      }
    }
  };

public selectObject(object: THREE.Object3D | null) {
  const selection = useSelectionStore.getState();
  const editor = useEditorStore.getState(); // <-- NECESARIO

  // Si no hay transformControl, limpiar selección y modo
  if (!this.transformControl) {
    selection.selectItem(null);
    editor.setMode("idle");
    return;
  }

  // 🔄 Si hacemos clic en el mismo objeto ya seleccionado → solo actualizamos selección
  if (
    object &&
    this.transformControl.object?.uuid === object.uuid &&
    selection.selectedItemId !== object.uuid
  ) {
    selection.selectItem(object.uuid);
    editor.setMode("editing");
    return;
  }

  // 🧹 Si había algo seleccionado antes, lo quitamos
  if (this.transformControl.object) {
    this.transformControl.detach();
    this.transformControl.visible = false;
    this.engine.sceneManager.controls.enabled = true;
  }

  // ❌ SI NO HAY OBJETO → deseleccionar todo
  if (!object) {
    selection.selectItem(null);
    editor.setMode("idle");
    return;
  }

  // ✔ SELECCIÓN NUEVA
  this.transformControl.attach(object);
  selection.selectItem(object.uuid);
  editor.setMode("editing");

  this.transformControl.visible = true;
}

  private syncTransformToStore(obj: THREE.Object3D) {
    const editor = useEditorStore.getState();
    if (obj.userData.isItem) {
      editor.updateItemTransform(
        obj.uuid,
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
