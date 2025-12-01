// --- START OF FILE src/features/editor/engine/managers/InteractionManager.ts ---
import * as THREE from 'three';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { useAppStore } from '../../../../stores/useAppStore';
import type { A42Engine } from '../A42Engine';

export class InteractionManager {
  private engine: A42Engine;
  public transformControl: TransformControls | null = null; 
  private raycaster: THREE.Raycaster;
  private pointer: THREE.Vector2;
  private interactionPlane: THREE.Mesh; 
  public isDraggingGizmo = false;

  constructor(engine: A42Engine) {
    this.engine = engine;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    
    this.interactionPlane = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), new THREE.MeshBasicMaterial({ visible: false })); 
    this.interactionPlane.rotation.x = -Math.PI / 2; 
    this.engine.scene.add(this.interactionPlane);

    this.initTransformControls();
  }

  private initTransformControls() {
    try {
        this.transformControl = new TransformControls(this.engine.activeCamera, this.engine.renderer.domElement);
        this.transformControl.rotationSnap = Math.PI / 12;
        this.engine.scene.add(this.transformControl);
        
        this.transformControl.addEventListener('dragging-changed', (event:any) => {
          this.isDraggingGizmo = event.value;
          this.engine.sceneManager.controls.enabled = !event.value;
          
          if (event.value) {
            useAppStore.getState().saveSnapshot();
          } else {
            const obj = this.transformControl?.object;
            if (obj) {
                if (obj.userData.isFloorMarker) {
                    this.engine.toolsManager.updateFloorFromMarkers(obj);
                } else if (obj.userData.isItem) {
                    this.engine.objectManager.adjustObjectToGround(obj);
                    this.syncTransformToStore(obj);
                }
            }
          }
        });
        
        this.transformControl.addEventListener('objectChange', () => {
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

  public updateCamera(camera: THREE.Camera) {
      if(this.transformControl) this.transformControl.camera = camera;
  }

  public onMouseDown = (event: MouseEvent) => {
    if (this.transformControl && this.isDraggingGizmo) return;
    
    const rect = this.engine.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.engine.activeCamera);

    const store = useAppStore.getState();
    const mode = store.mode;

    // --- DRAWING FLOOR ---
    if (mode === 'drawing_floor') {
      const intersects = this.raycaster.intersectObject(this.interactionPlane);
      if (intersects.length > 0) {
        if (event.button === 0) this.engine.toolsManager.addDraftPoint(intersects[0].point);
        else if (event.button === 2) { 
             if (this.engine.toolsManager.floorPoints.length >= 3) this.engine.toolsManager.createSolidFloor(); 
        }
      }
      return;
    }

    // --- DRAWING FENCE ---
    if (mode === 'drawing_fence') {
        const intersects = this.raycaster.intersectObject(this.interactionPlane);
        if (intersects.length > 0) {
          if (event.button === 0) this.engine.toolsManager.addFenceDraftPoint(intersects[0].point);
          else if (event.button === 2) { 
               this.engine.toolsManager.createSolidFence(); 
          }
        }
        return;
    }

    // --- MEASURING ---
    if (mode === 'measuring') {
        const intersects = this.raycaster.intersectObjects(this.engine.scene.children, true);
        const hit = intersects.find(i => i.object.visible && (i.object.userData.isItem || i.object === this.interactionPlane));
        if (hit) this.engine.toolsManager.handleMeasurementClick(hit.point);
        else {
            const planeIntersect = this.raycaster.intersectObject(this.interactionPlane);
            if (planeIntersect.length > 0) this.engine.toolsManager.handleMeasurementClick(planeIntersect[0].point);
        }
        return;
    }

    // --- PLACING ITEM ---
    if (mode === 'placing_item' && store.selectedProduct) {
      if (event.button !== 0) return;
      const intersects = this.raycaster.intersectObject(this.interactionPlane);
      if (intersects.length > 0) {
          this.engine.objectManager.placeObject(intersects[0].point.x, intersects[0].point.z, store.selectedProduct, (_uuid) => {
             // Optional callback
          });
          useAppStore.getState().setMode('idle');
      }
      return;
    }

    // --- SELECTING / EDITING ---
    if (mode === 'idle' || mode === 'editing') {
      if (event.button !== 0) return;

      // 1. Check Floor Markers (Vertices)
      if (this.engine.toolsManager.floorEditMarkers.length > 0) {
          const markerIntersects = this.raycaster.intersectObjects(this.engine.toolsManager.floorEditMarkers);
          if (markerIntersects.length > 0) {
              const hitMarker = markerIntersects[0].object;
              const pointIndex = hitMarker.userData.pointIndex;

              // Shift/Ctrl Click for Multi-Selection
              if (event.shiftKey || event.ctrlKey) {
                  this.engine.toolsManager.selectVertex(pointIndex, true);
                  if (this.transformControl) this.transformControl.detach(); // Hide Gizmo
                  return; 
              }

              // Normal Click
              if (this.transformControl) {
                  this.engine.toolsManager.selectVertex(pointIndex, false); 
                  this.transformControl.attach(hitMarker);
                  this.transformControl.setMode('translate');
                  this.transformControl.visible = true;
              }
              return;
          }
      }

      // 2. Check Scene Items
      const interactables = this.engine.scene.children.filter(obj => obj.userData?.isItem && obj !== this.transformControl);
      const intersects = this.raycaster.intersectObjects(interactables, true);

      if (intersects.length > 0) {
        let target: THREE.Object3D | null = intersects[0].object;
        while (target && !target.userData?.isItem && target.parent && target.parent !== this.engine.scene) target = target.parent;

        if (target && target.userData?.isItem) {
            this.selectObject(target);
            
            // --- CORRECCIÓN AQUÍ: Detectamos si es Floor O Fence ---
            if (target.userData.type === 'floor' || target.userData.type === 'fence') {
                const item = store.items.find(i => i.uuid === target!.uuid);
                // Ambos usan 'points', así que reutilizamos la herramienta de marcadores
                if (item && item.points) this.engine.toolsManager.showFloorEditMarkers(target.uuid, item.points);
            } else {
                this.engine.toolsManager.clearFloorEditMarkers();
                this.engine.toolsManager.activeFloorId = null;
            }
        }
      } else {
        // Deselect if clicking empty space
        if (this.transformControl?.object && !this.engine.toolsManager.floorEditMarkers.includes(this.transformControl.object as THREE.Mesh)) {
            this.selectObject(null);
            this.engine.toolsManager.activeFloorId = null;
            this.engine.toolsManager.clearFloorEditMarkers();
        }
      }
    }
  }

  public selectObject(object: THREE.Object3D | null) {
    if (!this.transformControl) { useAppStore.getState().selectItem(null); return; }
    
    if (object && this.transformControl.object?.uuid === object.uuid) {
        if (useAppStore.getState().selectedItemId !== object.uuid) useAppStore.getState().selectItem(object.uuid);
        return;
    }
    
    if (this.transformControl.object) { 
        this.transformControl.detach(); 
        this.transformControl.visible = false; 
        this.engine.sceneManager.controls.enabled = true; 
    }
    
    if (!object) { 
        useAppStore.getState().selectItem(null); 
        return; 
    }
    
    this.transformControl.attach(object);
    this.transformControl.visible = true;
    useAppStore.getState().selectItem(object.uuid);
  }

  private syncTransformToStore(obj: THREE.Object3D) {
    if (this.transformControl?.object?.uuid === obj.uuid && obj.userData.isItem) {
      useAppStore.getState().updateItemTransform(
        obj.uuid, [obj.position.x, obj.position.y, obj.position.z],
        [obj.rotation.x, obj.rotation.y, obj.rotation.z], [obj.scale.x, obj.scale.y, obj.scale.z]
      );
    }
  }

  public setGizmoMode(mode: 'translate' | 'rotate' | 'scale') { 
      if (this.transformControl) this.transformControl.setMode(mode); 
  }
}
// --- END OF FILE src/features/editor/engine/managers/InteractionManager.ts ---