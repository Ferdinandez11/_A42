import { create } from "zustand";

interface SelectionState {
  selectedUUID: string | null;

  // === ACTIONS ===
  select: (uuid: string | null) => void;
  clear: () => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  selectedUUID: null,

  select: (uuid) => set({ selectedUUID: uuid }),
  clear: () => set({ selectedUUID: null }),
}));
