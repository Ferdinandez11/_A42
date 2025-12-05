// =============================================================================
//  A42 EDITOR TYPES (STRICT)
// =============================================================================

// --- 1. PRIMITIVES ---
export type Vector3Array = [number, number, number]; // [x, y, z]
export type Point2D = { x: number; z: number };

export type FloorMaterialType =
  | "rubber_red"
  | "rubber_green"
  | "rubber_blue"
  | "grass"
  | "concrete";

export interface FenceConfig {
  presetId: string;
  colors: {
    post: number;
    slatA: number;
    slatB?: number;
    slatC?: number;
  };
}

// --- 2. BASE ITEM (Shared properties) ---
interface BaseSceneItem {
  uuid: string;
  productId: string;
  name: string; // Hacemos obligatorio el nombre (aunque sea "Sin nombre")
  price: number;

  position: Vector3Array;
  rotation: Vector3Array;
  scale: Vector3Array;

  // Metadata opcional del catálogo
  description?: string;
  url_tech?: string;
  url_cert?: string;
  url_inst?: string;
  
  // Datos crudos del catálogo (para no perder info extra)
  data?: Record<string, any>;
}

// --- 3. SPECIFIC ITEMS ---

/** Objetos 3D importados (.glb/.gltf) */
export interface ModelItem extends BaseSceneItem {
  type: "model";
  modelUrl: string; // Obligatorio para modelos
  
  // Propiedades que NO deben existir aquí:
  // points?: never;
  // fenceConfig?: never;
}

/** Suelos dibujados paramétricamente */
export interface FloorItem extends BaseSceneItem {
  type: "floor";
  points: Point2D[]; // Obligatorio para suelos
  
  floorMaterial?: FloorMaterialType;
  textureUrl?: string;
  textureScale?: number;
  textureRotation?: number;
}

/** Vallas dibujadas paramétricamente */
export interface FenceItem extends BaseSceneItem {
  type: "fence";
  points: Point2D[]; // Obligatorio para vallas
  fenceConfig: FenceConfig; // Obligatorio para vallas
}

// --- 4. THE UNION (La "SceneItem" final) ---
export type SceneItem = ModelItem | FloorItem | FenceItem;


// =============================================================================
//  EDITOR STATE TYPES
// =============================================================================

export type EditorMode =
  | "idle"
  | "editing"
  | "placing_item"
  | "drawing_floor"
  | "drawing_fence"
  | "measuring"
  | "catalog";

export type CameraView = "top" | "front" | "side" | "iso";
export type CameraType = "perspective" | "orthographic";