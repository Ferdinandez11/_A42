// --- FILE: src/stores/cad/useCADStore.ts ---
import { create } from "zustand";

interface CADState {
  selectedVertices: number[];
  distance: number | null;
  angle: number | null;

  setSelectedVertices: (
    indices: number[],
    distance: number | null,
    angle: number | null
  ) => void;

  clear: () => void;
}

export const useCADStore = create<CADState>((set) => ({
  selectedVertices: [],
  distance: null,
  angle: null,

  setSelectedVertices: (indices, distance, angle) =>
    set({
      selectedVertices: indices,
      distance,
      angle,
    }),

  clear: () =>
    set({
      selectedVertices: [],
      distance: null,
      angle: null,
    }),
}));
