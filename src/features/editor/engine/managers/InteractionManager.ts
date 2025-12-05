// --- FILE: src/features/editor/engine/managers/InteractionManager.ts ---
import * as THREE from "three";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";

import type { A42Engine } from "../A42Engine";
import { useSceneStore } from "@/stores/scene/useSceneStore";
import { useSelectionStore } from "@/stores/selection/useSelectionStore";
import { useEditorStore } from "@/stores/editor/useEditorStore";

export class InteractionManager {
  private engine: A42Engine;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();

  public transformControl: TransformControls;
  private isDragging = false;
  private dragStart = new THREE.Vector3();

  constructor(engine: A42Engine) {
    this.engine = engine;

    // TransformControls
    this.transformControl = new TransformControls(
      this.engine.activeCamera,
      this.engine.renderer.domElement
    );
    this.transformControl.visible = false;
    this.engine.scene.add(this.transformControl);

    this.attachTransformControlListeners();
  }

  // ======================================================
  // TRANSFORM CONTROLS LISTENERS
  // ======================================================
  private attachTransformControlListeners() {
    this.transformControl.addEventListener("dragging-changed", (e: any) => {
      this.isDragging = e.value;
      this.engine.sceneManager.controls.enabled = !e.value;

      const obj = this.transformControl.object;
      if (!obj) return;

      if (e.value) {
        this.dragStart.copy(obj.position);
      } else {
        if (obj.userData?.uuid) {
          this.syncTransformToStore(obj);
        }
      }
    });

    this.transformControl.addEventListener("objectChange", () => {
      const obj = this.transformControl.object;
      if (!obj || !this.isDragging) return;
      this.syncTransformToStore(obj);
    });
  }

  // ======================================================
  // POINTER EVENTS
  // ======================================================
  public onPointerDown = (evt: MouseEvent) => {
    if (this.isDragging) return;

    const rect = this.engine.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((evt.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((evt.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.engine.activeCamera);

    this.handleSceneClick();
  };

  private handleSceneClick() {
    const clickMode = useEditorStore.getState().mode;

    // -------------------------------------------------
    // 1) Check if hit object (SELECTION)
    // -------------------------------------------------
    const items: THREE.Object3D[] = [];
    this.engine.scene.traverse((obj) => {
      if (obj.userData?.isItem) items.push(obj);
    });

    const hits = this.raycaster.intersectObjects(items, true);

    if (hits.length > 0) {
      let target: THREE.Object3D | null = hits[0].object;
      while (target && !target.userData?.isItem && target.parent) {
        target = target.parent;
      }

      if (target?.userData?.uuid) {
        this.selectObject(target);
        return;
      }
    }

    // -------------------------------------------------
    // 2) If not clicked object → try FLOOR POINT
    // -------------------------------------------------
    const world = this.engine.sceneManager.raycastWorldPoint(this.raycaster);

    if (world) {
      if (clickMode === "placing_item") {
        this.engine.objectManager.placePreviewAt(world);
        return;
      }

      if (clickMode === "drawing_floor") {
        this.engine.toolsManager.floorTool.onClick(world);
        return;
      }

      if (clickMode === "drawing_fence") {
        this.engine.toolsManager.fenceTool.onClick(world);
        return;
      }
    }

    // -------------------------------------------------
    // 3) Clear selection
    // -------------------------------------------------
    this.clearSelection();
  }

  // ======================================================
  // CAMERA & GIZMO
  // ======================================================
  public updateCamera(camera: THREE.Camera) {
    this.transformControl.camera = camera;
  }

  public setGizmoMode(mode: "translate" | "rotate" | "scale") {
    this.transformControl.setMode(mode);
  }

  // ======================================================
  // SELECTION
  // ======================================================
  public selectObject(object: THREE.Object3D | null) {
    const selectionStore = useSelectionStore.getState();

    if (!object) {
      selectionStore.select(null);
      this.transformControl.detach();
      this.transformControl.visible = false;
      this.engine.sceneManager.controls.enabled = true;
      return;
    }

    const uuid = object.userData?.uuid;
    if (!uuid) {
      this.clearSelection();
      return;
    }

    selectionStore.select(uuid);
    this.transformControl.attach(object);
    this.transformControl.visible = true;
    this.engine.sceneManager.controls.enabled = false;
  }

  private clearSelection() {
    const selectionStore = useSelectionStore.getState();
    selectionStore.select(null);

    this.transformControl.detach();
    this.transformControl.visible = false;
    this.engine.sceneManager.controls.enabled = true;
  }

  // ======================================================
  // SYNC TO STORE
  // ======================================================
  private syncTransformToStore(obj: THREE.Object3D) {
    const sceneStore = useSceneStore.getState();
    if (!obj.userData?.uuid) return;

    sceneStore.updateItem(obj.userData.uuid, {
      position: [obj.position.x, obj.position.y, obj.position.z],
      rotation: [obj.rotation.x, obj.rotation.y, obj.rotation.z],
      scale: [obj.scale.x, obj.scale.y, obj.scale.z],
    });
  }

  // ======================================================
  // SELECT ITEM BY UUID
  // ======================================================
  public selectItemByUUID(uuid: string | null) {
    if (!uuid) {
      this.clearSelection();
      return;
    }

    const obj = this.engine.scene.getObjectByProperty("uuid", uuid);
    if (!obj) {
      this.clearSelection();
      return;
    }

    this.selectObject(obj);
  }
}
// --- END FILE ---
