// --- START OF FILE src/features/editor/engine/managers/ToolsManager.ts ---
import * as THREE from 'three';
import { useAppStore } from '../../../../stores/useAppStore';

export class ToolsManager {
  private scene: THREE.Scene;

  // Floor Tools
  public floorPoints: THREE.Vector3[] = [];
  private floorMarkers: THREE.Mesh[] = [];
  private previewLine: THREE.Line | null = null;
  public floorEditMarkers: THREE.Mesh[] = [];
  public activeFloorId: string | null = null;

  // Measure Tools
  private measurePoints: THREE.Vector3[] = [];
  private measureLine: THREE.Line | null = null;
  private measureMarkers: THREE.Mesh[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public clearTools() {
    this.measureMarkers.forEach(m => this.scene.remove(m));
    this.measureMarkers = [];
    if (this.measureLine) { this.scene.remove(this.measureLine); this.measureLine = null; }
    this.measurePoints = [];
    
    this.floorMarkers.forEach(m => this.scene.remove(m));
    this.floorMarkers = [];
    if (this.previewLine) { this.scene.remove(this.previewLine); this.previewLine = null; }
    this.floorPoints = [];

    if (useAppStore.getState().mode !== 'editing') {
        this.clearFloorEditMarkers();
        this.activeFloorId = null;
    }
  }

  // --- Drawing Floor Logic ---
  public addDraftPoint(point: THREE.Vector3) {
    const p = point.clone();
    p.y = 0.05; 
    if (this.floorPoints.length > 0 && p.distanceTo(this.floorPoints[this.floorPoints.length - 1]) < 0.1) return;
    
    this.floorPoints.push(p);
    const marker = new THREE.Mesh(new THREE.SphereGeometry(0.15), new THREE.MeshBasicMaterial({ color: 0xe67e22 }));
    marker.position.copy(p);
    this.scene.add(marker);
    this.floorMarkers.push(marker);

    if (this.previewLine) this.scene.remove(this.previewLine);
    if (this.floorPoints.length > 1) {
      const geometry = new THREE.BufferGeometry().setFromPoints(this.floorPoints);
      this.previewLine = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0x9b59b6 }));
      this.scene.add(this.previewLine);
    }
  }

  public createSolidFloor() {
    if (this.floorPoints.length < 3) return;
    const points2D = this.floorPoints.map(p => ({ x: p.x, z: p.z }));
    useAppStore.getState().addItem({
      uuid: THREE.MathUtils.generateUUID(),
      productId: 'custom_floor',
      name: 'Suelo a medida',
      price: 100,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      type: 'floor',
      points: points2D,
      floorMaterial: 'rubber_red'
    });
    this.clearTools();
    useAppStore.getState().setMode('idle');
  }

  // --- Edit Floor Markers ---
  public showFloorEditMarkers(itemUuid: string, points: {x:number, z:number}[]) {
    this.clearFloorEditMarkers();
    this.activeFloorId = itemUuid;
    points.forEach((pt, index) => {
        const marker = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.6 }));
        marker.position.set(pt.x, 0.0, pt.z);
        marker.userData.isFloorMarker = true;
        marker.userData.pointIndex = index;
        marker.userData.parentUuid = itemUuid;
        this.scene.add(marker);
        this.floorEditMarkers.push(marker);
    });
  }

  public clearFloorEditMarkers() {
    this.floorEditMarkers.forEach(m => this.scene.remove(m));
    this.floorEditMarkers = [];
  }

  public updateFloorFromMarkers(marker: THREE.Object3D) {
    const uuid = marker.userData.parentUuid;
    const idx = marker.userData.pointIndex;
    const items = useAppStore.getState().items;
    const floorItem = items.find(i => i.uuid === uuid);
    if (floorItem && floorItem.points) {
        const newPoints = floorItem.points.map(p => ({...p}));
        newPoints[idx] = { x: marker.position.x, z: marker.position.z };
        useAppStore.getState().updateFloorPoints(uuid, newPoints);
    }
  }

  // --- Measuring ---
  public handleMeasurementClick(point: THREE.Vector3) {
    const p = point.clone();
    p.y += 0.05;
    this.measurePoints.push(p);
    const marker = new THREE.Mesh(new THREE.SphereGeometry(0.1), new THREE.MeshBasicMaterial({ color: 0xffff00, depthTest: false, transparent: true }));
    marker.position.copy(p);
    this.scene.add(marker);
    this.measureMarkers.push(marker);

    if (this.measurePoints.length === 2) {
        const dist = this.measurePoints[0].distanceTo(this.measurePoints[1]);
        const material = new THREE.LineBasicMaterial({ color: 0xffff00, linewidth: 2, depthTest: false });
        const geometry = new THREE.BufferGeometry().setFromPoints(this.measurePoints);
        this.measureLine = new THREE.Line(geometry, material);
        this.scene.add(this.measureLine);
        useAppStore.getState().setMeasurementResult(dist);
    } else if (this.measurePoints.length > 2) {
        this.clearTools(); 
        this.handleMeasurementClick(point);
    }
  }
}