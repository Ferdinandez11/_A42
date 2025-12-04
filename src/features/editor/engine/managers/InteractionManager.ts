// --- START OF FILE src/features/editor/engine/managers/InteractionManager.ts ---
import * as THREE from "three";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";

import type { A42Engine } from "../A42Engine";

import { useEditorStore } from "@/stores/editor/useEditorStore";
import { useSelectionStore } from "@/stores/selection/useSelectionStore";
import { useCatalogStore } from "@/stores/catalog/useCatalogStore";

export class InteractionManager {
  public transformControl: TransformControls | null = null;

  private engine: A42Engine;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();

  private interactionPlane: THREE.Mesh;

  public isDraggingGizmo = false;
  private dragStart = new THREE.Vector3();

  constructor(engine: A42Engine) {
    this.engine = engine;

    // Raycaster: ver TODO excepto gizmo
    this.raycaster.layers.enable(0);
    this.raycaster.layers.disable(1);

    // Plano invisible (no depende de capas ya)
    this.interactionPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(5000, 5000),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    this.interactionPlane.rotation.x = -Math.PI / 2;
    this.engine.scene.add(this.interactionPlane);

    this.initTransformControls();
  }

  // ---------------------------------------------------------
  // INIT TRANSFORM CONTROLS
  // ---------------------------------------------------------
  private initTransformControls() {
    try {
      this.transformControl = new TransformControls(
        this.engine.activeCamera,
        this.engine.renderer.domElement
      );

      this.transformControl.rotationSnap = Math.PI / 12;

      // Gizmo en capa 1
      this.transformControl.traverse((obj) => obj.layers.set(1));

      this.engine.scene.add(this.transformControl);

      // Evento arrastrando
      this.transformControl.addEventListener("dragging-changed", (ev: any) => {
        const editor = useEditorStore.getState();
        const obj = this.transformControl!.object;

        this.isDraggingGizmo = ev.value;
        this.engine.sceneManager.controls.enabled = !ev.value;

        if (!obj) return;

        if (ev.value) {
          this.dragStart.copy(obj.position);
          editor.saveSnapshot();
        } else {
          // Suelto
          if (this.engine.isObjectColliding(obj)) {
            this.revertMove(obj, this.dragStart);
          } else {
            if (obj.userData.isItem) {
              this.engine.objectManager.adjustObjectToGround(obj);
              this.syncTransform(obj);
            } else if (obj.userData.isFloorMarker) {
              this.engine.toolsManager.updateFloorFromMarkers(obj);
            }
          }
        }
      });

      this.transformControl.addEventListener("objectChange", () => {
        const obj = this.transformControl?.object;
        if (obj && obj.userData.isItem) {
          if (!this.isDraggingGizmo) {
            this.engine.objectManager.adjustObjectToGround(obj);
          }
        }
      });

      this.transformControl.visible = false;
      this.transformControl.detach();
    } catch (e) {
      console.error("TransformControls failed:", e);
      this.transformControl = null;
    }
  }

  private revertMove(obj: THREE.Object3D, target: THREE.Vector3) {
    const start = obj.position.clone();
    let t = 0;

    const anim = () => {
      t += 0.1;
      if (t >= 1) {
        obj.position.copy(target);
        return;
      }
      obj.position.lerpVectors(start, target, t);
      requestAnimationFrame(anim);
    };
    anim();
  }

  public updateCamera(cam: THREE.Camera) {
    if (this.transformControl) {
      this.transformControl.camera = cam;
    }
  }

  // ---------------------------------------------------------
  // MAIN CLICK HANDLER
  // ---------------------------------------------------------
  public onMouseDown = (event: MouseEvent) => {
    if (this.isDraggingGizmo) return;

    const rect = this.engine.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const editor = useEditorStore.getState();
    const catalog = useCatalogStore.getState();
    const selection = useSelectionStore.getState();

    const mode = editor.mode;

    // Prepara raycaster
    this.raycaster.setFromCamera(this.pointer, this.engine.activeCamera);

    // -----------------------------------------------------
    // DIBUJAR SUELO
    // -----------------------------------------------------
    if (mode === "drawing_floor") {
      const hit = this.raycaster.intersectObject(this.interactionPlane);
      if (hit.length) {
        if (event.button === 0) {
          this.engine.toolsManager.addDraftPoint(hit[0].point);
        } else if (event.button === 2) {
          this.engine.toolsManager.createSolidFloor();
        }
      }
      return;
    }

    // -----------------------------------------------------
    // DIBUJAR VALLA
    // -----------------------------------------------------
    if (mode === "drawing_fence") {
      const hit = this.raycaster.intersectObject(this.interactionPlane);
      if (hit.length) {
        if (event.button === 0) {
          this.engine.toolsManager.addFenceDraftPoint(hit[0].point);
        } else if (event.button === 2) {
          this.engine.toolsManager.createSolidFence();
        }
      }
      return;
    }

    // -----------------------------------------------------
    // MEDICIÓN
    // -----------------------------------------------------
    if (mode === "measuring") {
      const allHits = this.raycaster.intersectObject(this.interactionPlane);
      if (allHits.length) {
        this.engine.toolsManager.handleMeasurementClick(allHits[0].point);
      }
      return;
    }

    // -----------------------------------------------------
    // COLOCAR ITEM DESDE CATÁLOGO
    // -----------------------------------------------------
    if (mode === "placing_item" && catalog.selectedProduct) {
      const hit = this.raycaster.intersectObject(this.interactionPlane);
      if (hit.length && event.button === 0) {
        this.engine.objectManager.placeObject(
          hit[0].point.x,
          hit[0].point.z,
          catalog.selectedProduct,
          (uuid) => {
            selection.selectItem(uuid);
            editor.setMode("editing");
          }
        );
      }
      return;
    }

    // -----------------------------------------------------
    // SELECCIÓN / EDICIÓN
    // -----------------------------------------------------
    if (mode === "idle" || mode === "editing") {
      if (event.button !== 0) return;

      // Primero intentamos seleccionar markers de suelo
      if (this.engine.toolsManager.floorEditMarkers.length > 0) {
        const hits = this.raycaster.intersectObjects(
          this.engine.toolsManager.floorEditMarkers
        );

        if (hits.length) {
          const hit = hits[0].object;
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
      }

      // Selección de objetos
      const selectable = this.engine.scene.children.filter(
        (o) => o.userData?.isItem
      );
      const hits = this.raycaster.intersectObjects(selectable, true);

      if (hits.length) {
        let target: THREE.Object3D | null = hits[0].object;

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
          if (item?.type === "floor" && item.points) {
            this.engine.toolsManager.showFloorEditMarkers(
              target.uuid,
              item.points
            );
          } else {
            this.engine.toolsManager.clearFloorEditMarkers();
          }
          return;
        }
      }

      // Click vacío → limpiar selección
      this.selectObject(null);
      this.engine.toolsManager.clearFloorEditMarkers();
    }
  };

  // ---------------------------------------------------------
  // SELECCIÓN + GIZMO
  // ---------------------------------------------------------
  public selectObject(obj: THREE.Object3D | null) {
    const selection = useSelectionStore.getState();
    const editor = useEditorStore.getState();

    if (!this.transformControl) return;

    if (!obj) {
      selection.selectItem(null);
      this.transformControl.detach();
      this.transformControl.visible = false;
      editor.setMode("idle");
      return;
    }

    selection.selectItem(obj.uuid);
    editor.setMode("editing");

    this.transformControl.attach(obj);
    this.transformControl.visible = true;
  }

  private syncTransform(obj: THREE.Object3D) {
    const editor = useEditorStore.getState();

    if (!obj.userData.isItem) return;

    editor.updateItemTransform(
      obj.uuid,
      [obj.position.x, obj.position.y, obj.position.z],
      [obj.rotation.x, obj.rotation.y, obj.rotation.z],
      [obj.scale.x, obj.scale.y, obj.scale.z]
    );
  }

  public setGizmoMode(mode: "translate" | "rotate" | "scale") {
    this.transformControl?.setMode(mode);
  }
}
// --- END OF FILE ---
