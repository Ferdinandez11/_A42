import { create } from "zustand";

export interface CADState {
  // Índices de vértices seleccionados en una geometría
  selectedVertices: number[];

  // Distancia calculada entre dos puntos (modo medición)
  distance: number | null;

  // Ángulo calculado cuando aplica
  angle: number | null;

  // === ACTIONS ===
  setSelectedVertices: (indices: number[], distance: number | null, angle: number | null) => void;

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
