// --- START OF FILE src/stores/scene/useSceneStore.ts ---
import { create } from "zustand";
import type { SceneItem, FenceConfig } from "@/types/editor";

/**
 * Este store contiene SOLO la escena:
 * - items colocados
 * - fenceConfig temporal o global
 * - cálculos simples como totalPrice
 */

interface SceneState {
  items: SceneItem[];
  fenceConfig: FenceConfig;

  // --- DERIVADOS ---
  totalPrice: number;

  // --- ACCIONES CRUD ---
  addItem: (item: SceneItem) => void;
  updateItem: (uuid: string, partial: Partial<SceneItem>) => void;
  removeItem: (uuid: string) => void;

  // --- FENCE ---
  setFenceConfig: (cfg: Partial<FenceConfig>) => void;
  updateItemFenceConfig: (uuid: string, cfg: Partial<FenceConfig>) => void;

  // --- RESET ---
  resetScene: () => void;
}

export const useSceneStore = create<SceneState>((set) => ({
  // --- DEFAULT STATE ---
  items: [],

  fenceConfig: {
    presetId: "wood",
    colors: {
      post: 0xffffff,
      slatA: 0xffffff,
      slatB: 0xffffff,
      slatC: 0xffffff,
    },
  },

  totalPrice: 0,

  // -------------------------------------------------------------
  // ADD ITEM
  // -------------------------------------------------------------
  addItem: (item) =>
    set((state) => {
      const items = [...state.items, item];
      const totalPrice = items.reduce((sum, i) => sum + (i.price || 0), 0);
      return { items, totalPrice };
    }),

  // -------------------------------------------------------------
  // UPDATE ITEM
  // -------------------------------------------------------------
  updateItem: (uuid, partial) =>
    set((state) => {
      const items = state.items.map((i) =>
        i.uuid === uuid ? { ...i, ...partial } : i
      );
      const totalPrice = items.reduce((sum, i) => sum + (i.price || 0), 0);
      return { items, totalPrice };
    }),

  // -------------------------------------------------------------
  // REMOVE ITEM
  // -------------------------------------------------------------
  removeItem: (uuid) =>
    set((state) => {
      const items = state.items.filter((i) => i.uuid !== uuid);
      const totalPrice = items.reduce((sum, i) => sum + (i.price || 0), 0);
      return { items, totalPrice };
    }),

  // -------------------------------------------------------------
  // FENCE CONFIG (GLOBAL)
  // -------------------------------------------------------------
  setFenceConfig: (cfg) =>
    set((state) => ({
      fenceConfig: {
        ...state.fenceConfig,
        ...cfg,
        colors: {
          ...state.fenceConfig.colors,
          ...(cfg.colors || {}),
        },
      },
    })),

  // -------------------------------------------------------------
  // UPDATE FENCE CONFIG IN ITEM
  // -------------------------------------------------------------
updateItemFenceConfig: (uuid, cfg) =>
  set((state) => {
    const items = state.items.map((i) => {
      if (i.uuid !== uuid) return i;

      const safeFence: FenceConfig = {
        presetId: i.fenceConfig?.presetId ?? "wood",
        colors: {
          post: i.fenceConfig?.colors.post ?? 0xffffff,
          slatA: i.fenceConfig?.colors.slatA ?? 0xffffff,
          slatB: i.fenceConfig?.colors.slatB ?? 0xffffff,
          slatC: i.fenceConfig?.colors.slatC ?? 0xffffff,
        },
      };

      return {
        ...i,
        fenceConfig: {
          presetId: cfg.presetId ?? safeFence.presetId,
          colors: {
            ...safeFence.colors,
            ...(cfg.colors || {}),
          },
        },
      };
    });

    return { items };
  }),

  // -------------------------------------------------------------
  // RESET SCENE
  // -------------------------------------------------------------
  resetScene: () =>
    set({
      items: [],
      totalPrice: 0,
      fenceConfig: {
        presetId: "wood",
        colors: {
          post: 0xffffff,
          slatA: 0xffffff,
          slatB: 0xffffff,
          slatC: 0xffffff,
        },
      },
    }),
}));
// --- END OF FILE src/stores/scene/useSceneStore.ts ---
