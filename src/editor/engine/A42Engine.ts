import * as THREE from "three";

import type { SceneItem, CameraView, CameraType } from "@/domain/types/editor";

import { SceneManager } from "@/editor/engine/managers/SceneManager";
import { ObjectManager } from "@/editor/engine/managers/ObjectManager";
import { ToolsManager } from "@/editor/engine/managers/ToolsManager";
import { InteractionManager } from "@/editor/engine/managers/InteractionManager";
import { WalkManager } from "@/editor/engine/managers/WalkManager";
import { RecorderManager } from "@/editor/engine/managers/RecorderManager";
import { ExportManager } from "@/editor/engine/managers/ExportManager";
import { PDFManager } from "@/pdf/engine/managers/PDFManager";

// New modular services
import { SafetyZoneManager } from "@/editor/engine/services/SafetyZoneManager";
import { EventHandlers } from "@/editor/engine/services/EventHandlers";
import { ARManager } from "@/editor/engine/services/ARManager";
import { SceneSynchronizer } from "@/editor/engine/services/SceneSynchronizer";

export class A42Engine {
  // Core managers (public API - unchanged)
  public sceneManager: SceneManager;
  public objectManager: ObjectManager;
  public toolsManager: ToolsManager;
  public interactionManager: InteractionManager;
  public walkManager: WalkManager;
  public recorderManager: RecorderManager;
  public exportManager: ExportManager;
  public pdfManager: PDFManager;

  // New modular services (private)
  private safetyZoneManager: SafetyZoneManager;
  private eventHandlers: EventHandlers;
  private arManager: ARManager;
  private sceneSynchronizer: SceneSynchronizer;

  // Internal state
  private clock: THREE.Clock;

  constructor(container: HTMLElement) {
    this.clock = new THREE.Clock();

    // Initialize core managers
    this.sceneManager = new SceneManager(container);
    this.sceneManager.renderer.xr.enabled = true;

    this.objectManager = new ObjectManager(this.sceneManager.scene);
    this.toolsManager = new ToolsManager(this.sceneManager.scene);
    this.interactionManager = new InteractionManager(this);
    this.walkManager = new WalkManager(this);
    this.recorderManager = new RecorderManager(this);
    this.exportManager = new ExportManager(this);
    this.pdfManager = new PDFManager(this);

    // Initialize new services
    this.safetyZoneManager = new SafetyZoneManager(this.sceneManager.scene);
    this.eventHandlers = new EventHandlers(this);
    this.arManager = new ARManager(this);
    this.sceneSynchronizer = new SceneSynchronizer(this);

    // Setup global event listeners
    window.addEventListener("resize", this.eventHandlers.onWindowResize);
    window.addEventListener("keydown", this.eventHandlers.onKeyDown);
  }

  // Getters (unchanged)
  public get scene(): THREE.Scene {
    return this.sceneManager.scene;
  }

  public get activeCamera(): THREE.Camera {
    return this.sceneManager.activeCamera;
  }

  public get renderer(): THREE.WebGLRenderer {
    return this.sceneManager.renderer;
  }

  // Mouse interaction handler (unchanged)
  public onMouseDown = (event: MouseEvent): void => {
    this.interactionManager.onPointerDown(event);
  };

  // Scene configuration methods (delegators)
  public setBackgroundColor(color: string): void {
    this.sceneManager.setBackgroundColor(color);
  }

  public setSkyVisible(visible: boolean): void {
    this.sceneManager.setSkyVisible(visible);
  }

  public setGridVisible(visible: boolean): void {
    this.sceneManager.setGridVisible(visible);
  }

  public updateSunPosition(azimuth: number, elevation: number): void {
    this.sceneManager.updateSunPosition(azimuth, elevation);
  }

  public togglePDFFraming(visible: boolean): void {
    this.sceneManager.setFrameVisible(visible);
  }

  // Camera methods (delegators)
  public switchCamera(type: CameraType): void {
    this.sceneManager.switchCamera(type);
    this.sceneManager.controls.object = this.sceneManager.activeCamera;
    this.interactionManager.updateCamera(this.sceneManager.activeCamera);
  }

  public setView(view: CameraView): void {
    this.sceneManager.setView(view);
  }

  // Tools methods (delegators)
  public clearTools(): void {
    this.toolsManager.clearTools();
    if (this.interactionManager.transformControl) {
      this.interactionManager.transformControl.detach();
      this.interactionManager.transformControl.visible = false;
    }
  }

  public setGizmoMode(mode: "translate" | "rotate" | "scale"): void {
    this.interactionManager.setGizmoMode(mode);
  }

  // Safety zones methods (delegators to SafetyZoneManager)
  public updateSafetyZones(visible: boolean): void {
    this.safetyZoneManager.updateVisibility(visible);
  }

  public checkSafetyCollisions(): void {
    this.safetyZoneManager.checkCollisions();
  }

  public isObjectColliding(target: THREE.Object3D): boolean {
    return this.safetyZoneManager.isObjectColliding(target);
  }

  // Scene synchronization (delegator to SceneSynchronizer)
  public async syncSceneFromStore(storeItems: SceneItem[]): Promise<void> {
    await this.sceneSynchronizer.syncFromStore(storeItems);
  }

  // Initialize engine
  public init(): void {
    this.arManager.initialize();
    this.renderer.setAnimationLoop(this.render);
  }

  // Main render loop
  private render = (): void => {
    const delta = this.clock.getDelta();
    this.walkManager.update(delta);
    this.recorderManager.update(delta);

    this.checkSafetyCollisions();

    // SAFETY GUARD: Check if TransformControl is attached to an object not in scene
    // This fixes the "attached 3D object must be a part of the scene graph" error loop
    const tc = this.interactionManager.transformControl;
    if (tc && tc.object && !tc.object.parent) {
      // Clean up orphaned TransformControls attachment (silent cleanup)
      tc.detach();
      tc.visible = false;
    }

    if (!this.walkManager.isEnabled) {
      this.sceneManager.controls.update();
    }
    this.sceneManager.renderer.render(this.scene, this.activeCamera);
  };

  // Cleanup
  public dispose(): void {
    this.renderer.setAnimationLoop(null);
    window.removeEventListener("keydown", this.eventHandlers.onKeyDown);
    window.removeEventListener("resize", this.eventHandlers.onWindowResize);
    this.sceneManager.dispose();
  }
}