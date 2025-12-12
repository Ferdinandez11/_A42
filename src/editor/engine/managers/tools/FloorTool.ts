import * as THREE from "three";
import { useSceneStore } from "@/editor/stores/scene/useSceneStore";
import type { FloorItem } from "@/domain/types/editor";

/**
 * Tool for creating floor polygons by placing points
 * Extended in Sprint 5.5 - Phase 2 with public accessors for ToolsManager compatibility
 */
export class FloorTool {
  private scene: THREE.Scene;
  private points: THREE.Vector3[] = [];
  private markers: THREE.Mesh[] = [];
  private previewLine: THREE.Line | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /**
   * Resets the tool state, removing all markers and preview line
   */
  public reset(): void {
    this.markers.forEach((marker) => this.scene.remove(marker));
    this.markers = [];

    if (this.previewLine) {
      this.scene.remove(this.previewLine);
    }
    this.previewLine = null;

    this.points = [];
  }

  /**
   * Adds a point to the floor polygon
   * @param world - World space position for the new point
   */
  public addPoint(world: THREE.Vector3): void {
    const point = world.clone();
    point.y = 0;

    // Avoid duplicate points that are too close
    if (
      this.points.length > 0 &&
      point.distanceTo(this.points[this.points.length - 1]) < 0.1
    ) {
      return;
    }

    this.points.push(point);

    // Create visual marker
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.12),
      new THREE.MeshBasicMaterial({ color: 0xe67e22 })
    );

    marker.position.copy(point);
    this.scene.add(marker);
    this.markers.push(marker);

    // Update preview line
    if (this.previewLine) {
      this.scene.remove(this.previewLine);
    }

    if (this.points.length > 1) {
      const geometry = new THREE.BufferGeometry().setFromPoints(this.points);
      this.previewLine = new THREE.Line(
        geometry,
        new THREE.LineBasicMaterial({ color: 0x9b59b6 })
      );
      this.scene.add(this.previewLine);
    }
  }

  /**
   * Creates a floor item from the current points
   */
  public createFloor(): void {
    if (this.points.length < 3) return;

    const uuid = THREE.MathUtils.generateUUID();
    const boundingBox = new THREE.Box3().setFromPoints(this.points);
    const center = boundingBox.getCenter(new THREE.Vector3());

    // Convert to local coordinates relative to center
    const localPoints = this.points.map((p) => ({
      x: p.x - center.x,
      z: p.z - center.z,
    }));

    const item: FloorItem = {
      uuid,
      productId: "custom_floor",
      name: "Suelo",
      type: "floor",
      price: 100,
      points: localPoints,
      floorMaterial: "rubber_red",
      position: [center.x, 0, center.z],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    };

    useSceneStore.getState().addItem(item);
    this.reset();
  }

  /**
   * Finalizes the floor creation
   */
  public finalize(): void {
    this.createFloor();
  }

  // ========================================================================
  // PUBLIC ACCESSORS - Added in Phase 2 for ToolsManager compatibility
  // ========================================================================

  /**
   * Gets the current points array
   * Used by ToolsManager to maintain backward compatibility
   * @returns Copy of the points array
   */
  public getPoints(): THREE.Vector3[] {
    return [...this.points];
  }

  /**
   * Gets the current markers array
   * Used by ToolsManager to maintain backward compatibility
   * @returns Copy of the markers array
   */
  public getMarkers(): THREE.Mesh[] {
    return [...this.markers];
  }

  /**
   * Checks if the tool has any points
   * @returns True if at least one point has been placed
   */
  public hasPoints(): boolean {
    return this.points.length > 0;
  }

  /**
   * Gets the number of points currently placed
   * @returns Number of points
   */
  public getPointCount(): number {
    return this.points.length;
  }

  /**
   * Checks if the floor can be created (needs at least 3 points)
   * @returns True if floor can be finalized
   */
  public canFinalize(): boolean {
    return this.points.length >= 3;
  }
}