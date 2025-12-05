// --- FILE: src/features/editor/engine/managers/ToolsManager.ts ---
import * as THREE from "three";
import { FloorTool } from "./tools/FloorTool";
import { FenceTool } from "./tools/FenceTool";
import { CADTool } from "./tools/CADTool";
import { MeasurementTool } from "./tools/MeasurementTool";
import { PlacingTool } from "./tools/PlacingTool";
import { ObjectManager } from "./ObjectManager";

export class ToolsManager {
  public floor: FloorTool;
  public fence: FenceTool;
  public cad: CADTool;
  public measure: MeasurementTool;
  public placing: PlacingTool;

  constructor(scene: THREE.Scene, objectManager: ObjectManager) {
    this.floor = new FloorTool(scene);
    this.fence = new FenceTool(scene);
    this.cad = new CADTool(scene);
    this.measure = new MeasurementTool(scene);
    this.placing = new PlacingTool(scene, objectManager);
  }

  public clearTools() {
    this.floor.reset();
    this.fence.reset();
    this.cad.reset();
    this.measure.reset();
  }
}
