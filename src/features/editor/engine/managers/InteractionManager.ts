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

  constructor(engine: A42Engine) {
    this.engine = engine;

    this.transformControl = new TransformControls(
      this.engine.activeCamera,
      this.engine.renderer.domElement
    );

    this.transformControl.visible = false;
    this.engine.scene.add(this.transformControl);

    this.attachListeners();
  }

  // ======================================================
  // TRANSFORM CONTROL LISTENERS
  // ======================================================
  private attachListeners() {
    this.transformControl.addEventListener("dragging-changed", (e: any) => {
      this.isDragging = e.value;
      this.engine.sceneManager.controls.enabled = !e.value;

      const obj = this.transformControl.object;
      if (!obj || e.value) return;

      if (obj.userData?.uuid) {
        this.syncTransformToStore(obj);
      }
    });

    this.transformControl.addEventListener("objectChange", () => {
      if (!this.isDragging) return;
      const obj = this.transformControl.object;
      if (obj) this.syncTransformToStore(obj);
    });
  }

  // ======================================================
  // CAMERA UPDATE  ⭐ Necesario para A42Engine
  // ======================================================
  public updateCamera(camera: THREE.Camera) {
    this.transformControl.camera = camera;
  }

  // ======================================================
  // SET GIZMO MODE  ⭐ Necesario para A42Engine
  // ======================================================
  public setGizmoMode(mode: "translate" | "rotate" | "scale") {
    this.transformControl.setMode(mode);
  }

  // ======================================================
  // POINTER DOWN
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
    const mode = useEditorStore.getState().mode;

    // 1) SELECT OBJECT
    const objects: THREE.Object3D[] = [];
    this.engine.scene.traverse((obj) => {
      if (obj.userData?.isItem) objects.push(obj);
    });

    const hits = this.raycaster.intersectObjects(objects, true);
    if (hits.length > 0) {
      let obj: THREE.Object3D | null = hits[0].object;
      while (obj && !obj.userData?.isItem && obj.parent) obj = obj.parent;
      if (obj) {
        this.selectObject(obj);
        return;
      }
    }

    // 2) CLICK ON GROUND
    const world = this.engine.sceneManager.raycastWorldPoint(this.raycaster);
    if (world) {
      if (mode === "placing_item") {
        this.engine.objectManager.placePreviewAt?.(world);
        return;
      }

      if (mode === "drawing_floor") {
        this.engine.toolsManager.floorTool.addPoint(world);
        return;
      }

      if (mode === "drawing_fence") {
        this.engine.toolsManager.fenceTool.addPoint(world);
        return;
      }
    }

    // 3) CLEAR SELECTION
    this.clearSelection();
  }

  // ======================================================
  // SELECTION
  // ======================================================
  public selectObject(obj: THREE.Object3D | null) {
    const store = useSelectionStore.getState();

    if (!obj) {
      this.clearSelection();
      return;
    }

    const uuid = obj.userData?.uuid;
    if (!uuid) {
      this.clearSelection();
      return;
    }

    store.select(uuid);
    this.transformControl.attach(obj);
    this.transformControl.visible = true;
    this.engine.sceneManager.controls.enabled = false;
  }

  private clearSelection() {
    const store = useSelectionStore.getState();
    store.select(null);

    this.transformControl.detach();
    this.transformControl.visible = false;
    this.engine.sceneManager.controls.enabled = true;
  }

  // ======================================================
  // SYNC TRANSFORM TO STORE
  // ======================================================
  private syncTransformToStore(obj: THREE.Object3D) {
    if (!obj.userData?.uuid) return;

    useSceneStore.getState().updateItem(obj.userData.uuid, {
      position: [obj.position.x, obj.position.y, obj.position.z],
      rotation: [obj.rotation.x, obj.rotation.y, obj.rotation.z],
      scale: [obj.scale.x, obj.scale.y, obj.scale.z],
    });
  }

  // ======================================================
  // SELECT BY UUID
  // ======================================================
  public selectItemByUUID(uuid: string | null) {
    if (!uuid) return this.clearSelection();
    const obj = this.engine.scene.getObjectByProperty("uuid", uuid);
    this.selectObject(obj ?? null);
  }
}
// --- END FILE ---
