// ============================================================================
// A42 EDITOR TYPE DEFINITIONS
// Comprehensive type system for the 3D editor
// ============================================================================

// ============================================================================
// PRIMITIVE TYPES
// Basic geometric and color types
// ============================================================================

/**
 * 3D vector represented as a tuple [x, y, z]
 * Used for positions, rotations (in radians), and scale
 */
export type Vector3Array = [number, number, number];

/**
 * 2D point in the XZ plane (top-down view)
 * Used for floor and fence vertices
 */
export interface Point2D {
  x: number;
  z: number;
}

/**
 * RGB color represented as a hex number
 * Example: 0xff0000 for red
 */
export type ColorHex = number;

/**
 * RGBA color with alpha channel
 */
export interface ColorRGBA {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
  a: number; // 0-1
}

// ============================================================================
// MATERIAL TYPES
// Surface materials for floors and objects
// ============================================================================

/**
 * Available floor material presets
 */
export type FloorMaterialType =
  | 'rubber_red'
  | 'rubber_green'
  | 'rubber_blue'
  | 'grass'
  | 'concrete';

/**
 * Material properties for custom surfaces
 */
export interface MaterialProperties {
  /** Base color */
  color?: ColorHex;
  
  /** Roughness factor (0 = smooth, 1 = rough) */
  roughness?: number;
  
  /** Metallic factor (0 = dielectric, 1 = metal) */
  metallic?: number;
  
  /** Opacity (0 = transparent, 1 = opaque) */
  opacity?: number;
  
  /** Texture map URL */
  textureUrl?: string;
  
  /** Normal map URL for surface detail */
  normalMapUrl?: string;
}

// ============================================================================
// FENCE CONFIGURATION
// Configuration for parametric fence generation
// ============================================================================

/**
 * Color configuration for fence components
 */
export interface FenceColorConfig {
  /** Post/pillar color */
  post: ColorHex;
  
  /** Primary slat color */
  slatA: ColorHex;
  
  /** Secondary slat color (optional) */
  slatB?: ColorHex;
  
  /** Tertiary slat color (optional) */
  slatC?: ColorHex;
}

/**
 * Complete fence configuration
 */
export interface FenceConfig {
  /** Preset identifier for fence style */
  presetId: string;
  
  /** Color configuration for components */
  colors: FenceColorConfig;
  
  /** Height of the fence in meters */
  height?: number;
  
  /** Spacing between posts in meters */
  postSpacing?: number;
  
  /** Width of slats in meters */
  slatWidth?: number;
}

// ============================================================================
// BASE SCENE ITEM
// Shared properties for all scene objects
// ============================================================================

/**
 * Base properties shared by all scene items
 */
interface BaseSceneItem {
  // Identity
  /** Unique identifier for the item */
  uuid: string;
  
  /** Reference to catalog product (if applicable) */
  productId: string;
  
  /** Display name of the item */
  name: string;
  
  /** Price in euros */
  price: number;
  
  // Transform
  /** Position in 3D space [x, y, z] */
  position: Vector3Array;
  
  /** Rotation in radians [x, y, z] */
  rotation: Vector3Array;
  
  /** Scale factors [x, y, z] */
  scale: Vector3Array;
  
  // Catalog metadata (optional)
  /** Product description from catalog */
  description?: string;
  
  /** URL to technical specification */
  url_tech?: string;
  
  /** URL to certification documents */
  url_cert?: string;
  
  /** URL to installation instructions */
  url_inst?: string;
  
  // Raw catalog data
  /** Additional data from catalog (flexible storage) */
  data?: Record<string, any>;
}

// ============================================================================
// SPECIFIC ITEM TYPES
// Concrete implementations for different object types
// ============================================================================

/**
 * 3D model imported from GLB/GLTF file
 */
export interface ModelItem extends BaseSceneItem {
  type: 'model';
  
  /** URL to the 3D model file */
  modelUrl: string;
  
  /** Optional material override */
  materialOverride?: MaterialProperties;
  
  /** Whether the model casts shadows */
  castShadow?: boolean;
  
  /** Whether the model receives shadows */
  receiveShadow?: boolean;
}

/**
 * Parametric floor drawn by user
 */
export interface FloorItem extends BaseSceneItem {
  type: 'floor';
  
  /** Vertices defining the floor polygon */
  points: Point2D[];
  
  /** Material preset */
  floorMaterial?: FloorMaterialType;
  
  /** Custom texture URL */
  textureUrl?: string;
  
  /** Texture scale factor */
  textureScale?: number;
  
  /** Texture rotation in degrees */
  textureRotation?: number;
  
  /** Floor thickness in meters */
  thickness?: number;
  
  /** Whether the floor is elevated */
  elevated?: boolean;
  
  /** Elevation height if elevated */
  elevationHeight?: number;
}

/**
 * Parametric fence drawn by user
 */
export interface FenceItem extends BaseSceneItem {
  type: 'fence';
  
  /** Vertices defining the fence path */
  points: Point2D[];
  
  /** Fence style and color configuration */
  fenceConfig: FenceConfig;
  
  /** Whether fence has gates */
  hasGates?: boolean;
  
  /** Gate positions (indices in points array) */
  gatePositions?: number[];
}

// ============================================================================
// SCENE ITEM UNION
// Discriminated union of all item types
// ============================================================================

/**
 * Union type representing any scene item
 * Use type guards to narrow to specific types
 */
export type SceneItem = ModelItem | FloorItem | FenceItem;

// ============================================================================
// EDITOR STATE TYPES
// State management for editor modes and views
// ============================================================================

/**
 * Current editor mode
 */
export type EditorMode =
  | 'idle'           // Default state, selection enabled
  | 'editing'        // Editing selected item with gizmo
  | 'placing_item'   // Placing new item from catalog
  | 'drawing_floor'  // Drawing floor polygon
  | 'drawing_fence'  // Drawing fence path
  | 'measuring'      // Measurement tool active
  | 'catalog';       // Catalog panel open

/**
 * Camera view presets
 */
export type CameraView = 
  | 'top'    // Plan view (looking down)
  | 'front'  // Front elevation
  | 'side'   // Side elevation
  | 'iso';   // Isometric view

/**
 * Camera projection type
 */
export type CameraType = 
  | 'perspective'   // Realistic perspective
  | 'orthographic'; // Parallel projection (CAD-like)

/**
 * Gizmo transformation mode
 */
export type GizmoMode = 
  | 'translate'  // Move objects
  | 'rotate'     // Rotate objects
  | 'scale';     // Scale objects

/**
 * Grid configuration
 */
export interface GridConfig {
  /** Whether grid is visible */
  visible: boolean;
  
  /** Size of grid squares in meters */
  size: number;
  
  /** Number of divisions */
  divisions: number;
  
  /** Primary grid line color */
  colorPrimary: ColorHex;
  
  /** Secondary grid line color */
  colorSecondary: ColorHex;
}

/**
 * Sun/lighting configuration
 */
export interface SunConfig {
  /** Azimuth angle in degrees (0-360) */
  azimuth: number;
  
  /** Elevation angle in degrees (0-90) */
  elevation: number;
  
  /** Light intensity (0-2) */
  intensity: number;
  
  /** Light color */
  color: ColorHex;
  
  /** Whether shadows are enabled */
  castShadows: boolean;
}

// ============================================================================
// TYPE GUARDS
// Runtime type checking for discriminated unions
// ============================================================================

/**
 * Type guard for ModelItem
 */
export const isModelItem = (item: SceneItem): item is ModelItem => {
  return item.type === 'model';
};

/**
 * Type guard for FloorItem
 */
export const isFloorItem = (item: SceneItem): item is FloorItem => {
  return item.type === 'floor';
};

/**
 * Type guard for FenceItem
 */
export const isFenceItem = (item: SceneItem): item is FenceItem => {
  return item.type === 'fence';
};

/**
 * Type guard for items with points (Floor or Fence)
 */
export const hasPoints = (item: SceneItem): item is FloorItem | FenceItem => {
  return 'points' in item && Array.isArray(item.points);
};

// ============================================================================
// UTILITY TYPES
// Helper types for common operations
// ============================================================================

/**
 * Partial transform (for updates)
 */
export type PartialTransform = {
  position?: Partial<Vector3Array>;
  rotation?: Partial<Vector3Array>;
  scale?: Partial<Vector3Array>;
};

/**
 * Scene item without UUID (for creation)
 */
export type NewSceneItem = Omit<SceneItem, 'uuid'>;

/**
 * Read-only scene item
 */
export type ReadOnlySceneItem = Readonly<SceneItem>;

/**
 * Scene item summary (for lists)
 */
export type SceneItemSummary = Pick<
  SceneItem,
  'uuid' | 'type' | 'name' | 'price'
>;

// ============================================================================
// PROJECT DATA TYPE
// ============================================================================

/**
 * Project data structure stored in database
 * This type is now validated using Zod schemas (see editor.schema.ts)
 * Use ValidatedProjectData from editor.schema.ts for validated data
 */
export interface ProjectData {
  items: SceneItem[];
  fenceConfig: FenceConfig;
  camera: CameraType;
}

// Re-export validated type from schema
export type { ValidatedProjectData } from './editor.schema';