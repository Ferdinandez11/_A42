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

import { useEditorStore } from "@/stores/editor/useEditorStore";
import { useSceneStore } from "@/stores/scene/useSceneStore";
import { useSelectionStore } from "@/stores/selection/useSelectionStore";

export class A42Engine {
  // Managers
  public sceneManager: SceneManager;
  public objectManager: ObjectManager;
  public toolsManager: ToolsManager;
  public interactionManager: InteractionManager;
  public walkManager: WalkManager;
  public recorderManager: RecorderManager;
  public exportManager: ExportManager;
  public pdfManager: PDFManager;

  // Internal state
  private clock: THREE.Clock;
  private savedBackground: THREE.Color | THREE.Texture | null = null;
  private wasSkyVisible: boolean = true;
  private transparentElements: HTMLElement[] = [];

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

    // Setup global event listeners
    window.addEventListener("resize", this.onWindowResize);
    window.addEventListener("keydown", this.onKeyDown);
  }

  // Getters
  public get scene(): THREE.Scene {
    return this.sceneManager.scene;
  }

  public get activeCamera(): THREE.Camera {
    return this.sceneManager.activeCamera;
  }

  public get renderer(): THREE.WebGLRenderer {
    return this.sceneManager.renderer;
  }

  // Mouse interaction handler
  public onMouseDown = (event: MouseEvent): void => {
    this.interactionManager.onPointerDown(event);
  };

  // Scene configuration methods
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

  // Camera methods
  public switchCamera(type: CameraType): void {
    this.sceneManager.switchCamera(type);
    this.sceneManager.controls.object = this.sceneManager.activeCamera;
    this.interactionManager.updateCamera(this.sceneManager.activeCamera);
  }

  public setView(view: CameraView): void {
    this.sceneManager.setView(view);
  }

  // Tools methods
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

  // Safety zones methods
  public updateSafetyZones(visible: boolean): void {
    this.scene.traverse((obj) => {
      if (obj.userData?.isSafetyZone) {
        obj.visible = visible;
      }
    });
  }

  public checkSafetyCollisions(): void {
    const { safetyZonesVisible } = useEditorStore.getState();
    if (!safetyZonesVisible) return;

    const zones: THREE.Mesh[] = [];
    const boxes: THREE.Box3[] = [];

    // Collect all safety zones
    this.scene.traverse((obj) => {
      if (obj.userData?.isSafetyZone && obj.visible) {
        zones.push(obj as THREE.Mesh);
        boxes.push(new THREE.Box3().setFromObject(obj));

        // Set default material
        (obj as THREE.Mesh).material = new THREE.MeshBasicMaterial({
          color: 0xff0000,
          transparent: true,
          opacity: 0.3,
          depthWrite: false,
          side: THREE.DoubleSide,
        });
      }
    });

    // Check for intersections
    for (let i = 0; i < zones.length; i++) {
      for (let j = i + 1; j < zones.length; j++) {
        if (boxes[i].intersectsBox(boxes[j])) {
          const alertMat = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.8,
            depthWrite: false,
            side: THREE.DoubleSide,
          });
          zones[i].material = alertMat;
          zones[j].material = alertMat;
        }
      }
    }
  }

  public isObjectColliding(target: THREE.Object3D): boolean {
    const { safetyZonesVisible } = useEditorStore.getState();
    if (!safetyZonesVisible) return false;

    // Get target safety zones
    const targetZones: THREE.Box3[] = [];
    target.traverse((child) => {
      if (child.userData?.isSafetyZone) {
        targetZones.push(new THREE.Box3().setFromObject(child));
      }
    });

    if (targetZones.length === 0) return false;

    // Get other safety zones (excluding target's children)
    const otherZones: THREE.Box3[] = [];
    this.scene.traverse((obj) => {
      if (obj.userData?.isSafetyZone && obj.visible) {
        let isChildOfTarget = false;
        let parent = obj.parent;
        while (parent) {
          if (parent === target) {
            isChildOfTarget = true;
            break;
          }
          parent = parent.parent;
        }
        if (!isChildOfTarget) {
          otherZones.push(new THREE.Box3().setFromObject(obj));
        }
      }
    });

    // Check for collisions
    for (const tBox of targetZones) {
      for (const oBox of otherZones) {
        if (tBox.intersectsBox(oBox)) {
          return true;
        }
      }
    }

    return false;
  }

  // AR initialization
  private async initAR(): Promise<void> {
    if (!("xr" in navigator)) return;
    
    try {
      // @ts-ignore - XR types may not be available
      const isSupported = await navigator.xr.isSessionSupported("immersive-ar");
      if (!isSupported) return;
    } catch {
      return;
    }

    const arBtn = ARButton.createButton(this.renderer, {
      requiredFeatures: ["hit-test"],
      optionalFeatures: ["dom-overlay"],
      domOverlay: { root: document.body },
    });

    // Setup session start event
    this.renderer.xr.addEventListener("sessionstart", () => {
      this.savedBackground = this.scene.background;
      this.wasSkyVisible = this.sceneManager.sky
        ? this.sceneManager.sky.visible
        : false;

      this.scene.background = null;
      this.setSkyVisible(false);
      this.setGridVisible(false);
      this.renderer.setClearColor(0x000000, 0);

      // Make elements transparent for AR
      this.transparentElements = [];
      let el: HTMLElement | null = this.renderer.domElement;
      while (el && el !== document.documentElement) {
        this.transparentElements.push(el);
        el.style.setProperty("background", "transparent", "important");
        el.style.setProperty("background-color", "transparent", "important");
        el = el.parentElement;
      }
      document.body.style.setProperty("background", "transparent", "important");
      document.documentElement.style.setProperty(
        "background",
        "transparent",
        "important"
      );
    });

    // Setup session end event
    this.renderer.xr.addEventListener("sessionend", () => {
      const { gridVisible } = useEditorStore.getState();

      if (this.savedBackground) this.scene.background = this.savedBackground;
      if (this.wasSkyVisible) this.setSkyVisible(true);
      this.setGridVisible(gridVisible);

      // Restore element styles
      this.transparentElements.forEach((el) => {
        el.style.removeProperty("background");
        el.style.removeProperty("background-color");
      });
      document.body.style.removeProperty("background");
      document.documentElement.style.removeProperty("background");
    });

    // Style AR button
    const arContainer = document.createElement("div");
    arContainer.style.position = "absolute";
    arContainer.style.bottom = "20px";
    arContainer.style.right = "20px";
    arContainer.style.zIndex = "1000";
    arContainer.style.display = "flex";
    arContainer.style.justifyContent = "flex-end";
    arContainer.style.pointerEvents = "none";

    arBtn.style.position = "static";
    arBtn.style.transform = "none";
    arBtn.style.left = "auto";
    arBtn.style.bottom = "auto";
    arBtn.style.width = "160px";
    arBtn.style.background = "rgba(0,0,0,0.85)";
    arBtn.style.border = "1px solid rgba(255,255,255,0.3)";
    arBtn.style.borderRadius = "30px";
    arBtn.style.color = "#fff";
    arBtn.style.fontFamily = "sans-serif";
    arBtn.style.fontSize = "12px";
    arBtn.style.fontWeight = "bold";
    arBtn.style.padding = "10px 0";
    arBtn.style.cursor = "pointer";
    arBtn.style.pointerEvents = "auto";

    arContainer.appendChild(arBtn);
    document.body.appendChild(arContainer);
  }

  // Scene synchronization
  public async syncSceneFromStore(storeItems: SceneItem[]): Promise<void> {
    const sceneItemsMap = new Map<string, THREE.Object3D>();
    
    // Build map of existing scene items
    this.scene.children.forEach((child) => {
      if (child.userData?.isItem && child.uuid) {
        sceneItemsMap.set(child.uuid, child);
      }
    });

    // Process store items
    for (const item of storeItems) {
      const sceneObj = sceneItemsMap.get(item.uuid);

      if (sceneObj) {
        // Handle floor updates
        if (item.type === "floor") {
          const hasChanged =
            JSON.stringify(sceneObj.userData.points) !==
              JSON.stringify(item.points) ||
            sceneObj.userData.floorMaterial !== item.floorMaterial ||
            sceneObj.userData.textureUrl !== item.textureUrl ||
            sceneObj.userData.textureScale !== item.textureScale ||
            sceneObj.userData.textureRotation !== item.textureRotation;

          if (hasChanged) {
            this.scene.remove(sceneObj);
            this.objectManager.recreateFloor(item);
            sceneItemsMap.delete(item.uuid);
            continue;
          }
        }

        // Handle fence updates
        if (item.type === "fence") {
          const hasConfigChanged =
            JSON.stringify(sceneObj.userData.fenceConfig) !==
            JSON.stringify(item.fenceConfig);
          const hasPointsChanged =
            JSON.stringify(sceneObj.userData.points) !==
            JSON.stringify(item.points);

          if (hasConfigChanged || hasPointsChanged) {
            this.scene.remove(sceneObj);
            this.objectManager.recreateFence(item);
            sceneItemsMap.delete(item.uuid);
            continue;
          }
        }

        // Update transform for existing objects
        sceneObj.position.fromArray(item.position);
        sceneObj.rotation.fromArray(item.rotation);
        sceneObj.scale.fromArray(item.scale);
        sceneItemsMap.delete(item.uuid);
      } else {
        // Create new objects
        if (item.type === "model" && item.modelUrl) {
          await this.objectManager.recreateModel(item);
        } else if (item.type === "floor" && item.points) {
          this.objectManager.recreateFloor(item);
        } else if (item.type === "fence" && item.points) {
          this.objectManager.recreateFence(item);
        }
      }
    }

    // Remove items that are no longer in store
    for (const [uuid, obj] of sceneItemsMap) {
      this.scene.remove(obj);

      if (this.interactionManager.transformControl?.object?.uuid === uuid) {
        this.interactionManager.transformControl.detach();
        this.interactionManager.transformControl.visible = false;
      }
      if (this.toolsManager.activeFloorId === uuid) {
        this.toolsManager.activeFloorId = null;
        this.toolsManager.clearFloorEditMarkers();
      }
    }
  }

  // Keyboard event handler
  private onKeyDown = (e: KeyboardEvent): void => {
    if (this.walkManager.isEnabled) return;

    const editor = useEditorStore.getState();
    const selection = useSelectionStore.getState();
    const scene = useSceneStore.getState();

    if (editor.mode !== "editing") return;

    // Undo functionality
    if (e.key === "z" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      scene.undo();
      return;
    }

    const tc = this.interactionManager.transformControl;
    if (!tc?.visible) return;

    // Transform mode shortcuts
    if (e.key === "t") {
      tc.setMode("translate");
    } else if (e.key === "r") {
      tc.setMode("rotate");
    } else if (e.key === "e") {
      tc.setMode("scale");
    } else if (e.key === "Delete" || e.key === "Backspace") {
      // Delete selected object
      const obj = tc.object;
      if (obj && !obj.userData.isFloorMarker) {
        tc.detach();
        tc.visible = false;
        this.scene.remove(obj);
        this.sceneManager.controls.enabled = true;

        scene.removeItem(obj.uuid);
        selection.selectItem(null);
        this.toolsManager.activeFloorId = null;
        this.toolsManager.clearFloorEditMarkers();
      }
    }
  };

  // Window resize handler
  private onWindowResize = (): void => {
    this.sceneManager.onWindowResize();
  };

  // Initialize engine
  public init(): void {
    this.initAR();
    this.renderer.setAnimationLoop(this.render);
  }

  // Main render loop
  private render = (): void => {
    const delta = this.clock.getDelta();
    this.walkManager.update(delta);
    this.recorderManager.update(delta);

    this.checkSafetyCollisions();

    if (!this.walkManager.isEnabled) {
      this.sceneManager.controls.update();
    }
    this.sceneManager.renderer.render(this.scene, this.activeCamera);
  };

  // Cleanup
  public dispose(): void {
    this.renderer.setAnimationLoop(null);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("resize", this.onWindowResize);
    this.sceneManager.dispose();
  }
}