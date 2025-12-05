import { create } from "zustand";
import type { FenceConfig } from "@/types/editor";

const DEFAULT_FENCE_CONFIG: FenceConfig = {
  presetId: "wood",
  colors: {
    post: 0,
    slatA: 0,
    slatB: 0,
    slatC: 0,
  },
};

interface FenceState {
  config: FenceConfig;

  // === ACTIONS ===
  setConfig: (partial: Partial<FenceConfig>) => void;
  resetConfig: () => void;
  setPreset: (presetId: string) => void;
  setColor: (section: keyof FenceConfig["colors"], colorIndex: number) => void;
}

export const useFenceStore = create<FenceState>((set) => ({
  config: { ...DEFAULT_FENCE_CONFIG },

  // Combina cambios superficiales y colores internos
  setConfig: (partial) =>
    set((state) => ({
      config: {
        ...state.config,
        ...partial,
        colors: {
          ...state.config.colors,
          ...(partial.colors ?? {}),
        },
      },
    })),

  // Restaura la configuración por defecto
  resetConfig: () =>
    set({
      config: { ...DEFAULT_FENCE_CONFIG },
    }),

  // Cambia el preset manteniendo los colores actuales
  setPreset: (presetId) =>
    set((state) => ({
      config: {
        ...state.config,
        presetId,
      },
    })),

  // Cambia un color individual
  setColor: (section, colorIndex) =>
    set((state) => ({
      config: {
        ...state.config,
        colors: {
          ...state.config.colors,
          [section]: colorIndex,
        },
      },
    })),
}));
