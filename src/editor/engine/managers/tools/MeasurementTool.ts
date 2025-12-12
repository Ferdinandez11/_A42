import * as THREE from "three";
import { useEditorStore } from "@/editor/stores/editor/useEditorStore";

/**
 * Measurement Tool
 * Tool for measuring distances between two points in the scene
 * Extracted from ToolsManager.ts (Sprint 5.5 - Phase 2)
 */
export class MeasurementTool {
  private scene: THREE.Scene;
  private measurePoints: THREE.Vector3[] = [];
  private measureMarkers: THREE.Mesh[] = [];
  private measureLine: THREE.Line | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /**
   * Handles a measurement click
   * First click: sets point A
   * Second click: sets point B and calculates distance
   * Third click: resets and starts new measurement
   * 
   * @param point - World space position clicked
   */
  public handleClick(point: THREE.Vector3): void {
    const p = point.clone();
    p.y += 0.05; // Slightly above ground for visibility

    this.measurePoints.push(p);

    // Create visual marker
    const markerGeometry = new THREE.SphereGeometry(0.1);
    const markerMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      depthTest: false,
      transparent: true,
    });
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.position.copy(p);
    this.scene.add(marker);
    this.measureMarkers.push(marker);

    const editor = useEditorStore.getState();

    if (this.measurePoints.length === 2) {
      // Calculate distance and create line
      const dist = this.measurePoints[0].distanceTo(this.measurePoints[1]);

      const material = new THREE.LineBasicMaterial({
        color: 0xffff00,
        linewidth: 2,
        depthTest: false,
      });
      const geometry = new THREE.BufferGeometry().setFromPoints(
        this.measurePoints
      );
      this.measureLine = new THREE.Line(geometry, material);
      this.scene.add(this.measureLine);

      editor.setMeasurementResult(dist);
    } else if (this.measurePoints.length > 2) {
      // Reset and start new measurement
      this.reset();
      this.handleClick(point);
    }
  }

  /**
   * Resets the measurement tool state
   * Removes all markers and lines from the scene
   */
  public reset(): void {
    // Remove markers
    this.measureMarkers.forEach((m) => this.scene.remove(m));
    this.measureMarkers = [];

    // Remove line
    if (this.measureLine) {
      this.scene.remove(this.measureLine);
      this.measureLine = null;
    }

    // Clear points
    this.measurePoints = [];

    // Clear measurement result in store
    const editor = useEditorStore.getState();
    editor.setMeasurementResult(null);
  }

  /**
   * Gets the current measurement points
   * @returns Array of measurement points
   */
  public getPoints(): THREE.Vector3[] {
    return [...this.measurePoints];
  }

  /**
   * Checks if measurement is in progress
   * @returns True if at least one point has been placed
   */
  public isActive(): boolean {
    return this.measurePoints.length > 0;
  }

  /**
   * Gets the current distance if two points are set
   * @returns Distance in meters or null
   */
  public getDistance(): number | null {
    if (this.measurePoints.length === 2) {
      return this.measurePoints[0].distanceTo(this.measurePoints[1]);
    }
    return null;
  }
}