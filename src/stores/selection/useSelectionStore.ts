import { create } from "zustand";
import { useSceneStore } from "../scene/useSceneStore"; // 🔥
import { useProjectStore } from "../project/useProjectStore";
import type { SceneItem } from "@/types/editor";

interface SelectionState {
  selectedItemId: string | null;
  selectedVertices: number[];
  measuredDistance: number | null;
  measuredAngle: number | null;

  selectItem: (uuid: string | null) => void;
  clearSelection: () => void;

  setSelectedVertices: (
    indices: number[],
    distance: number | null,
    angle: number | null
  ) => void;

  duplicateSelection: () => void;
  removeSelection: () => void;
}

export const useSelectionStore = create<SelectionState>((set, get) => ({
  selectedItemId: null,
  selectedVertices: [],
  measuredDistance: null,
  measuredAngle: null,

  selectItem: (uuid) =>
    set({
      selectedItemId: uuid,
      selectedVertices: [],
      measuredDistance: null,
      measuredAngle: null,
    }),

  clearSelection: () =>
    set({
      selectedItemId: null,
      selectedVertices: [],
      measuredDistance: null,
      measuredAngle: null,
    }),

  setSelectedVertices: (indices, distance, angle) =>
    set({
      selectedVertices: indices,
      measuredDistance: distance,
      measuredAngle: angle,
    }),

  duplicateSelection: () => {
    const { isReadOnlyMode } = useProjectStore.getState();
    if (isReadOnlyMode) {
      console.warn("🚫 No se puede duplicar en modo lectura.");
      return;
    }

    const selectedId = get().selectedItemId;
    if (!selectedId) return;

    // 🔥 Usamos SceneStore para leer y escribir
    const scene = useSceneStore.getState();
    const item = scene.items.find((i: SceneItem) => i.uuid === selectedId);
    if (!item) return;

    const cloned = structuredClone(item);
    cloned.uuid = crypto.randomUUID();
    cloned.position = [
      item.position[0] + 1,
      item.position[1],
      item.position[2] + 1,
    ];

    useSceneStore.getState().addItem(cloned);

    set({ selectedItemId: cloned.uuid });
  },

  removeSelection: () => {
    const { isReadOnlyMode } = useProjectStore.getState();
    if (isReadOnlyMode) {
      console.warn("🚫 No se puede borrar en modo lectura.");
      return;
    }

    const selectedId = get().selectedItemId;
    if (!selectedId) return;

    useSceneStore.getState().removeItem(selectedId); // 🔥

    set({ selectedItemId: null });
  },
}));