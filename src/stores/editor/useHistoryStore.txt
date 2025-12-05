// --- FILE: src/stores/history/useHistoryStore.ts ---
import { create } from "zustand";
import type { SceneItem } from "@/types/editor";

interface HistoryState {
  past: SceneItem[][];
  future: SceneItem[][];
  maxSteps: number;

  saveSnapshot: (items: SceneItem[]) => void;
  undo: (apply: (items: SceneItem[]) => void, currentItems: SceneItem[]) => void;
  redo: (apply: (items: SceneItem[]) => void, currentItems: SceneItem[]) => void;
  clearHistory: () => void;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  past: [],
  future: [],
  maxSteps: 30,

  saveSnapshot: (items) => {
    const cloned = JSON.parse(JSON.stringify(items));
    const past = [...get().past, cloned];

    const trimmed =
      past.length > get().maxSteps
        ? past.slice(past.length - get().maxSteps)
        : past;

    set({ past: trimmed, future: [] });
  },

  undo: (apply, currentItems) => {
    const { past, future } = get();
    if (past.length === 0) return;

    const previous = past[past.length - 1];
    const newPast = past.slice(0, -1);

    const clonedCurrent = JSON.parse(JSON.stringify(currentItems));
    const newFuture = [clonedCurrent, ...future];

    apply(previous);

    set({
      past: newPast,
      future: newFuture,
    });
  },

  redo: (apply, currentItems) => {
    const { past, future } = get();
    if (future.length === 0) return;

    const next = future[0];
    const newFuture = future.slice(1);

    const clonedCurrent = JSON.parse(JSON.stringify(currentItems));
    const newPast = [...past, clonedCurrent];

    apply(next);

    set({
      past: newPast,
      future: newFuture,
    });
  },

  clearHistory: () => set({ past: [], future: [] }),
}));
