import { create } from "zustand";
import type {
  SceneItem,
  FenceConfig,
  FloorMaterialType,
} from "@/domain/types/editor";
import { FENCE_PRESETS } from "@/editor/data/fence_presets";

/**
 * Scene store state
 */
interface SceneState {
  // State
  items: SceneItem[];
  totalPrice: number;

  // Global fence configuration (for next fence to draw)
  fenceConfig: FenceConfig;

  // History
  past: SceneItem[][];
  future: SceneItem[][];

  // CRUD Actions
  addItem: (item: SceneItem) => void;
  removeItem: (uuid: string) => void;

  // Partial updates
  updateItemTransform: (
    uuid: string,
    position: number[],
    rotation: number[],
    scale: number[]
  ) => void;
  updateFloorMaterial: (uuid: string, material: FloorMaterialType) => void;
  updateFloorTexture: (
    uuid: string,
    url: string | undefined,
    scale: number,
    rotation: number
  ) => void;
  updateFloorPoints: (uuid: string, points: { x: number; z: number }[]) => void;
  updateFencePoints: (uuid: string, points: { x: number; z: number }[]) => void;

  // Fence configuration
  setFenceConfig: (config: Partial<FenceConfig>) => void;
  updateItemFenceConfig: (uuid: string, config: Partial<FenceConfig>) => void;

  // Scene management
  resetScene: () => void;
  setItems: (items: SceneItem[]) => void;

  // History actions
  saveSnapshot: () => void;
  undo: () => void;
  redo: () => void;
}

/**
 * Zustand store for scene data management
 * Manages scene items, pricing, fence configuration, and undo/redo history
 */
export const useSceneStore = create<SceneState>((set, get) => ({
  items: [],
  totalPrice: 0,

  fenceConfig: {
    presetId: "wood",
    colors: FENCE_PRESETS["wood"].defaultColors,
  },

  past: [],
  future: [],

  /**
   * Saves current state snapshot for undo/redo
   */
  saveSnapshot: () => {
    const snapshot = structuredClone(get().items);
    set((state) => ({
      past: [...state.past.slice(-19), snapshot], // Keep last 20 states
      future: [],
    }));
  },

  /**
   * Adds a new item to the scene
   */
  addItem: (item) => {
    get().saveSnapshot();
    set((state) => ({
      items: [...state.items, item],
      totalPrice: state.totalPrice + (item.price || 0),
    }));
  },

  /**
   * Removes an item from the scene by UUID
   */
  removeItem: (uuid) => {
    get().saveSnapshot();
    set((state) => {
      const newItems = state.items.filter((item) => item.uuid !== uuid);
      return {
        items: newItems,
        totalPrice: newItems.reduce((sum, item) => sum + item.price, 0),
      };
    });
  },

  /**
   * Updates transform (position, rotation, scale) for an item
   */
  updateItemTransform: (uuid, position, rotation, scale) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.uuid === uuid
          ? {
              ...item,
              position: position as [number, number, number],
              rotation: rotation as [number, number, number],
              scale: scale as [number, number, number],
            }
          : item
      ),
    })),

  /**
   * Updates floor material
   */
  updateFloorMaterial: (uuid, material) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.uuid === uuid && item.type === "floor"
          ? { ...item, floorMaterial: material, textureUrl: undefined }
          : item
      ),
    })),

  /**
   * Updates floor texture
   */
  updateFloorTexture: (uuid, url, scale, rotation) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.uuid === uuid && item.type === "floor"
          ? {
              ...item,
              textureUrl: url,
              textureScale: scale,
              textureRotation: rotation,
              floorMaterial: undefined,
            }
          : item
      ),
    })),

  /**
   * Updates floor polygon points
   */
  updateFloorPoints: (uuid, points) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.uuid === uuid && item.type === "floor" ? { ...item, points } : item
      ),
    }));
  },

  /**
   * Updates fence polyline points
   */
  updateFencePoints: (uuid, points) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.uuid === uuid && item.type === "fence" ? { ...item, points } : item
      ),
    }));
  },

  /**
   * Sets global fence configuration for new fences
   */
  setFenceConfig: (config) =>
    set((state) => ({
      fenceConfig: { ...state.fenceConfig, ...config },
    })),

  /**
   * Updates fence configuration for a specific item
   */
  updateItemFenceConfig: (uuid, config) => {
    get().saveSnapshot();
    set((state) => ({
      items: state.items.map((item) => {
        if (item.uuid === uuid && item.type === "fence") {
          return {
            ...item,
            fenceConfig: { ...item.fenceConfig, ...config },
          };
        }
        return item;
      }),
    }));
  },

  /**
   * Undoes the last action
   */
  undo: () => {
    const { past, items, future } = get();
    if (past.length === 0) return;

    const previous = past[past.length - 1];
    set({
      items: previous,
      past: past.slice(0, -1),
      future: [items, ...future],
      totalPrice: previous.reduce((sum, item) => sum + item.price, 0),
    });
  },

  /**
   * Redoes the last undone action
   */
  redo: () => {
    const { past, items, future } = get();
    if (future.length === 0) return;

    const next = future[0];
    set({
      items: next,
      past: [...past, items],
      future: future.slice(1),
      totalPrice: next.reduce((sum, item) => sum + item.price, 0),
    });
  },

  /**
   * Resets the entire scene
   */
  resetScene: () =>
    set({
      items: [],
      totalPrice: 0,
      past: [],
      future: [],
    }),

  /**
   * Sets all items (useful for loading projects)
   */
  setItems: (newItems) =>
    set({
      items: newItems,
      totalPrice: newItems.reduce((sum, item) => sum + item.price, 0),
      past: [],
      future: [],
    }),
}));