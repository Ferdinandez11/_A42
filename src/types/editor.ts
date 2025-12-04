// --- COMMON TYPES ---

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
  points?: { x: number; z: number }[];

  floorMaterial?: FloorMaterialType;
  textureUrl?: string;
  textureScale?: number;
  textureRotation?: number;

  fenceConfig?: FenceConfig;

  data?: any;
}

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
