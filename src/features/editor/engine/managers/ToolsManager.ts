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
  
  // CAD Selection State
  // [0]: Referencia, [1]: Pivote, [2]: Móvil
  private selectedMarkerIndices: number[] = [];

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

    this.selectedMarkerIndices = [];
    useAppStore.getState().setSelectedVertices([], null, null);

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
        const marker = new THREE.Mesh(
            new THREE.BoxGeometry(0.4, 0.4, 0.4), 
            new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.8 })
        );
        marker.position.set(pt.x, 0.0, pt.z);
        marker.userData.isFloorMarker = true;
        marker.userData.pointIndex = index;
        marker.userData.parentUuid = itemUuid;
        this.scene.add(marker);
        this.floorEditMarkers.push(marker);
    });
  }

  // --- LOGICA DE SELECCIÓN Y COLORES CAD ---
  public selectVertex(index: number, multiSelect: boolean) {
      if (!multiSelect) {
          this.selectedMarkerIndices = [index];
      } else {
          // Toggle
          if (this.selectedMarkerIndices.includes(index)) {
              this.selectedMarkerIndices = this.selectedMarkerIndices.filter(i => i !== index);
          } else {
              this.selectedMarkerIndices.push(index);
              // AHORA PERMITIMOS HASTA 3 PUNTOS (Para Ángulos)
              if (this.selectedMarkerIndices.length > 3) this.selectedMarkerIndices.shift(); 
          }
      }

      this.updateMarkerColors();
      this.calculateAndSyncData();
  }

  public swapSelectionOrder() {
      // Invertir [0] y [1] en modo distancia
      if (this.selectedMarkerIndices.length === 2) {
          this.selectedMarkerIndices.reverse(); 
          this.updateMarkerColors();
          this.calculateAndSyncData();
      }
      // En modo ángulo (3 puntos) podríamos rotarlos, 
      // pero es más complejo de visualizar. Dejémoslo para 2 puntos por ahora.
  }

  private updateMarkerColors() {
      this.floorEditMarkers.forEach(m => {
          const idx = m.userData.pointIndex;
          const mat = m.material as THREE.MeshBasicMaterial;

          let color = 0x00ff00; // Verde (Normal)

          const posInArray = this.selectedMarkerIndices.indexOf(idx);
          
          if (posInArray === 0) color = 0x3b82f6; // [0] AZUL (Ref / Leg 1)
          if (posInArray === 1) color = 0xff0000; // [1] ROJO (Pivote / Esquina)
          if (posInArray === 2) color = 0xffff00; // [2] AMARILLO (Móvil / Leg 2)

          mat.color.setHex(color);
      });
  }

  private calculateAndSyncData() {
      let dist: number | null = null;
      let angle: number | null = null;

      // MODO DISTANCIA (2 PUNTOS)
      if (this.selectedMarkerIndices.length >= 2) {
          const m0 = this.getMarker(this.selectedMarkerIndices[0]);
          const m1 = this.getMarker(this.selectedMarkerIndices[1]);
          if(m0 && m1) dist = m0.position.distanceTo(m1.position);
      }

      // MODO ÁNGULO (3 PUNTOS)
      if (this.selectedMarkerIndices.length === 3) {
          const pRef = this.getMarker(this.selectedMarkerIndices[0])?.position;
          const pPiv = this.getMarker(this.selectedMarkerIndices[1])?.position;
          const pMov = this.getMarker(this.selectedMarkerIndices[2])?.position;

          if (pRef && pPiv && pMov) {
              // Vectores desde el pivote
              const v1 = new THREE.Vector3().subVectors(pRef, pPiv).normalize();
              const v2 = new THREE.Vector3().subVectors(pMov, pPiv).normalize();
              
              // Ángulo no firmado (0 a 180)
              const angleRad = v1.angleTo(v2);
              angle = THREE.MathUtils.radToDeg(angleRad);
          }
      }

      useAppStore.getState().setSelectedVertices([...this.selectedMarkerIndices], dist, angle);
  }

  private getMarker(index: number) {
      return this.floorEditMarkers.find(m => m.userData.pointIndex === index);
  }

  // --- PARAMETRIZACIÓN DISTANCIA ---
  public setSegmentLength(newLength: number, indexToMove: number, indexAnchor: number) {
      const markerMove = this.getMarker(indexToMove);
      const markerAnchor = this.getMarker(indexAnchor);

      if (!markerMove || !markerAnchor) return;

      const direction = new THREE.Vector3()
          .subVectors(markerMove.position, markerAnchor.position)
          .normalize();
      
      const newPos = markerAnchor.position.clone().add(direction.multiplyScalar(newLength));

      markerMove.position.copy(newPos);
      this.updateFloorFromMarkers(markerMove);
      this.calculateAndSyncData();
  }

  // --- PARAMETRIZACIÓN ÁNGULO (NUEVO) ---
  public setVertexAngle(targetAngleDeg: number) {
      if (this.selectedMarkerIndices.length !== 3) return;

      const idxRef = this.selectedMarkerIndices[0];
      const idxPiv = this.selectedMarkerIndices[1];
      const idxMov = this.selectedMarkerIndices[2];

      const mRef = this.getMarker(idxRef);
      const mPiv = this.getMarker(idxPiv);
      const mMov = this.getMarker(idxMov);

      if (!mRef || !mPiv || !mMov) return;

      // 1. Calcular ángulo actual del vector Referencia (Pivot -> Ref)
      const vecRef = new THREE.Vector3().subVectors(mRef.position, mPiv.position);
      const angleRef = Math.atan2(vecRef.z, vecRef.x);

      // 2. Calcular distancia actual del brazo móvil (para no cambiar su longitud, solo rotar)
      const distMov = mPiv.position.distanceTo(mMov.position);

      // 3. Calcular nuevo ángulo objetivo
      // NOTA: Math.atan2 es sentido antihorario.
      // Queremos que el nuevo vector esté a (angleRef + targetAngle)
      // Probamos sumar. Si se comporta raro, restamos. En 2D suele ser relativo.
      const targetAngleRad = THREE.MathUtils.degToRad(targetAngleDeg);
      
      // Aplicamos rotación relativa al vector de referencia
      // Ojo: Esto asume un sentido.
      
      // Enfoque más robusto para UX:
      // Usamos el producto cruz para saber "a qué lado" está actualmente y mantenemos el lado.
      // Pero para simplificar: Asumimos rotación positiva (CCW) desde la referencia.
      
      const newAngleAbs = angleRef + targetAngleRad;

      // 4. Calcular nueva posición (Polar a Cartesiana)
      const newX = mPiv.position.x + distMov * Math.cos(newAngleAbs);
      const newZ = mPiv.position.z + distMov * Math.sin(newAngleAbs);

      mMov.position.set(newX, 0, newZ); // Y=0 siempre en suelo

      this.updateFloorFromMarkers(mMov);
      this.calculateAndSyncData();
  }

  public clearFloorEditMarkers() {
    this.floorEditMarkers.forEach(m => this.scene.remove(m));
    this.floorEditMarkers = [];
    this.selectedMarkerIndices = [];
    useAppStore.getState().setSelectedVertices([], null, null);
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

  public handleMeasurementClick(point: THREE.Vector3) {
      // (Mismo código de siempre para medir...)
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
// --- END OF FILE src/features/editor/engine/managers/ToolsManager.ts ---