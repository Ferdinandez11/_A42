import * as THREE from "three";
import { useCADStore } from "@/editor/stores/cad/useCADStore";

/**
 * CAD Tool for vertex selection and measurement
 * Manages visual markers and calculates distances/angles between points
 */
export class CADTool {
  private scene: THREE.Scene;
  private markers: THREE.Mesh[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /**
   * Resets all markers and clears selection
   */
  public reset(): void {
    this.markers.forEach((marker) => this.scene.remove(marker));
    this.markers = [];

    useCADStore.getState().setSelectedVertices([], null, null);
  }

  /**
   * Creates visual markers at specified world positions
   * @param itemUuid - UUID of the item (unused but kept for future use)
   * @param worldPositions - Array of 3D positions for markers
   */
  public setMarkers(itemUuid: string, worldPositions: THREE.Vector3[]): void {
    void itemUuid; // Prevents unused variable warning

    this.reset();

    worldPositions.forEach((pos, index) => {
      const marker = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.4, 0.4),
        new THREE.MeshBasicMaterial({ color: 0x00ff00 })
      );
      marker.position.copy(pos);
      marker.userData.pointIndex = index;
      this.scene.add(marker);
      this.markers.push(marker);
    });
  }

  /**
   * Updates distance and angle measurements based on selected vertices
   * - 2 vertices: calculates distance
   * - 3 vertices: calculates distance and angle
   */
  public updateDistances(): void {
    const store = useCADStore.getState();
    const indices = store.selectedVertices;

    let distance: number | null = null;
    let angle: number | null = null;

    // Calculate distance between first two points
    if (indices.length >= 2) {
      const markerA = this.getMarker(indices[0]);
      const markerB = this.getMarker(indices[1]);
      if (markerA && markerB) {
        distance = markerA.position.distanceTo(markerB.position);
      }
    }

    // Calculate angle between three points
    if (indices.length === 3) {
      const p0 = this.getMarker(indices[0])?.position;
      const p1 = this.getMarker(indices[1])?.position;
      const p2 = this.getMarker(indices[2])?.position;

      if (p0 && p1 && p2) {
        const v1 = new THREE.Vector3().subVectors(p0, p1).normalize();
        const v2 = new THREE.Vector3().subVectors(p2, p1).normalize();
        angle = THREE.MathUtils.radToDeg(v1.angleTo(v2));
      }
    }

    store.setSelectedVertices([...indices], distance, angle);
  }

  /**
   * Gets a marker by its index
   * @param idx - Index of the marker to retrieve
   * @returns The marker mesh or undefined
   */
  private getMarker(idx: number): THREE.Mesh | undefined {
    return this.markers.find((m) => m.userData.pointIndex === idx);
  }
}