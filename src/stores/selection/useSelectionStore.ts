import { create } from "zustand";
import { useSceneStore } from "../scene/useSceneStore";
import { useProjectStore } from "../project/useProjectStore";
import type { SceneItem } from "@/types/editor";

/**
 * Selection store state
 */
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

/**
 * Zustand store for selection management
 * Manages item selection, vertex selection, and measurements
 */
export const useSelectionStore = create<SelectionState>((set, get) => ({
  selectedItemId: null,
  selectedVertices: [],
  measuredDistance: null,
  measuredAngle: null,

  /**
   * Selects an item by UUID
   */
  selectItem: (uuid) =>
    set({
      selectedItemId: uuid,
      selectedVertices: [],
      measuredDistance: null,
      measuredAngle: null,
    }),

  /**
   * Clears all selections
   */
  clearSelection: () =>
    set({
      selectedItemId: null,
      selectedVertices: [],
      measuredDistance: null,
      measuredAngle: null,
    }),

  /**
   * Sets selected vertices with measurements
   */
  setSelectedVertices: (indices, distance, angle) =>
    set({
      selectedVertices: indices,
      measuredDistance: distance,
      measuredAngle: angle,
    }),

  /**
   * Duplicates the currently selected item
   */
  duplicateSelection: () => {
    const { isReadOnlyMode } = useProjectStore.getState();
    if (isReadOnlyMode) {
      console.warn("🚫 Cannot duplicate in read-only mode.");
      return;
    }

    const selectedId = get().selectedItemId;
    if (!selectedId) return;

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

  /**
   * Removes the currently selected item
   */
  removeSelection: () => {
    const { isReadOnlyMode } = useProjectStore.getState();
    if (isReadOnlyMode) {
      console.warn("🚫 Cannot delete in read-only mode.");
      return;
    }

    const selectedId = get().selectedItemId;
    if (!selectedId) return;

    useSceneStore.getState().removeItem(selectedId);

    set({ selectedItemId: null });
  },
}));