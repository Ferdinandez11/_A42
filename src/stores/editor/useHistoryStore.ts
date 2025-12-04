import { create } from "zustand";
import type { SceneItem } from "@/stores/useAppStore";

interface HistoryState {
  past: SceneItem[][];
  future: SceneItem[][];
  maxSteps: number;

  saveSnapshot: (items: SceneItem[]) => void;
  undo: (apply: (items: SceneItem[]) => void) => void;
  redo: (apply: (items: SceneItem[]) => void) => void;
  clearHistory: () => void;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  past: [],
  future: [],
  maxSteps: 30,

  saveSnapshot: (items) => {
    const past = [...get().past, JSON.parse(JSON.stringify(items))];

    const trimmed =
      past.length > get().maxSteps
        ? past.slice(past.length - get().maxSteps)
        : past;

    set({
      past: trimmed,
      future: [],
    });
  },

  undo: (apply) => {
    const { past, future } = get();
    if (past.length === 0) return;

    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);
    const newFuture = [JSON.parse(JSON.stringify(apply)), ...future];

    apply(previous);

    set({
      past: newPast,
      future: newFuture,
    });
  },

  redo: (apply) => {
    const { past, future } = get();
    if (future.length === 0) return;

    const next = future[0];
    const newFuture = future.slice(1);
    const newPast = [...past, JSON.parse(JSON.stringify(apply))];

    apply(next);

    set({
      past: newPast,
      future: newFuture,
    });
  },

  clearHistory: () => set({ past: [], future: [] }),
}));
