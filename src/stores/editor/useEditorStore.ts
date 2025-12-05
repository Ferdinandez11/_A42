// --- FILE: src/stores/editor/useEditorStore.ts ---
import { create } from "zustand";
import type { EditorMode, CameraType, CameraView } from "@/types/editor";


interface InputModalState {
  isOpen: boolean;
  title: string;
  defaultValue: string;
  resolve: ((value: string | null) => void) | null;
}

interface EditorState {
  // UI STATE
  mode: EditorMode;
  
  gridVisible: boolean;
  budgetVisible: boolean;
  envPanelVisible: boolean;
  safetyZonesVisible: boolean;

  sunPosition: { azimuth: number; elevation: number };
  backgroundColor: string;

  cameraType: CameraType;
  pendingView: CameraView | null;

  measurementResult: number | null;

  inputModal: InputModalState;

  // ACTIONS (Solo UI y Modos)
  setMode: (mode: EditorMode) => void;

  toggleGrid: () => void;
  toggleBudget: () => void;
  toggleEnvPanel: () => void;
  toggleSafetyZones: () => void;

  setSunPosition: (azimuth: number, elevation: number) => void;
  setBackgroundColor: (color: string) => void;

  setMeasurementResult: (dist: number | null) => void;

  setCameraType: (type: CameraType) => void;
  triggerView: (view: CameraView) => void;
  clearPendingView: () => void;

  requestInput: (title: string, defaultValue?: string) => Promise<string | null>;
  closeInputModal: (value: string | null) => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  mode: "idle",

  gridVisible: false,
  budgetVisible: false,
  envPanelVisible: false,
  safetyZonesVisible: false,

  sunPosition: { azimuth: 180, elevation: 45 },
  backgroundColor: "#111111",

  cameraType: "perspective",
  pendingView: null,

  measurementResult: null,

  inputModal: {
    isOpen: false,
    title: "",
    defaultValue: "",
    resolve: null,
  },

  setMode: (mode) => {
    // Limpiamos herramientas del motor si cambiamos de modo
     set({ mode });
  },

  toggleGrid: () => set((s) => ({ gridVisible: !s.gridVisible })),
  toggleBudget: () => set((s) => ({ budgetVisible: !s.budgetVisible })),
  toggleEnvPanel: () => set((s) => ({ envPanelVisible: !s.envPanelVisible })),
  toggleSafetyZones: () =>
    set((s) => ({ safetyZonesVisible: !s.safetyZonesVisible })),

  setSunPosition: (azimuth, elevation) =>
    set({ sunPosition: { azimuth, elevation } }),

  setBackgroundColor: (color) => set({ backgroundColor: color }),

  setMeasurementResult: (dist) => set({ measurementResult: dist }),

  setCameraType: (type) => set({ cameraType: type }),
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
    const resolver = get().inputModal.resolve;
    resolver?.(value);

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