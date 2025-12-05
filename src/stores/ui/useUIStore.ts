import { create } from "zustand";

interface GlobalUIState {
  // --- APP GLOBAL (NO EDITOR 3D) ---
  sidebarOpen: boolean;
  loading: boolean;
  toast: {
    message: string;
    type: "success" | "error" | "info" | null;
    visible: boolean;
  };

  // === ACTIONS ===
  toggleSidebar: () => void;

  setLoading: (state: boolean) => void;

  showToast: (message: string, type?: "success" | "error" | "info") => void;
  hideToast: () => void;
}

export const useUIStore = create<GlobalUIState>((set) => ({
  // === DEFAULT STATE ===
  sidebarOpen: false,
  loading: false,

  toast: {
    message: "",
    type: null,
    visible: false,
  },

  // === ACTIONS ===

  toggleSidebar: () =>
    set((s) => ({
      sidebarOpen: !s.sidebarOpen,
    })),

  setLoading: (state) => set({ loading: state }),

  showToast: (message, type = "info") =>
    set({
      toast: {
        message,
        type,
        visible: true,
      },
    }),

  hideToast: () =>
    set({
      toast: {
        message: "",
        type: null,
        visible: false,
      },
    }),
}));
