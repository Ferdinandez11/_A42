import { create } from "zustand";
import type { CameraView } from "@/stores/editor/useEditorStore";

interface AppState {
  // --- UI STATE ---
  mode: "idle" | "placing_item" | "editing" | "measuring";
  gridVisible: boolean;
  budgetVisible: boolean;
  envPanelVisible: boolean;
  safetyZonesVisible: boolean;
  measurementResult: number | null;

  sunPosition: { azimuth: number; elevation: number };
  backgroundColor: string;

  // --- CAMERA VIEW (TEMPORAL) ---
  pendingView: CameraView | null;

  // --- INPUT MODAL ---
  inputModal: {
    isOpen: boolean;
    title: string;
    defaultValue: string;
    resolve: ((value: string | null) => void) | null;
  };

  // --- ACTIONS ---
  setMode: (mode: AppState["mode"]) => void;
  toggleGrid: () => void;
  toggleBudget: () => void;
  toggleEnvPanel: () => void;
  toggleSafetyZones: () => void;

  setMeasurementResult: (dist: number | null) => void;
  setSunPosition: (azimuth: number, elevation: number) => void;
  setBackgroundColor: (color: string) => void;

  triggerView: (view: CameraView) => void;
  clearPendingView: () => void;

  requestInput: (title: string, defaultValue?: string) => Promise<string | null>;
  closeInputModal: (value: string | null) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // --- UI DEFAULTS ---
  mode: "idle",
  gridVisible: false,
  budgetVisible: false,
  envPanelVisible: false,
  safetyZonesVisible: false,

  measurementResult: null,

  sunPosition: { azimuth: 180, elevation: 45 },
  backgroundColor: "#111111",

  pendingView: null,

  inputModal: {
    isOpen: false,
    title: "",
    defaultValue: "",
    resolve: null,
  },

  // --- ACTIONS ---
  setMode: (mode) => {
    if (mode !== "measuring") set({ measurementResult: null });
    set({ mode });
  },

  toggleGrid: () => set((s) => ({ gridVisible: !s.gridVisible })),
  toggleBudget: () => set((s) => ({ budgetVisible: !s.budgetVisible })),
  toggleEnvPanel: () => set((s) => ({ envPanelVisible: !s.envPanelVisible })),
  toggleSafetyZones: () =>
    set((s) => ({ safetyZonesVisible: !s.safetyZonesVisible })),

  setMeasurementResult: (dist) => set({ measurementResult: dist }),

  setSunPosition: (azimuth, elevation) =>
    set({ sunPosition: { azimuth, elevation } }),

  setBackgroundColor: (color) => set({ backgroundColor: color }),

  triggerView: (view) => set({ pendingView: view }),
  clearPendingView: () => set({ pendingView: null }),

  requestInput: (title, defaultValue = "") =>
    new Promise((resolve) => {
      set({
        inputModal: {
          isOpen: true,
          title,
          defaultValue,
          resolve,
        },
      });
    }),

  closeInputModal: (value) => {
    const { resolve } = get().inputModal;
    if (resolve) resolve(value);
    set({
      inputModal: {
        isOpen: false,
        title: "",
        defaultValue: "",
        resolve: null,
      },
    });
  },
}));
