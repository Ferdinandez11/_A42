// --- FILE: src/stores/fence/useFenceStore.ts ---
import { create } from "zustand";
import type { FenceConfig } from "@/types/editor";

interface FenceState {
  config: FenceConfig;
  setConfig: (partial: Partial<FenceConfig>) => void;
}

const DEFAULT_FENCE_CONFIG: FenceConfig = {
  presetId: "wood",
  colors: {
    post: 0,
    slatA: 0,
    slatB: 0,
    slatC: 0,
  },
};

export const useFenceStore = create<FenceState>((set) => ({
  config: DEFAULT_FENCE_CONFIG,

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
}));
