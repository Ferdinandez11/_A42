// --- FILE: src/features/editor/engine/managers/ToolsManager.ts ---
import type { ObjectManager } from "./ObjectManager";
import type * as THREE from "three";

import { FloorTool } from "./tools/FloorTool";
import { FenceTool } from "./tools/FenceTool";
import { CADTool } from "./tools/CADTool";

export class ToolsManager {
  public floorTool: FloorTool;
  public fenceTool: FenceTool;
  public cadTool: CADTool;

  constructor(scene: THREE.Scene, objectManager: ObjectManager) {
    // ObjectManager ya no lo usamos aquí, pero lo mantenemos por si lo necesitas en el futuro
    this.floorTool = new FloorTool(scene);
    this.fenceTool = new FenceTool(scene);
    this.cadTool = new CADTool(scene);
  }

  /** Limpia todos los tools activos */
  public clearTools() {
    this.floorTool.reset();
    this.fenceTool.reset();
    this.cadTool.reset();
  }
}
