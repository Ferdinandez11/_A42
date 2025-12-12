// ============================================================================
// TOOLSMANAGER - Refactored (Sprint 5.5 - Phase 2)
// Orchestrator for all editor tools
// Reduced from 539 lines to ~180 lines by delegating to specialized tools
// ============================================================================

import * as THREE from "three";

import { useEditorStore } from "@/editor/stores/editor/useEditorStore";
//import { useCADStore } from "@/editor/stores/cad/useCADStore";

// Tools
import { FloorTool } from "./tools/FloorTool";
import { FenceTool } from "./tools/FenceTool";
import { CADTool } from "./tools/CADTool";
import { MeasurementTool } from "./tools/MeasurementTool";

// Markers
import { EditMarkerController } from "@/editor/engine/managers/markers/EditMarkerController";

// Types
interface Point2D {
  x: number;
  z: number;
}

/**
 * ToolsManager - Main orchestrator for all editor tools
 * Delegates functionality to specialized tool classes while maintaining
 * backward-compatible public API
 */
export class ToolsManager {
  //private scene: THREE.Scene;

  // Tool instances
  private floorTool: FloorTool;
  private fenceTool: FenceTool;
  private cadTool: CADTool;
  private measurementTool: MeasurementTool;
  private editMarkerController: EditMarkerController;

  constructor(scene: THREE.Scene) {
    //this.scene = scene;

    // Initialize all tools
    this.floorTool = new FloorTool(scene);
    this.fenceTool = new FenceTool(scene);
    this.cadTool = new CADTool(scene);
    this.measurementTool = new MeasurementTool(scene);
    this.editMarkerController = new EditMarkerController(scene);
  }

  // ==========================================================================
  // PUBLIC PROPERTIES (Backward compatibility)
  // ==========================================================================

  /**
   * Gets the current floor drawing points
   * @returns Array of floor points
   */
  public get floorPoints(): THREE.Vector3[] {
    return this.floorTool.getPoints();
  }

  /**
   * Gets the current fence drawing points
   * @returns Array of fence points
   */
  public get fencePoints(): THREE.Vector3[] {
    return this.fenceTool.getPoints();
  }

  /**
   * Gets the edit markers array
   * @returns Array of edit markers
   */
  public get floorEditMarkers(): THREE.Mesh[] {
    return this.editMarkerController.editMarkers;
  }

  /**
   * Gets the active floor ID being edited
   * @returns UUID of active floor/fence or null
   */
  public get activeFloorId(): string | null {
    return this.editMarkerController.activeItemId;
  }

  // ==========================================================================
  // CLEANUP METHODS
  // ==========================================================================

  /**
   * Clears all tools and resets state
   */
  public clearTools(): void {
    // Clear measurement tool
    this.measurementTool.reset();

    // Clear floor drawing tool
    this.floorTool.reset();

    // Clear fence drawing tool
    this.fenceTool.reset();

    // Clear CAD tool selection
    this.cadTool.reset();

    // Clear edit markers if not in editing mode
    const editor = useEditorStore.getState();
    if (editor.mode !== "editing") {
      this.clearFloorEditMarkers();
    }
  }

  /**
   * Clears floor edit markers
   */
  public clearFloorEditMarkers(): void {
    this.editMarkerController.clearEditMarkers();
  }

  // ==========================================================================
  // FLOOR DRAWING METHODS
  // ==========================================================================

  /**
   * Adds a point to the floor polygon
   * @param point - World space position
   */
  public addDraftPoint(point: THREE.Vector3): void {
    this.floorTool.addPoint(point);
  }

  /**
   * Creates a solid floor from the current points
   */
  public createSolidFloor(): void {
    this.floorTool.finalize();

    // Clear tools and return to idle mode
    const editor = useEditorStore.getState();
    this.clearTools();
    editor.setMode("idle");
  }

  // ==========================================================================
  // FENCE DRAWING METHODS
  // ==========================================================================

  /**
   * Adds a point to the fence path
   * @param point - World space position
   */
  public addFenceDraftPoint(point: THREE.Vector3): void {
    this.fenceTool.addPoint(point);
  }

  /**
   * Creates a solid fence from the current points
   */
  public createSolidFence(): void {
    this.fenceTool.finalize();

    // Clear tools and return to idle mode
    const editor = useEditorStore.getState();
    this.clearTools();
    editor.setMode("idle");
  }

  // ==========================================================================
  // EDIT MARKER METHODS
  // ==========================================================================

  /**
   * Shows edit markers for a floor or fence item
   * @param itemUuid - UUID of the item to edit
   * @param points - Array of 2D points
   */
  public showFloorEditMarkers(itemUuid: string, points: Point2D[]): void {
    this.editMarkerController.showEditMarkers(itemUuid, points);
  }

  /**
   * Synchronizes markers with the parent object's transform
   * @param parentObj - The parent object
   */
  public syncMarkersWithObject(parentObj: THREE.Object3D): void {
    this.editMarkerController.syncMarkersWithObject(parentObj);
  }

  /**
   * Updates the item when a marker is moved
   * @param marker - The marker that was moved
   */
  public updateFloorFromMarkers(marker: THREE.Object3D): void {
    this.editMarkerController.updateItemFromMarker(marker);
  }

  // ==========================================================================
  // CAD VERTEX SELECTION METHODS
  // ==========================================================================

  /**
   * Selects a vertex for CAD operations
   * @param index - Index of the vertex
   * @param multiSelect - Whether to add to selection
   */
  public selectVertex(index: number, multiSelect: boolean): void {
    this.editMarkerController.selectVertex(index, multiSelect);
  }

  /**
   * Swaps the order of two selected vertices
   */
  public swapSelectionOrder(): void {
    this.editMarkerController.swapSelectionOrder();
  }

  /**
   * Sets the length of a segment between two vertices
   * @param newLength - Target length
   * @param indexToMove - Index of vertex to move
   * @param indexAnchor - Index of fixed vertex
   */
  public setSegmentLength(
    newLength: number,
    indexToMove: number,
    indexAnchor: number
  ): void {
    this.editMarkerController.setSegmentLength(
      newLength,
      indexToMove,
      indexAnchor
    );
  }

  /**
   * Sets the angle between three vertices
   * @param targetAngleDeg - Target angle in degrees
   */
  public setVertexAngle(targetAngleDeg: number): void {
    this.editMarkerController.setVertexAngle(targetAngleDeg);
  }

  // ==========================================================================
  // MEASUREMENT TOOL METHODS
  // ==========================================================================

  /**
   * Handles a measurement click
   * @param point - World space position
   */
  public handleMeasurementClick(point: THREE.Vector3): void {
    this.measurementTool.handleClick(point);
  }
}