import { create } from "zustand";
import { useEditorStore } from "./useEditorStore";
import { useProjectStore } from "../project/useProjectStore";

interface SelectionState {
  selectedItemId: string | null;
  selectedVertices: number[];
  measuredDistance: number | null;
  measuredAngle: number | null;

  // --- Actions ---
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

  // -----------------------------
  // SELECT ITEM
  // -----------------------------
  selectItem: (uuid) =>
    set({
      selectedItemId: uuid,
      selectedVertices: [],
      measuredDistance: null,
      measuredAngle: null,
    }),

  // -----------------------------
  // CLEAR SELECTION
  // -----------------------------
  clearSelection: () =>
    set({
      selectedItemId: null,
      selectedVertices: [],
      measuredDistance: null,
      measuredAngle: null,
    }),

  // -----------------------------
  // VERTEX SELECTION (measure tool)
  // -----------------------------
  setSelectedVertices: (indices, distance, angle) =>
    set({
      selectedVertices: indices,
      measuredDistance: distance,
      measuredAngle: angle,
    }),

  // -----------------------------
  // DUPLICATE SELECTED ITEM
  // -----------------------------
  duplicateSelection: () => {
    const { isReadOnlyMode } = useProjectStore.getState();
    if (isReadOnlyMode) {
      console.warn("🚫 No se puede duplicar en modo lectura.");
      return;
    }

    const selectedId = get().selectedItemId;
    if (!selectedId) return;

    const editor = useEditorStore.getState();
    const item = editor.items.find((i) => i.uuid === selectedId);
    if (!item) return;

    const cloned = structuredClone(item);
    cloned.uuid = crypto.randomUUID();
    cloned.position = [
      item.position[0] + 1,
      item.position[1],
      item.position[2] + 1,
    ];

    useEditorStore.setState({
      items: [...editor.items, cloned],
    });

    set({ selectedItemId: cloned.uuid });
  },

  // -----------------------------
  // REMOVE SELECTED ITEM
  // -----------------------------
  removeSelection: () => {
    const { isReadOnlyMode } = useProjectStore.getState();
    if (isReadOnlyMode) {
      console.warn("🚫 No se puede borrar en modo lectura.");
      return;
    }

    const selectedId = get().selectedItemId;
    if (!selectedId) return;

    const editor = useEditorStore.getState();

    useEditorStore.setState({
      items: editor.items.filter((i) => i.uuid !== selectedId),
    });

    set({ selectedItemId: null });
  },
}));
