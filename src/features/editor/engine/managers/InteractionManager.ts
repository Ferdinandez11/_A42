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

    // 1. CONFIGURACIÓN DE SNAP (15 grados y 10cm movimiento)
    this.transformControl.setTranslationSnap(0.1); 
    this.transformControl.setRotationSnap(THREE.MathUtils.degToRad(15)); 

    this.transformControl.visible = false;
    this.engine.scene.add(this.transformControl);

    this.attachListeners();
  }

  private attachListeners() {
    // Evento: Inicio/Fin de arrastre
    this.transformControl.addEventListener("dragging-changed", (e: any) => {
      this.isDragging = e.value;
      this.engine.sceneManager.controls.enabled = !e.value;

      const obj = this.transformControl.object;
      if (!obj || e.value) return; // Si estamos arrastrando, no guardamos todavía

      // Al soltar, guardamos en el store
      if (obj.userData?.uuid) {
        this.syncTransformToStore(obj);
      }
    });

    // Evento: Cambio en tiempo real (mientras mueves/rotas)
    this.transformControl.addEventListener("change", () => {
      if (!this.isDragging) return;
      const obj = this.transformControl.object;
      if (!obj) return;

      // 2. LÓGICA DE "PEGAR AL SUELO" AL ROTAR
      if (this.transformControl.getMode() === 'rotate') {
          // Calculamos la caja del objeto en coordenadas mundiales
          // Nota: updateMatrixWorld es vital para que el cálculo sea preciso en tiempo real
          obj.updateMatrixWorld(); 
          const box = new THREE.Box3().setFromObject(obj);
          
          // Si el punto más bajo (min.y) no es 0, ajustamos la posición Y
          // Usamos un pequeño umbral (0.001) para evitar vibraciones
          if (Math.abs(box.min.y) > 0.001) {
              obj.position.y -= box.min.y;
          }
      }

      // Sincronización visual (opcional en tiempo real, obligatorio al soltar)
      // Si quieres que el store se actualice en tiempo real (puede bajar fps), descomenta:
      // this.syncTransformToStore(obj);
    });
  }

  public updateCamera(camera: THREE.Camera) {
    this.transformControl.camera = camera;
  }

  public setGizmoMode(mode: "translate" | "rotate" | "scale") {
    this.transformControl.setMode(mode);
  }

  // ======================================================
  // POINTER MOVE (OPTIMIZADO PARA PREVIEW)
  // ======================================================
  public onPointerMove = (evt: MouseEvent) => {
    const mode = useEditorStore.getState().mode;
    
    if (mode === 'idle' || mode === 'editing' || mode === 'catalog') return;

    this.updatePointer(evt);
    this.raycaster.setFromCamera(this.pointer, this.engine.activeCamera);

    const floorPoint = this.engine.sceneManager.raycastWorldPoint(this.raycaster);

    if (floorPoint) {
        if (mode === "placing_item") {
            this.engine.objectManager.placePreviewAt(floorPoint);
        } else if (mode === "drawing_floor") {
            // Lógica visual de dibujo futura
        }
    }
  };

  // ======================================================
  // POINTER DOWN
  // ======================================================
  public onPointerDown = (evt: MouseEvent) => {
    if (evt.button === 2) return this.handleRightClick();
    if (this.isDragging) return;

    this.updatePointer(evt);
    this.raycaster.setFromCamera(this.pointer, this.engine.activeCamera);

    this.handleSceneClick();
  };

  private updatePointer(evt: MouseEvent) {
    const rect = this.engine.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((evt.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((evt.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private handleSceneClick() {
    const mode = useEditorStore.getState().mode;

    // 1. MODO COLOCACIÓN
    if (mode === "placing_item") {
        const world = this.engine.sceneManager.raycastWorldPoint(this.raycaster);
        if (world) {
            this.engine.objectManager.placePreviewAt(world);
            this.engine.objectManager.confirmPreviewPlacement();
            useEditorStore.getState().setMode("idle");
        }
        return;
    }

    // 2. MODO DIBUJO
    const world = this.engine.sceneManager.raycastWorldPoint(this.raycaster);
    if (world) {
      if (mode === "drawing_floor") {
        this.engine.toolsManager.floorTool.addPoint(world);
        return;
      }
      if (mode === "drawing_fence") {
        this.engine.toolsManager.fenceTool.addPoint(world);
        return;
      }
    }

    // 3. MODO IDLE/EDITING
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
          useEditorStore.getState().setMode("editing");
          return;
      }
    }

    this.clearSelection();
    useEditorStore.getState().setMode("idle");
  }

  // ======================================================
  // RIGHT CLICK
  // ======================================================
  private handleRightClick() {
    const mode = useEditorStore.getState().mode;

    if (mode === "placing_item") {
      useEditorStore.getState().setMode("idle");
      return;
    }

    if (mode === "drawing_floor") {
      this.engine.toolsManager.floorTool.finalize();
      return;
    }

    if (mode === "drawing_fence") {
      this.engine.toolsManager.fenceTool.finalize();
      return;
    }
  }

  // ======================================================
  // SELECTION
  // ======================================================
  public selectObject(obj: THREE.Object3D | null) {
    const store = useSelectionStore.getState();

    if (!obj) return this.clearSelection();

    const uuid = obj.userData?.uuid;
    if (!uuid) return this.clearSelection();

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
  // STORE SYNC
  // ======================================================
  private syncTransformToStore(obj: THREE.Object3D) {
    if (!obj.userData?.uuid) return;

    useSceneStore.getState().updateItem(obj.userData.uuid, {
      position: [obj.position.x, obj.position.y, obj.position.z],
      rotation: [obj.rotation.x, obj.rotation.y, obj.rotation.z],
      scale: [obj.scale.x, obj.scale.y, obj.scale.z],
    });
  }

  public selectItemByUUID(uuid: string | null) {
    if (!uuid) return this.clearSelection();
    const obj = this.engine.scene.getObjectByProperty("uuid", uuid);
    this.selectObject(obj ?? null);
  }
}