// --- START OF FILE src/features/editor/engine/managers/ToolsManager.ts ---
import * as THREE from "three";

import { useEditorStore } from "@/stores/editor/useEditorStore";
import { useCADStore } from "@/stores/cad/useCADStore";
import { useFenceStore } from "@/stores/fence/useFenceStore";
import type { FloorItem, FenceItem } from "@/types/editor"; // Importamos los tipos

export class ToolsManager {
  private scene: THREE.Scene;

  // Floor Tools
  public floorPoints: THREE.Vector3[] = [];
  private floorMarkers: THREE.Mesh[] = [];
  private previewLine: THREE.Line | null = null;
  public floorEditMarkers: THREE.Mesh[] = [];
  public activeFloorId: string | null = null;

  // FENCE TOOLS
  public fencePoints: THREE.Vector3[] = [];
  private fenceMarkers: THREE.Mesh[] = [];
  private fencePreviewLine: THREE.Line | null = null;

  // CAD Selection
  private selectedMarkerIndices: number[] = [];

  // Measure Tools
  private measurePoints: THREE.Vector3[] = [];
  private measureLine: THREE.Line | null = null;
  private measureMarkers: THREE.Mesh[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public clearTools() {
    this.measureMarkers.forEach((m) => this.scene.remove(m));
    this.measureMarkers = [];
    if (this.measureLine) {
      this.scene.remove(this.measureLine);
      this.measureLine = null;
    }
    this.measurePoints = [];

    this.floorMarkers.forEach((m) => this.scene.remove(m));
    this.floorMarkers = [];
    if (this.previewLine) {
      this.scene.remove(this.previewLine);
      this.previewLine = null;
    }
    this.floorPoints = [];

    this.fenceMarkers.forEach((m) => this.scene.remove(m));
    this.fenceMarkers = [];
    if (this.fencePreviewLine) {
      this.scene.remove(this.fencePreviewLine);
      this.fencePreviewLine = null;
    }
    this.fencePoints = [];

    this.selectedMarkerIndices = [];
    useCADStore.getState().setSelectedVertices([], null, null);

    const editor = useEditorStore.getState();
    if (editor.mode !== "editing") {
      this.clearFloorEditMarkers();
      this.activeFloorId = null;
    }
  }

  // ---------------------------------------------------------------------------
  // DRAWING FLOOR
  // ---------------------------------------------------------------------------
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

    const editor = useEditorStore.getState();
    const uuid = THREE.MathUtils.generateUUID();

    // 1. Calcular Centro
    const box = new THREE.Box3().setFromPoints(this.floorPoints);
    const center = new THREE.Vector3();
    box.getCenter(center);
    center.y = 0;

    // 2. Puntos Relativos
    const localPoints = this.floorPoints.map((p) => ({ 
      x: p.x - center.x, 
      z: p.z - center.z 
    }));

    // 🔥 CREACIÓN ESTRICTA DEL OBJETO (FloorItem)
    const newFloor: FloorItem = {
      uuid,
      productId: "custom_floor",
      name: "Suelo a medida",
      price: 100,
      
      type: "floor", // Type Guard
      points: localPoints,
      floorMaterial: "rubber_red",

      position: [center.x, 0, center.z], 
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    };

    editor.addItem(newFloor);

    this.clearTools();
    editor.setMode("idle");
  }

  // ---------------------------------------------------------------------------
  // DRAWING FENCE
  // ---------------------------------------------------------------------------
  public addFenceDraftPoint(point: THREE.Vector3) {
    const p = point.clone();
    p.y = 0;
    if (this.fencePoints.length > 0 && p.distanceTo(this.fencePoints[this.fencePoints.length - 1]) < 0.1) return;
    this.fencePoints.push(p);
    const marker = new THREE.Mesh(new THREE.SphereGeometry(0.15), new THREE.MeshBasicMaterial({ color: 0x3b82f6 }));
    marker.position.copy(p);
    this.scene.add(marker);
    this.fenceMarkers.push(marker);
    if (this.fencePreviewLine) this.scene.remove(this.fencePreviewLine);
    if (this.fencePoints.length > 1) {
      const geometry = new THREE.BufferGeometry().setFromPoints(this.fencePoints);
      this.fencePreviewLine = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0x3b82f6, linewidth: 2 }));
      this.scene.add(this.fencePreviewLine);
    }
  }

  public createSolidFence() {
    if (this.fencePoints.length < 2) return;

    const fenceStore = useFenceStore.getState();
    const editor = useEditorStore.getState();
    const currentConfig = fenceStore.config;

    // 1. Calcular Centro
    const box = new THREE.Box3().setFromPoints(this.fencePoints);
    const center = new THREE.Vector3();
    box.getCenter(center);
    center.y = 0;

    // 2. Puntos Relativos
    const points2D = this.fencePoints.map((p) => ({ 
      x: p.x - center.x, 
      z: p.z - center.z 
    }));

    const uuid = THREE.MathUtils.generateUUID();

    // 🔥 CREACIÓN ESTRICTA DEL OBJETO (FenceItem)
    const newFence: FenceItem = {
      uuid,
      productId: "fence_" + currentConfig.presetId,
      name: "Valla",
      price: 100,
      
      type: "fence",
      points: points2D,
      fenceConfig: JSON.parse(JSON.stringify(currentConfig)),

      position: [center.x, 0, center.z], 
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    };

    editor.addItem(newFence);

    this.clearTools();
    editor.setMode("idle");
  }

  // ---------------------------------------------------------------------------
  // EDIT MARKERS
  // ---------------------------------------------------------------------------

  public clearFloorEditMarkers() {
    this.floorEditMarkers.forEach((m) => this.scene.remove(m));
    this.floorEditMarkers = [];
    this.selectedMarkerIndices = [];
    useCADStore.getState().setSelectedVertices([], null, null);
  }

  public showFloorEditMarkers(itemUuid: string, points: { x: number; z: number }[]) {
    this.clearFloorEditMarkers();
    this.activeFloorId = itemUuid;

    const parentObj = this.scene.getObjectByProperty('uuid', itemUuid);
    if (!parentObj) return;

    parentObj.updateMatrixWorld(true);

    points.forEach((pt, index) => {
      const marker = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.4, 0.4),
        new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.8 })
      );

      // Local -> World
      const localPos = new THREE.Vector3(pt.x, 0, pt.z);
      localPos.applyMatrix4(parentObj.matrixWorld);

      marker.position.copy(localPos);
      
      marker.userData.isFloorMarker = true;
      marker.userData.pointIndex = index;
      marker.userData.parentUuid = itemUuid;
      
      this.scene.add(marker);
      this.floorEditMarkers.push(marker);
    });
  }

  public syncMarkersWithObject(parentObj: THREE.Object3D) {
    if (this.activeFloorId !== parentObj.userData.uuid) return;

    const editor = useEditorStore.getState();
    const item = editor.items.find(i => i.uuid === parentObj.userData.uuid);
    
    // Type Guard para asegurar que tiene puntos
    if (!item || (item.type !== 'floor' && item.type !== 'fence')) return;

    this.floorEditMarkers.forEach(marker => {
      const idx = marker.userData.pointIndex;
      const pointData = item.points[idx]; 

      const worldPos = new THREE.Vector3(pointData.x, 0, pointData.z);
      worldPos.applyMatrix4(parentObj.matrixWorld);

      marker.position.copy(worldPos);
    });
  }

  public updateFloorFromMarkers(marker: THREE.Object3D) {
    const uuid = marker.userData.parentUuid;
    const idx = marker.userData.pointIndex;

    const parentObj = this.scene.getObjectByProperty('uuid', uuid);
    if (!parentObj) return;

    const editor = useEditorStore.getState();
    const items = editor.items;
    const item = items.find((i) => i.uuid === uuid);

    // Type Guard
    if (item && (item.type === 'floor' || item.type === 'fence')) {
      const localPos = marker.position.clone();
      const inverseMatrix = parentObj.matrixWorld.clone().invert();
      localPos.applyMatrix4(inverseMatrix);

      const newPoints = item.points.map((p) => ({ ...p }));
      newPoints[idx] = { x: localPos.x, z: localPos.z };
      
      if (item.type === 'floor') {
        editor.updateFloorPoints(uuid, newPoints);
      } else if (item.type === 'fence') {
        editor.updateFencePoints(uuid, newPoints);
      }
    }
  }

  // --- CAD Logic ---

  public selectVertex(index: number, multiSelect: boolean) {
    if (!multiSelect) {
      this.selectedMarkerIndices = [index];
    } else {
      if (this.selectedMarkerIndices.includes(index)) {
        this.selectedMarkerIndices = this.selectedMarkerIndices.filter((i) => i !== index);
      } else {
        this.selectedMarkerIndices.push(index);
        if (this.selectedMarkerIndices.length > 3) this.selectedMarkerIndices.shift();
      }
    }
    this.updateMarkerColors();
    this.calculateAndSyncData();
  }

  public swapSelectionOrder() {
    if (this.selectedMarkerIndices.length === 2) {
      this.selectedMarkerIndices.reverse();
      this.updateMarkerColors();
      this.calculateAndSyncData();
    }
  }

  private updateMarkerColors() {
    this.floorEditMarkers.forEach((m) => {
      const idx = m.userData.pointIndex;
      const mat = m.material as THREE.MeshBasicMaterial;
      let color = 0x00ff00;
      const posInArray = this.selectedMarkerIndices.indexOf(idx);
      if (posInArray === 0) color = 0x3b82f6;
      if (posInArray === 1) color = 0xff0000;
      if (posInArray === 2) color = 0xffff00;
      mat.color.setHex(color);
    });
  }

  private calculateAndSyncData() {
    let dist: number | null = null;
    let angle: number | null = null;
    if (this.selectedMarkerIndices.length >= 2) {
      const m0 = this.getMarker(this.selectedMarkerIndices[0]);
      const m1 = this.getMarker(this.selectedMarkerIndices[1]);
      if (m0 && m1) dist = m0.position.distanceTo(m1.position);
    }
    if (this.selectedMarkerIndices.length === 3) {
      const pRef = this.getMarker(this.selectedMarkerIndices[0])?.position;
      const pPiv = this.getMarker(this.selectedMarkerIndices[1])?.position;
      const pMov = this.getMarker(this.selectedMarkerIndices[2])?.position;
      if (pRef && pPiv && pMov) {
        const v1 = new THREE.Vector3().subVectors(pRef, pPiv).normalize();
        const v2 = new THREE.Vector3().subVectors(pMov, pPiv).normalize();
        const angleRad = v1.angleTo(v2);
        angle = THREE.MathUtils.radToDeg(angleRad);
      }
    }
    useCADStore.getState().setSelectedVertices([...this.selectedMarkerIndices], dist, angle);
  }

  private getMarker(index: number) {
    return this.floorEditMarkers.find((m) => m.userData.pointIndex === index);
  }

  public setSegmentLength(newLength: number, indexToMove: number, indexAnchor: number) {
    const markerMove = this.getMarker(indexToMove);
    const markerAnchor = this.getMarker(indexAnchor);
    if (!markerMove || !markerAnchor) return;
    const direction = new THREE.Vector3().subVectors(markerMove.position, markerAnchor.position).normalize();
    const newPos = markerAnchor.position.clone().add(direction.multiplyScalar(newLength));
    markerMove.position.copy(newPos);
    this.updateFloorFromMarkers(markerMove);
    this.calculateAndSyncData();
  }

  public setVertexAngle(targetAngleDeg: number) {
    if (this.selectedMarkerIndices.length !== 3) return;
    const idxRef = this.selectedMarkerIndices[0];
    const idxPiv = this.selectedMarkerIndices[1];
    const idxMov = this.selectedMarkerIndices[2];
    const mRef = this.getMarker(idxRef);
    const mPiv = this.getMarker(idxPiv);
    const mMov = this.getMarker(idxMov);
    if (!mRef || !mPiv || !mMov) return;
    const vecRef = new THREE.Vector3().subVectors(mRef.position, mPiv.position);
    const angleRef = Math.atan2(vecRef.z, vecRef.x);
    const distMov = mPiv.position.distanceTo(mMov.position);
    const targetAngleRad = THREE.MathUtils.degToRad(targetAngleDeg);
    const newAngleAbs = angleRef + targetAngleRad;
    const newX = mPiv.position.x + distMov * Math.cos(newAngleAbs);
    const newZ = mPiv.position.z + distMov * Math.sin(newAngleAbs);
    mMov.position.set(newX, 0, newZ);
    this.updateFloorFromMarkers(mMov);
    this.calculateAndSyncData();
  }

  public handleMeasurementClick(point: THREE.Vector3) {
    const p = point.clone();
    p.y += 0.05;
    this.measurePoints.push(p);
    const marker = new THREE.Mesh(new THREE.SphereGeometry(0.1), new THREE.MeshBasicMaterial({ color: 0xffff00, depthTest: false, transparent: true }));
    marker.position.copy(p);
    this.scene.add(marker);
    this.measureMarkers.push(marker);
    const editor = useEditorStore.getState();
    if (this.measurePoints.length === 2) {
      const dist = this.measurePoints[0].distanceTo(this.measurePoints[1]);
      const material = new THREE.LineBasicMaterial({ color: 0xffff00, linewidth: 2, depthTest: false });
      const geometry = new THREE.BufferGeometry().setFromPoints(this.measurePoints);
      this.measureLine = new THREE.Line(geometry, material);
      this.scene.add(this.measureLine);
      editor.setMeasurementResult(dist);
    } else if (this.measurePoints.length > 2) {
      this.clearTools();
      this.handleMeasurementClick(point);
    }
  }
}
// --- END OF FILE src/features/editor/engine/managers/ToolsManager.ts ---