import * as THREE from "three";
import { useSceneStore } from "@/editor/stores/scene/useSceneStore";
import { useCADStore } from "@/editor/stores/cad/useCADStore";

/**
 * Edit Marker Controller
 * Manages edit markers for floor and fence items
 * Allows visual editing of polygon/polyline vertices
 * Extracted from ToolsManager.ts (Sprint 5.5 - Phase 2)
 */

interface Point2D {
  x: number;
  z: number;
}

interface MarkerUserData {
  isFloorMarker?: boolean;
  pointIndex?: number;
  parentUuid?: string;
}

export class EditMarkerController {
  private scene: THREE.Scene;
  public editMarkers: THREE.Mesh[] = [];
  public activeItemId: string | null = null;
  private selectedIndices: number[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /**
   * Shows edit markers for a floor or fence item
   * Creates visual markers at each vertex that can be moved to edit the shape
   * 
   * @param itemUuid - UUID of the item to edit
   * @param points - Array of 2D points (local coordinates)
   */
  public showEditMarkers(itemUuid: string, points: Point2D[]): void {
    this.clearEditMarkers();
    this.activeItemId = itemUuid;

    const parentObj = this.scene.getObjectByProperty("uuid", itemUuid);
    if (!parentObj) {
      // Object not found - silently return (no error needed for this case)
      return;
    }

    // Create a marker for each point
    points.forEach((point, index) => {
      const markerGeometry = new THREE.BoxGeometry(0.4, 0.4, 0.4);
      const markerMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
      const marker = new THREE.Mesh(markerGeometry, markerMaterial);

      // Convert local point to world space
      const localPos = new THREE.Vector3(point.x, 0, point.z);
      localPos.applyMatrix4(parentObj.matrixWorld);
      marker.position.copy(localPos);

      // Store metadata
      const userData: MarkerUserData = {
        isFloorMarker: true,
        pointIndex: index,
        parentUuid: itemUuid,
      };
      marker.userData = userData;

      this.scene.add(marker);
      this.editMarkers.push(marker);
    });
  }

  /**
   * Synchronizes marker positions with the parent object's transform
   * Called when the parent object is moved/rotated/scaled
   * 
   * @param parentObj - The parent object (floor or fence)
   */
  public syncMarkersWithObject(parentObj: THREE.Object3D): void {
    if (this.activeItemId !== parentObj.userData.uuid) return;

    const scene = useSceneStore.getState();
    const item = scene.items.find((i) => i.uuid === parentObj.userData.uuid);
    if (!item || (item.type !== "floor" && item.type !== "fence")) return;

    this.editMarkers.forEach((marker) => {
      const userData = marker.userData as MarkerUserData;
      const idx = userData.pointIndex;
      if (idx === undefined) return;

      const pointData = item.points[idx];
      const worldPos = new THREE.Vector3(pointData.x, 0, pointData.z);
      worldPos.applyMatrix4(parentObj.matrixWorld);
      marker.position.copy(worldPos);
    });
  }

  /**
   * Updates the item's points when a marker is moved
   * Converts marker world position back to local coordinates
   * 
   * @param marker - The marker that was moved
   */
  public updateItemFromMarker(marker: THREE.Object3D): void {
    const userData = marker.userData as MarkerUserData;
    const uuid = userData.parentUuid;
    const idx = userData.pointIndex;

    if (!uuid || idx === undefined) return;

    const parentObj = this.scene.getObjectByProperty("uuid", uuid);
    if (!parentObj) return;

    const scene = useSceneStore.getState();
    const item = scene.items.find((i) => i.uuid === uuid);

    if (item && (item.type === "floor" || item.type === "fence")) {
      // Convert world position to local coordinates
      const localPos = marker.position.clone();
      const inverseMatrix = parentObj.matrixWorld.clone().invert();
      localPos.applyMatrix4(inverseMatrix);

      const newPoints = item.points.map((p) => ({ ...p }));
      newPoints[idx] = { x: localPos.x, z: localPos.z };

      if (item.type === "floor") {
        scene.updateFloorPoints(uuid, newPoints);
      } else if (item.type === "fence") {
        scene.updateFencePoints(uuid, newPoints);
      }
    }
  }

  /**
   * Selects a vertex for CAD operations
   * Supports multi-select with Shift/Ctrl (up to 3 vertices)
   * 
   * @param index - Index of the vertex to select
   * @param multiSelect - Whether to add to selection or replace
   */
  public selectVertex(index: number, multiSelect: boolean): void {
    if (!multiSelect) {
      this.selectedIndices = [index];
    } else {
      if (this.selectedIndices.includes(index)) {
        // Deselect if already selected
        this.selectedIndices = this.selectedIndices.filter((i) => i !== index);
      } else {
        // Add to selection
        this.selectedIndices.push(index);
        // Keep only last 3 selections
        if (this.selectedIndices.length > 3) {
          this.selectedIndices.shift();
        }
      }
    }

    this.updateMarkerColors();
    this.calculateAndSyncData();
  }

  /**
   * Swaps the order of two selected vertices
   * Useful for changing the reference direction in angle calculations
   */
  public swapSelectionOrder(): void {
    if (this.selectedIndices.length === 2) {
      this.selectedIndices.reverse();
      this.updateMarkerColors();
      this.calculateAndSyncData();
    }
  }

  /**
   * Updates marker colors based on selection state
   * Blue (first), Red (second), Yellow (third), Green (unselected)
   */
  private updateMarkerColors(): void {
    this.editMarkers.forEach((m) => {
      const userData = m.userData as MarkerUserData;
      const idx = userData.pointIndex;
      if (idx === undefined) return;

      const mat = m.material as THREE.MeshBasicMaterial;
      let color = 0x00ff00; // Green (default)

      const posInArray = this.selectedIndices.indexOf(idx);
      if (posInArray === 0) color = 0x3b82f6; // Blue (first)
      if (posInArray === 1) color = 0xff0000; // Red (second)
      if (posInArray === 2) color = 0xffff00; // Yellow (third)

      mat.color.setHex(color);
    });
  }

  /**
   * Calculates distance and angle from selected vertices
   * Updates the CAD store with the results
   */
  private calculateAndSyncData(): void {
    let dist: number | null = null;
    let angle: number | null = null;

    // Calculate distance between first two points
    if (this.selectedIndices.length >= 2) {
      const m0 = this.getMarker(this.selectedIndices[0]);
      const m1 = this.getMarker(this.selectedIndices[1]);
      if (m0 && m1) {
        dist = m0.position.distanceTo(m1.position);
      }
    }

    // Calculate angle with three points (pivot is second point)
    if (this.selectedIndices.length === 3) {
      const pRef = this.getMarker(this.selectedIndices[0])?.position;
      const pPiv = this.getMarker(this.selectedIndices[1])?.position;
      const pMov = this.getMarker(this.selectedIndices[2])?.position;

      if (pRef && pPiv && pMov) {
        const v1 = new THREE.Vector3().subVectors(pRef, pPiv).normalize();
        const v2 = new THREE.Vector3().subVectors(pMov, pPiv).normalize();
        const angleRad = v1.angleTo(v2);
        angle = THREE.MathUtils.radToDeg(angleRad);
      }
    }

    useCADStore.getState().setSelectedVertices(
      [...this.selectedIndices],
      dist,
      angle
    );
  }

  /**
   * Gets a marker by its point index
   * @param index - Point index to find
   * @returns The marker or undefined
   */
  private getMarker(index: number): THREE.Mesh | undefined {
    return this.editMarkers.find((m) => {
      const userData = m.userData as MarkerUserData;
      return userData.pointIndex === index;
    });
  }

  /**
   * Sets the length of a segment by moving one vertex
   * @param newLength - Target length in meters
   * @param indexToMove - Index of the vertex to move
   * @param indexAnchor - Index of the fixed vertex
   */
  public setSegmentLength(
    newLength: number,
    indexToMove: number,
    indexAnchor: number
  ): void {
    const markerMove = this.getMarker(indexToMove);
    const markerAnchor = this.getMarker(indexAnchor);

    if (!markerMove || !markerAnchor) return;

    const direction = new THREE.Vector3()
      .subVectors(markerMove.position, markerAnchor.position)
      .normalize();

    const newPos = markerAnchor.position
      .clone()
      .add(direction.multiplyScalar(newLength));

    markerMove.position.copy(newPos);
    this.updateItemFromMarker(markerMove);
    this.calculateAndSyncData();
  }

  /**
   * Sets the angle between three selected vertices
   * Rotates the third vertex around the second (pivot)
   * 
   * @param targetAngleDeg - Target angle in degrees
   */
  public setVertexAngle(targetAngleDeg: number): void {
    if (this.selectedIndices.length !== 3) return;

    const idxRef = this.selectedIndices[0];
    const idxPiv = this.selectedIndices[1];
    const idxMov = this.selectedIndices[2];

    const mRef = this.getMarker(idxRef);
    const mPiv = this.getMarker(idxPiv);
    const mMov = this.getMarker(idxMov);

    if (!mRef || !mPiv || !mMov) return;

    // Calculate reference angle
    const vecRef = new THREE.Vector3().subVectors(
      mRef.position,
      mPiv.position
    );
    const angleRef = Math.atan2(vecRef.z, vecRef.x);

    // Calculate new position
    const distMov = mPiv.position.distanceTo(mMov.position);
    const targetAngleRad = THREE.MathUtils.degToRad(targetAngleDeg);
    const newAngleAbs = angleRef + targetAngleRad;

    const newX = mPiv.position.x + distMov * Math.cos(newAngleAbs);
    const newZ = mPiv.position.z + distMov * Math.sin(newAngleAbs);

    mMov.position.set(newX, 0, newZ);
    this.updateItemFromMarker(mMov);
    this.calculateAndSyncData();
  }

  /**
   * Clears all edit markers and resets state
   */
  public clearEditMarkers(): void {
    this.editMarkers.forEach((m) => this.scene.remove(m));
    this.editMarkers = [];
    this.selectedIndices = [];
    this.activeItemId = null;
    useCADStore.getState().setSelectedVertices([], null, null);
  }

  /**
   * Gets the currently selected vertex indices
   * @returns Array of selected indices
   */
  public getSelectedIndices(): number[] {
    return [...this.selectedIndices];
  }
}