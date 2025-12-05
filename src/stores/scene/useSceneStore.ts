// --- FILE: src/stores/scene/useSceneStore.ts ---
import { create } from "zustand";
import type { SceneItem, FenceConfig, FloorMaterialType } from "@/types/editor";
import { FENCE_PRESETS } from "@/features/editor/data/fence_presets";

interface SceneState {
  // --- STATE ---
  items: SceneItem[];
  totalPrice: number;
  
  // Config global temporal (para la próxima valla que dibujes)
  fenceConfig: FenceConfig;

  // History
  past: SceneItem[][];
  future: SceneItem[][];

  // --- ACTIONS (CRUD) ---
  addItem: (item: SceneItem) => void;
  removeItem: (uuid: string) => void;
  
  // Actualizaciones parciales
  updateItemTransform: (uuid: string, pos: number[], rot: number[], scale: number[]) => void;
  updateFloorMaterial: (uuid: string, material: FloorMaterialType) => void;
  updateFloorTexture: (uuid: string, url: string | undefined, scale: number, rotation: number) => void;
  updateFloorPoints: (uuid: string, points: { x: number; z: number }[]) => void;
  updateFencePoints: (uuid: string, points: { x: number; z: number }[]) => void;
  
  // Configuración de vallas
  setFenceConfig: (config: Partial<FenceConfig>) => void;
  updateItemFenceConfig: (uuid: string, config: Partial<FenceConfig>) => void;

  // Gestión de escena
  resetScene: () => void;
  setItems: (items: SceneItem[]) => void; // Útil para cargar proyectos

  // History Actions
  saveSnapshot: () => void;
  undo: () => void;
  redo: () => void;
}

export const useSceneStore = create<SceneState>((set, get) => ({
  items: [],
  totalPrice: 0,
  
  fenceConfig: {
    presetId: "wood",
    colors: FENCE_PRESETS["wood"].defaultColors,
  },

  past: [],
  future: [],

  // --- INTERNAL HELPER ---
  saveSnapshot: () => {
    const snapshot = structuredClone(get().items);
    set((state) => ({
      past: [...state.past.slice(-19), snapshot],
      future: [],
    }));
  },

  // --- ACTIONS ---
  
  addItem: (item) => {
    get().saveSnapshot();
    set((s) => ({
      items: [...s.items, item],
      totalPrice: s.totalPrice + (item.price || 0),
    }));
  },

  removeItem: (uuid) => {
    get().saveSnapshot();
    set((s) => {
      const newItems = s.items.filter((i) => i.uuid !== uuid);
      return {
        items: newItems,
        totalPrice: newItems.reduce((sum, i) => sum + i.price, 0),
      };
    });
  },

  updateItemTransform: (uuid, pos, rot, scale) =>
    set((s) => ({
      items: s.items.map((i) =>
        i.uuid === uuid
          ? {
              ...i,
              position: pos as [number, number, number],
              rotation: rot as [number, number, number],
              scale: scale as [number, number, number],
            }
          : i
      ),
    })),

  updateFloorMaterial: (uuid, material) =>
    set((s) => ({
      items: s.items.map((i) =>
        i.uuid === uuid && i.type === "floor"
          ? { ...i, floorMaterial: material, textureUrl: undefined }
          : i
      ),
    })),

  updateFloorTexture: (uuid, url, scale, rotation) =>
    set((s) => ({
      items: s.items.map((i) =>
        i.uuid === uuid && i.type === "floor"
          ? {
              ...i,
              textureUrl: url,
              textureScale: scale,
              textureRotation: rotation,
              floorMaterial: undefined,
            }
          : i
      ),
    })),

  updateFloorPoints: (uuid, points) => {
    // Nota: A veces no queremos snapshot en cada micro-movimiento, 
    // pero para simplificar lo dejamos así o lo gestionamos desde el manager.
    set((s) => ({
      items: s.items.map((i) =>
        i.uuid === uuid && i.type === "floor" ? { ...i, points } : i
      ),
    }));
  },

  updateFencePoints: (uuid, points) => {
    set((s) => ({
      items: s.items.map((i) =>
        i.uuid === uuid && i.type === "fence" ? { ...i, points } : i
      ),
    }));
  },

  setFenceConfig: (config) =>
    set((s) => ({
      fenceConfig: { ...s.fenceConfig, ...config },
    })),

  updateItemFenceConfig: (uuid, config) => {
    get().saveSnapshot();
    set((s) => ({
      items: s.items.map((i) => {
        if (i.uuid === uuid && i.type === "fence") {
          return {
            ...i,
            fenceConfig: { ...i.fenceConfig, ...config },
          };
        }
        return i;
      }),
    }));
  },

  // --- HISTORY ---
  undo: () => {
    const { past, items, future } = get();
    if (past.length === 0) return;

    const prev = past[past.length - 1];
    set({
      items: prev,
      past: past.slice(0, -1),
      future: [items, ...future],
      totalPrice: prev.reduce((s, i) => s + i.price, 0),
    });
  },

  redo: () => {
    const { past, items, future } = get();
    if (future.length === 0) return;

    const next = future[0];
    set({
      items: next,
      past: [...past, items],
      future: future.slice(1),
      totalPrice: next.reduce((s, i) => s + i.price, 0),
    });
  },

  resetScene: () =>
    set({
      items: [],
      totalPrice: 0,
      past: [],
      future: [],
    }),

  setItems: (newItems) => 
    set({
        items: newItems,
        totalPrice: newItems.reduce((s, i) => s + i.price, 0),
        past: [],
        future: []
    })
}));