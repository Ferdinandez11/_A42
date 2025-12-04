// ===============================
//  SHARED EDITOR TYPES
// ===============================

// ---- Scene Item Types ----
export type FloorMaterialType =
  | "rubber_red"
  | "rubber_green"
  | "rubber_blue"
  | "grass"
  | "concrete";

export interface FenceConfig {
  presetId: string;
  colors: { post: number; slatA: number; slatB?: number; slatC?: number };
}

export interface SceneItem {
  uuid: string;
  productId: string;
  name?: string;
  price: number;

  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];

  type: "model" | "floor" | "fence";

  modelUrl?: string;
  url_tech?: string;
  url_cert?: string;
  url_inst?: string;
  description?: string;
  
  // floor
  points?: { x: number; z: number }[];
  floorMaterial?: FloorMaterialType;
  textureUrl?: string;
  textureScale?: number;
  textureRotation?: number;

  fenceConfig?: FenceConfig;

  // misc data
  data?: any;
}

// ---- Editor State Types ----

export type EditorMode =
  | "idle"
  | "editing"
  | "placing_item"
  | "drawing_floor"
  | "drawing_fence"
  | "measuring";

export type CameraView = "top" | "front" | "side" | "iso";
export type CameraType = "perspective" | "orthographic";

