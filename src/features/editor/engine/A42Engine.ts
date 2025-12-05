// --- FILE: src/features/editor/engine/A42Engine.ts ---
import * as THREE from "three";
import { ARButton } from "three/examples/jsm/webxr/ARButton.js";

import type { SceneItem, CameraView, CameraType } from "@/types/editor";

import { SceneManager } from "./managers/SceneManager";
import { ObjectManager } from "./managers/ObjectManager";
import { ToolsManager } from "./managers/ToolsManager";
import { InteractionManager } from "./managers/InteractionManager";
import { WalkManager } from "./managers/WalkManager";
import { RecorderManager } from "./managers/RecorderManager";
import { ExportManager } from "./managers/ExportManager";
import { PDFManager } from "./managers/PDFManager";

import { useSceneStore } from "@/stores/scene/useSceneStore";
import { useSelectionStore } from "@/stores/selection/useSelectionStore";

export class A42Engine {
  public sceneManager: SceneManager;
  public objectManager: ObjectManager;
  public toolsManager: ToolsManager;
  public interactionManager: InteractionManager;
  public walkManager: WalkManager;
  public recorderManager: RecorderManager;
  public exportManager: ExportManager;
  public pdfManager: PDFManager;

  private clock = new THREE.Clock();

  constructor(container: HTMLElement) {
    // --- CORE MODULES ---
    this.sceneManager = new SceneManager(container);
    this.objectManager = new ObjectManager(this.sceneManager.scene);

    // ⚠️ ToolsManager necesita scene + objectManager
    this.toolsManager = new ToolsManager(
      this.sceneManager.scene,
      this.objectManager
    );

    this.interactionManager = new InteractionManager(this);
    this.walkManager = new WalkManager(this);
    this.recorderManager = new RecorderManager(this);
    this.exportManager = new ExportManager(this);
    this.pdfManager = new PDFManager(this);

    this.sceneManager.renderer.xr.enabled = true;

    // --- EVENTS ---
    window.addEventListener("resize", this.onWindowResize);
    window.addEventListener("keydown", this.onKeyDown);
  }

  // === GETTERS ===
  public get scene() {
    return this.sceneManager.scene;
  }
  public get activeCamera() {
    return this.sceneManager.activeCamera;
  }
  public get renderer() {
    return this.sceneManager.renderer;
  }

  // === PUBLIC API ===
  public onPointerDown = (event: MouseEvent) => {
    this.interactionManager.onPointerDown(event);
  };

  public switchCamera(type: CameraType) {
    this.sceneManager.switchCamera(type);
    this.interactionManager.updateCamera(this.activeCamera);
  }

  public setView(view: CameraView) {
    this.sceneManager.setView(view);
  }

  public setBackground(color: string) {
    this.sceneManager.setBackgroundColor(color);
  }

  public setGrid(visible: boolean) {
    this.sceneManager.setGridVisible(visible);
  }

  public setSky(visible: boolean) {
    this.sceneManager.setSkyVisible(visible);
  }

  public setGizmoMode(mode: "translate" | "rotate" | "scale") {
    this.interactionManager.setGizmoMode(mode);
  }

  public clearTools() {
    this.toolsManager.clearTools();
    // requiere que selectObject sea public y acepte null
    this.interactionManager.selectObject(null);
  }

  // === KEYBOARD ===
  private onKeyDown = (e: KeyboardEvent) => {
    if (this.walkManager.isEnabled) return;

    const selection = useSelectionStore.getState();
    const sceneStore = useSceneStore.getState();

    // === DELETE SELECTION ===
    if (e.key === "Delete" || e.key === "Backspace") {
      const uuid = selection.selectedUUID;
      if (!uuid) return;

      this.interactionManager.selectObject(null);
      sceneStore.removeItem(uuid);
      this.objectManager.removeByUUID(uuid);
      selection.select(null);
      return;
    }

    const tc = this.interactionManager.transformControl;
    if (!tc?.visible) return;

    if (e.key === "t") tc.setMode("translate");
    else if (e.key === "r") tc.setMode("rotate");
    else if (e.key === "e") tc.setMode("scale");
  };

  // === WINDOW RESIZE ===
  private onWindowResize = () => {
    this.sceneManager.onWindowResize();
  };

  // === AR INITIALIZATION ===
  private async initAR() {
    if (!("xr" in navigator)) return;

    let supported = false;
    try {
      // @ts-ignore
      supported = await navigator.xr.isSessionSupported("immersive-ar");
    } catch {
      supported = false;
    }
    if (!supported) return;

    const button = ARButton.createButton(this.renderer, {
      requiredFeatures: ["hit-test"],
      optionalFeatures: ["dom-overlay"],
      domOverlay: { root: document.body },
    });

    // Style AR button
    button.style.position = "fixed";
    button.style.bottom = "20px";
    button.style.right = "20px";
    button.style.width = "160px";
    button.style.background = "rgba(0,0,0,0.85)";
    button.style.border = "1px solid rgba(255,255,255,0.3)";
    button.style.borderRadius = "30px";
    button.style.color = "#fff";
    button.style.fontSize = "12px";
    button.style.fontWeight = "bold";
    button.style.padding = "10px 0";
    button.style.cursor = "pointer";
  }

  // === SCENE SYNC (STORE → ENGINE) ===
  public async syncScene(storeItems: SceneItem[]) {
    await this.syncSceneFromStore(storeItems);
  }

  // Motor interno de sincronización
  private async syncSceneFromStore(items: SceneItem[]) {
    const scene = this.scene;
    const existing = new Map<string, THREE.Object3D>();

    // 1) Indexar objetos actuales
    scene.traverse((child) => {
      if (child.userData?.isItem && child.uuid) {
        existing.set(child.uuid, child);
      }
    });

    // 2) Actualizar o crear
    for (const item of items) {
      const obj = existing.get(item.uuid);

      if (!obj) {
        // No existe → creamos uno nuevo
        await this.objectManager.createFromItem(item);
        continue;
      }

      // Sí existe → actualizamos transform
      obj.position.fromArray(item.position);
      obj.rotation.fromArray(item.rotation);
      obj.scale.fromArray(item.scale);

      existing.delete(item.uuid);
    }

    // 3) Eliminar los que ya no están en el store
    for (const [uuid] of existing) {
      this.objectManager.removeByUUID(uuid);
    }
  }

  // === ENGINE INIT ===
  public init() {
    this.initAR();
    this.renderer.setAnimationLoop(this.render);
  }

  // === RENDER LOOP ===
  private render = () => {
    const delta = this.clock.getDelta();

    this.walkManager.update(delta);
    this.recorderManager.update(delta);

    if (!this.walkManager.isEnabled) {
      this.sceneManager.controls.update();
    }

    this.renderer.render(this.scene, this.activeCamera);
  };

  // === DISPOSE ===
  public dispose() {
    this.renderer.setAnimationLoop(null);
    window.removeEventListener("resize", this.onWindowResize);
    window.removeEventListener("keydown", this.onKeyDown);

    this.sceneManager.dispose();
  }
}
// --- END FILE ---
