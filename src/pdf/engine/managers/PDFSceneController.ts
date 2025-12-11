import * as THREE from "three";
import type { A42Engine } from "@/editor/engine/A42Engine";
import { useEditorStore } from "@/editor/stores/editor/useEditorStore";

/**
 * Controls scene state for PDF generation
 * Saves and restores camera, renderer, and scene settings
 */
export class PDFSceneController {
  private engine: A42Engine;
  
  // State variables
  private savedRendererSize: THREE.Vector2 = new THREE.Vector2();
  private savedPixelRatio: number = 1;
  private savedCameraPos: THREE.Vector3 = new THREE.Vector3();
  private savedCameraRot: THREE.Euler = new THREE.Euler();
  private savedControlsTarget: THREE.Vector3 = new THREE.Vector3();
  private savedBg: THREE.Color | THREE.Texture | null = null;
  private savedFog: THREE.FogBase | null = null;
  private wasSkyVisible: boolean = false;

  constructor(engine: A42Engine) {
    this.engine = engine;
  }

  public saveState(): void {
    this.engine.renderer.getSize(this.savedRendererSize);
    this.savedPixelRatio = this.engine.renderer.getPixelRatio();
    this.savedCameraPos.copy(this.engine.activeCamera.position);
    this.savedCameraRot.copy(this.engine.activeCamera.rotation);
    this.savedControlsTarget.copy(this.engine.sceneManager.controls.target);
    this.savedBg = this.engine.scene.background;
    this.savedFog = this.engine.scene.fog;
    this.wasSkyVisible = this.engine.sceneManager.sky?.visible ?? false;
  }

  public restoreState(): void {
    this.engine.renderer.setSize(
      this.savedRendererSize.x,
      this.savedRendererSize.y
    );
    this.engine.renderer.setPixelRatio(this.savedPixelRatio);
    this.engine.switchCamera("perspective");
    this.engine.sceneManager.onWindowResize();

    this.engine.activeCamera.position.copy(this.savedCameraPos);
    this.engine.activeCamera.rotation.copy(this.savedCameraRot);
    this.engine.sceneManager.controls.target.copy(this.savedControlsTarget);
    this.engine.sceneManager.controls.enabled = true;
    this.engine.sceneManager.controls.update();

    this.engine.scene.background = this.savedBg;
    this.engine.scene.fog = this.savedFog;
    this.engine.setSkyVisible(this.wasSkyVisible);
    this.setVisibilityForAllItems(true);
    this.hideHelpers(false);
    this.setShadows(true);

    const shouldGridBeVisible = useEditorStore.getState().gridVisible;
    this.engine.setGridVisible(shouldGridBeVisible);
    this.engine.renderer.render(this.engine.scene, this.engine.activeCamera);
    setTimeout(() => {
      this.engine.setGridVisible(shouldGridBeVisible);
    }, 100);
  }

  public prepareForPDF(): void {
    this.engine.sceneManager.controls.enabled = false;
    this.engine.scene.background = new THREE.Color(0xffffff);
    this.engine.scene.fog = null;
    this.engine.setGridVisible(false);
    this.engine.setSkyVisible(false);
    this.hideHelpers(true);
  }

  public setVisibilityForAllItems(visible: boolean): void {
    this.engine.scene.traverse((obj) => {
      if (obj.userData?.isItem) {
        obj.visible = visible;
        obj.traverse((child) => {
          if (child !== obj) child.visible = visible;
        });
      }
    });
  }

  public setVisibilityForItem(uuid: string, visible: boolean): void {
    const obj = this.engine.scene.getObjectByProperty("uuid", uuid);
    if (obj) {
      obj.visible = visible;
      obj.traverse((child) => {
        if (child !== obj && !child.userData.isHelper) {
          child.visible = visible;
        }
      });
    }
  }

  public hideHelpers(hide: boolean): void {
    this.engine.scene.traverse((obj) => {
      if (obj.userData.isHelper) {
        obj.visible = !hide;
      }
    });
  }

  public setShadows(enabled: boolean): void {
    this.engine.renderer.shadowMap.enabled = enabled;
  }

  public getObjectBoundingBox(obj: THREE.Object3D): THREE.Box3 {
    const box = new THREE.Box3();
    obj.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        child.geometry.computeBoundingBox();
        if (child.geometry.boundingBox) {
          const localBox = child.geometry.boundingBox.clone();
          localBox.applyMatrix4(child.matrixWorld);
          box.union(localBox);
        }
      }
    });
    return box;
  }

  public getSceneBoundingBox(): THREE.Box3 {
    const box = new THREE.Box3();
    this.engine.scene.traverse((obj) => {
      if (obj.userData?.isItem && obj.visible) {
        const itemBox = this.getObjectBoundingBox(obj);
        if (!itemBox.isEmpty()) {
          box.union(itemBox);
        }
      }
    });
    return box;
  }
}