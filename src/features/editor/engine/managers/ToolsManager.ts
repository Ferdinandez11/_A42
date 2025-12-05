// --- FILE: src/features/editor/engine/managers/ToolsManager.ts ---
import type * as THREE from "three";
import type { ObjectManager } from "./ObjectManager";

import { FloorTool } from "./tools/FloorTool";
import { FenceTool } from "./tools/FenceTool";
import { CADTool } from "./tools/CADTool";

export class ToolsManager {
  public floorTool: FloorTool;
  public fenceTool: FenceTool;
  public cadTool: CADTool;

  constructor(scene: THREE.Scene, objectManager: ObjectManager) {
    this.floorTool = new FloorTool(scene);
    this.fenceTool = new FenceTool(scene);
    this.cadTool = new CADTool(scene);
  }

  public clearTools() {
    this.floorTool.reset();
    this.fenceTool.reset();
    this.cadTool.reset();
  }
}
