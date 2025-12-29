// ============================================================================
// EDITOR TYPE SCHEMAS - Zod validation schemas
// Runtime validation for editor types
// ============================================================================

import { z } from 'zod';
import type { 
  SceneItem, 
  FenceConfig, 
  ModelItem, 
  FloorItem, 
  FenceItem,
  Vector3Array,
  Point2D,
  ColorHex,
  CameraType,
} from './editor';

// ============================================================================
// PRIMITIVE SCHEMAS
// ============================================================================

/**
 * Vector3Array schema: [x, y, z]
 */
export const Vector3ArraySchema = z.tuple([z.number(), z.number(), z.number()]);

/**
 * Point2D schema: { x: number, z: number }
 */
export const Point2DSchema = z.object({
  x: z.number(),
  z: z.number(),
});

/**
 * ColorHex schema: number (0xRRGGBB)
 */
export const ColorHexSchema = z.number().int().min(0).max(0xffffff);

/**
 * CameraType schema
 */
export const CameraTypeSchema = z.enum(['perspective', 'orthographic']);

// ============================================================================
// MATERIAL SCHEMAS
// ============================================================================

/**
 * FloorMaterialType schema
 */
export const FloorMaterialTypeSchema = z.enum([
  'rubber_red',
  'rubber_green',
  'rubber_blue',
  'grass',
  'concrete',
]);

/**
 * MaterialProperties schema
 */
export const MaterialPropertiesSchema = z.object({
  color: ColorHexSchema.optional(),
  roughness: z.number().min(0).max(1).optional(),
  metallic: z.number().min(0).max(1).optional(),
  opacity: z.number().min(0).max(1).optional(),
  textureUrl: z.string().url().optional(),
  normalMapUrl: z.string().url().optional(),
}).passthrough(); // Allow additional properties

// ============================================================================
// FENCE CONFIGURATION SCHEMAS
// ============================================================================

/**
 * FenceColorConfig schema
 */
export const FenceColorConfigSchema = z.object({
  post: ColorHexSchema,
  slatA: ColorHexSchema,
  slatB: ColorHexSchema.optional(),
  slatC: ColorHexSchema.optional(),
});

/**
 * FenceConfig schema
 */
export const FenceConfigSchema = z.object({
  presetId: z.string(),
  colors: FenceColorConfigSchema,
  height: z.number().positive().optional(),
  postSpacing: z.number().positive().optional(),
  slatWidth: z.number().positive().optional(),
}).passthrough(); // Allow additional properties

// ============================================================================
// SCENE ITEM SCHEMAS
// ============================================================================

/**
 * BaseSceneItem schema (shared properties)
 */
const BaseSceneItemSchema = z.object({
  uuid: z.string().uuid(),
  productId: z.string(),
  name: z.string(),
  price: z.number().min(0),
  position: Vector3ArraySchema,
  rotation: Vector3ArraySchema,
  scale: Vector3ArraySchema,
  description: z.string().optional(),
  url_tech: z.string().url().optional(),
  url_cert: z.string().url().optional(),
  url_inst: z.string().url().optional(),
  data: z.record(z.unknown()).optional(),
}).passthrough();

/**
 * ModelItem schema
 */
export const ModelItemSchema = BaseSceneItemSchema.extend({
  type: z.literal('model'),
  modelUrl: z.string().url(),
  materialOverride: MaterialPropertiesSchema.optional(),
  castShadow: z.boolean().optional(),
  receiveShadow: z.boolean().optional(),
});

/**
 * FloorItem schema
 */
export const FloorItemSchema = BaseSceneItemSchema.extend({
  type: z.literal('floor'),
  points: z.array(Point2DSchema).min(3), // At least 3 points for a polygon
  floorMaterial: FloorMaterialTypeSchema.optional(),
  textureUrl: z.string().url().optional(),
  textureScale: z.number().positive().optional(),
  textureRotation: z.number().optional(),
  thickness: z.number().positive().optional(),
  elevated: z.boolean().optional(),
  elevationHeight: z.number().optional(),
});

/**
 * FenceItem schema
 */
export const FenceItemSchema = BaseSceneItemSchema.extend({
  type: z.literal('fence'),
  points: z.array(Point2DSchema).min(2), // At least 2 points for a path
  fenceConfig: FenceConfigSchema,
  hasGates: z.boolean().optional(),
  gatePositions: z.array(z.number().int().min(0)).optional(),
});

/**
 * SceneItem schema (discriminated union)
 */
export const SceneItemSchema: z.ZodType<SceneItem> = z.discriminatedUnion('type', [
  ModelItemSchema,
  FloorItemSchema,
  FenceItemSchema,
]);

// ============================================================================
// PROJECT DATA SCHEMA
// ============================================================================

/**
 * ProjectData schema - Main schema for project data validation
 */
export const ProjectDataSchema = z.object({
  items: z.array(SceneItemSchema).default([]),
  fenceConfig: FenceConfigSchema.default({
    presetId: 'wood',
    colors: { post: 0, slatA: 0 },
  }),
  camera: CameraTypeSchema.default('perspective'),
}).passthrough(); // Allow additional properties for backward compatibility

/**
 * Infer TypeScript type from schema
 */
export type ValidatedProjectData = z.infer<typeof ProjectDataSchema>;

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates and normalizes ProjectData
 * @param data - Raw data from database
 * @returns Validated ProjectData or throws ZodError
 */
export function validateProjectData(data: unknown): ValidatedProjectData {
  // If data is null or undefined, return default structure
  if (data === null || data === undefined) {
    return ProjectDataSchema.parse({});
  }

  // If data is an empty object, return default structure
  if (typeof data === 'object' && Object.keys(data).length === 0) {
    return ProjectDataSchema.parse({});
  }

  // Validate and parse
  return ProjectDataSchema.parse(data);
}

/**
 * Safely validates ProjectData, returns null if invalid
 * @param data - Raw data from database
 * @returns Validated ProjectData or null if invalid
 */
export function safeValidateProjectData(data: unknown): ValidatedProjectData | null {
  const result = ProjectDataSchema.safeParse(data);
  return result.success ? result.data : null;
}

/**
 * Validates a single SceneItem
 * @param item - Raw item data
 * @returns Validated SceneItem or throws ZodError
 */
export function validateSceneItem(item: unknown): SceneItem {
  return SceneItemSchema.parse(item);
}

/**
 * Safely validates a SceneItem
 * @param item - Raw item data
 * @returns Validated SceneItem or null if invalid
 */
export function safeValidateSceneItem(item: unknown): SceneItem | null {
  const result = SceneItemSchema.safeParse(item);
  return result.success ? result.data : null;
}

