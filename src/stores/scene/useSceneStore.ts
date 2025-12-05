// --- FILE: src/stores/scene/useSceneStore.ts ---
import { create } from "zustand";
import type { Vector3Array } from "@/types/editor";

export interface SceneItem {
  uuid: string;
  productId: string;
  name: string;

  price: number;

  position: Vector3Array;
  rotation: Vector3Array;
  scale: Vector3Array;

  description?: string;
  url_tech?: string;
  url_cert?: string;
  url_inst?: string;

  data?: any;

  type?: "model" | "floor" | "fence";
  info?: string;

  // ⭐ FENCE SUPPORT
  fenceConfig?: {
    presetId: string;
    colors: {
      post: number;
      slatA: number;
      slatB?: number;
      slatC?: number;
    };
  };

  // ⭐ FLOOR SUPPORT
  floorMaterial?: string;
  textureUrl?: string;
  textureScale?: number;
  textureRotation?: number;
}

interface SceneState {
  items: SceneItem[];
  totalPrice: number;

  past: SceneItem[][];
  future: SceneItem[][];
  undo: () => void;
  redo: () => void;

  addItem: (item: SceneItem) => void;
  updateItem: (uuid: string, partial: Partial<SceneItem>) => void;
  removeItem: (uuid: string) => void;

  updateItemFenceConfig: (uuid: string, cfg: any) => void;

  updateFloorMaterial: (uuid: string, material: string) => void;
  updateFloorTexture: (
    uuid: string,
    url?: string,
    scale?: number,
    rotation?: number
  ) => void;

  clearScene: () => void;
  resetScene: () => void;

  setItemTransform: (
    uuid: string,
    position: Vector3Array,
    rotation: Vector3Array,
    scale: Vector3Array
  ) => void;

  setItems: (items: SceneItem[]) => void;
}

export const useSceneStore = create<SceneState>((set) => ({
  items: [],
  totalPrice: 0,

  past: [],
  future: [],

  undo: () => {},
  redo: () => {},

  // =====================================================
  // ADD ITEM
  // =====================================================
  addItem: (item) =>
    set((s) => {
      const items = [...s.items, item];
      return {
        items,
        totalPrice: items.reduce((sum, it) => sum + (it.price ?? 0), 0),
      };
    }),

  // =====================================================
  // UPDATE ITEM
  // =====================================================
  updateItem: (uuid, partial) =>
    set((s) => {
      const items = s.items.map((it) =>
        it.uuid === uuid ? { ...it, ...partial } : it
      );
      return {
        items,
        totalPrice: items.reduce((sum, it) => sum + (it.price ?? 0), 0),
      };
    }),

  // =====================================================
  // FENCE CONFIG
  // =====================================================
  updateItemFenceConfig: (uuid, newConfig) =>
    set((s) => {
      const items = s.items.map((it) =>
        it.uuid === uuid ? { ...it, fenceConfig: newConfig } : it
      );
      return {
        items,
        totalPrice: items.reduce((sum, it) => sum + (it.price ?? 0), 0),
      };
    }),

  // =====================================================
  // FLOOR MATERIAL
  // =====================================================
  updateFloorMaterial: (uuid, material) =>
    set((s) => {
      const items = s.items.map((it) =>
        it.uuid === uuid ? { ...it, floorMaterial: material } : it
      );
      return { items, totalPrice: s.totalPrice };
    }),

  // =====================================================
  // FLOOR TEXTURE (image + scale + rotation)
  // =====================================================
  updateFloorTexture: (uuid, url, scale, rotation) =>
    set((s) => {
      const items = s.items.map((it) =>
        it.uuid === uuid
          ? {
              ...it,
              textureUrl: url ?? it.textureUrl,
              textureScale: scale ?? it.textureScale ?? 1,
              textureRotation: rotation ?? it.textureRotation ?? 0,
            }
          : it
      );
      return { items, totalPrice: s.totalPrice };
    }),

  // =====================================================
  // REMOVE ITEM
  // =====================================================
  removeItem: (uuid) =>
    set((s) => {
      const items = s.items.filter((it) => it.uuid !== uuid);
      return {
        items,
        totalPrice: items.reduce((sum, it) => sum + (it.price ?? 0), 0),
      };
    }),

  // =====================================================
  // TRANSFORM
  // =====================================================
  setItemTransform: (uuid, position, rotation, scale) =>
    set((s) => ({
      items: s.items.map((it) =>
        it.uuid === uuid ? { ...it, position, rotation, scale } : it
      ),
    })),

  // =====================================================
  // SET ITEMS (LOAD PROJECT)
  // =====================================================
  setItems: (items) =>
    set({
      items,
      totalPrice: items.reduce((sum, it) => sum + (it.price ?? 0), 0),
    }),

  // =====================================================
  // CLEAR SCENE
  // =====================================================
  clearScene: () => set({ items: [], totalPrice: 0 }),
  resetScene: () => set({ items: [], totalPrice: 0 }),
}));
