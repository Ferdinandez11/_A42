// --- START OF FILE src/features/editor/engine/A42Engine.ts ---
import * as THREE from 'three';
import { useAppStore } from '../../../stores/useAppStore';
import type { SceneItem, CameraView } from '../../../stores/useAppStore';

import { SceneManager } from './managers/SceneManager';
import { ObjectManager } from './managers/ObjectManager';
import { ToolsManager } from './managers/ToolsManager';
import { InteractionManager } from './managers/InteractionManager';

export class A42Engine {
  public sceneManager: SceneManager;
  public objectManager: ObjectManager;
  public toolsManager: ToolsManager;
  public interactionManager: InteractionManager;

  private animationId: number | null = null;

  constructor(container: HTMLElement) {
    this.sceneManager = new SceneManager(container);
    this.objectManager = new ObjectManager(this.sceneManager.scene);
    this.toolsManager = new ToolsManager(this.sceneManager.scene);
    this.interactionManager = new InteractionManager(this);

    window.addEventListener('resize', this.onWindowResize);
    window.addEventListener('keydown', this.onKeyDown);
    
    // @ts-ignore
    window.editorEngine = this;
  }

  public get scene() { return this.sceneManager.scene; }
  public get activeCamera() { return this.sceneManager.activeCamera; }
  public get renderer() { return this.sceneManager.renderer; }

  public onMouseDown = (event: MouseEvent) => {
      this.interactionManager.onMouseDown(event);
  }

  public setBackgroundColor(color: string) { this.sceneManager.setBackgroundColor(color); }
  public setSkyVisible(visible: boolean) { this.sceneManager.setSkyVisible(visible); }
  public setGridVisible(v: boolean) { this.sceneManager.setGridVisible(v); }
  public updateSunPosition(azimuth: number, elevation: number) { this.sceneManager.updateSunPosition(azimuth, elevation); }
  
  public switchCamera(type: 'perspective' | 'orthographic') { 
      this.sceneManager.switchCamera(type);
      this.interactionManager.updateCamera(this.sceneManager.activeCamera);
  }
  public setView(view: CameraView) { this.sceneManager.setView(view); }

  public clearTools() { 
      this.toolsManager.clearTools();
      if (this.interactionManager.transformControl) this.interactionManager.transformControl.detach();
  }

  public setGizmoMode(mode: 'translate' | 'rotate' | 'scale') { this.interactionManager.setGizmoMode(mode); }

  public async syncSceneFromStore(storeItems: SceneItem[]) {
    const sceneItemsMap = new Map<string, THREE.Object3D>();
    this.scene.children.forEach(child => {
      if (child.userData?.isItem && child.uuid) sceneItemsMap.set(child.uuid, child);
    });

    for (const item of storeItems) {
      const sceneObj = sceneItemsMap.get(item.uuid);
      if (sceneObj) {
        // --- SUELO ---
        if (item.type === 'floor') {
            const hasChanged = 
                JSON.stringify(sceneObj.userData.points) !== JSON.stringify(item.points) ||
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
        
        // --- VALLA (NUEVO CONTROL DE CAMBIOS) ---
        if (item.type === 'fence') {
             const hasConfigChanged = JSON.stringify(sceneObj.userData.fenceConfig) !== JSON.stringify(item.fenceConfig);
             const hasPointsChanged = JSON.stringify(sceneObj.userData.points) !== JSON.stringify(item.points);

             if (hasConfigChanged || hasPointsChanged) {
                 this.scene.remove(sceneObj);
                 this.objectManager.recreateFence(item);
                 sceneItemsMap.delete(item.uuid);
                 continue;
             }
        }

        sceneObj.position.fromArray(item.position);
        sceneObj.rotation.fromArray(item.rotation);
        sceneObj.scale.fromArray(item.scale);
        sceneItemsMap.delete(item.uuid);
      } else {
        // CREAR NUEVOS
        if (item.type === 'model' && item.modelUrl) await this.objectManager.recreateModel(item);
        else if (item.type === 'floor' && item.points) this.objectManager.recreateFloor(item);
        else if (item.type === 'fence' && item.points) this.objectManager.recreateFence(item);
      }
    }

    for (const [uuid, obj] of sceneItemsMap) {
      this.scene.remove(obj);
      if (this.interactionManager.transformControl?.object?.uuid === uuid) this.interactionManager.transformControl.detach();
      if (this.toolsManager.activeFloorId === uuid) { 
          this.toolsManager.activeFloorId = null; 
          this.toolsManager.clearFloorEditMarkers(); 
      }
    }
  }

  private onKeyDown = (e: KeyboardEvent) => {
      if (useAppStore.getState().mode !== 'editing') return;
      if (e.key === 'z' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); useAppStore.getState().undo(); return; }
      
      const tc = this.interactionManager.transformControl;
      if (!tc?.visible) return;
      
      if (e.key === 't') tc.setMode('translate');
      else if (e.key === 'r') tc.setMode('rotate');
      else if (e.key === 'e') tc.setMode('scale');
      else if (e.key === 'Delete' || e.key === 'Backspace') { 
          const obj = tc.object;
          if (obj && !obj.userData.isFloorMarker) { 
            tc.detach(); tc.visible = false; 
            this.scene.remove(obj); 
            this.sceneManager.controls.enabled = true; 
            useAppStore.getState().removeItem(obj.uuid); 
            useAppStore.getState().selectItem(null); 
            this.toolsManager.activeFloorId = null; 
            this.toolsManager.clearFloorEditMarkers();
          }
      }
  }

  private onWindowResize = () => {
      this.sceneManager.onWindowResize();
  }

  public init() { this.animate(); }
  
  private animate = () => { 
      this.animationId = requestAnimationFrame(this.animate); 
      this.sceneManager.controls.update(); 
      this.sceneManager.renderer.render(this.scene, this.activeCamera); 
  }

  public dispose() {
      if (this.animationId) cancelAnimationFrame(this.animationId);
      window.removeEventListener('keydown', this.onKeyDown); 
      window.removeEventListener('resize', this.onWindowResize);
      this.sceneManager.dispose();
  }
}
// --- END OF FILE src/features/editor/engine/A42Engine.ts ---