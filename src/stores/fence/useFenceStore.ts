import { create } from "zustand";
import type { FenceConfig } from "@/types/editor";

/**
 * Fence store state
 */
interface FenceState {
  config: FenceConfig;
  setConfig: (partial: Partial<FenceConfig>) => void;
}

/**
 * Default fence configuration
 */
const DEFAULT_FENCE_CONFIG: FenceConfig = {
  presetId: "wood",
  colors: {
    post: 0,
    slatA: 0,
    slatB: 0,
    slatC: 0,
  },
};

/**
 * Zustand store for fence configuration
 * Manages fence preset selection and color customization
 */
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