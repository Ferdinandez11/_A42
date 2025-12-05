import { create } from "zustand";
import type { CameraView, CameraType } from "@/types/editor";

// Modo principal del editor (armonizado)
export type EditorMode =
  | "idle"
  | "placing_item"
  | "drawing_floor"
  | "drawing_fence"
  | "catalog"
  | "measuring"
  | "editing";

interface EditorState {
  // UI toggles
  gridVisible: boolean;
  skyVisible: boolean;
  safetyZonesVisible: boolean;
  envPanelVisible: boolean;
  budgetVisible: boolean;
  qrModalOpen: boolean;

  // Editor mode
  mode: EditorMode;
  setMode: (mode: EditorMode) => void;

  // Cámara
  cameraType: CameraType;
  setCameraType: (type: CameraType) => void;

  pendingView: CameraView | null;
  triggerView: (view: CameraView) => void;
  clearPendingView: () => void;

  // Fondo
  backgroundColor: string;
  setBackgroundColor: (color: string) => void;

  // Sol
  sunPosition: { azimuth: number; elevation: number };
  setSun: (azimuth: number, elevation: number) => void;

  // Alias para componentes antiguos
  setSunPosition: (azimuth: number, elevation: number) => void;

  // Medición
  measurementResult: number | null;
  setMeasurementResult: (value: number | null) => void;

  // Input modal
  inputModal: {
    isOpen: boolean;
    title: string;
    defaultValue: string;
    resolve: ((value: string | null) => void) | null;
  };
  requestInput: (title: string, defaultValue?: string) => Promise<string | null>;
  closeInputModal: (value: string | null) => void;

  // Toggles
  toggleGrid: () => void;
  toggleSky: () => void;
  toggleEnvPanel: () => void;
  toggleSafetyZones: () => void;
  toggleBudget: () => void;

  openQRModal: () => void;
  closeQRModal: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  // UI defaults
  gridVisible: true,
  skyVisible: true,
  safetyZonesVisible: false,
  envPanelVisible: false,
  budgetVisible: false,
  qrModalOpen: false,

  // Editor mode
  mode: "idle",
  setMode: (mode) => set({ mode }),

  // Cámara
  cameraType: "perspective",
  setCameraType: (type) => set({ cameraType: type }),

  pendingView: null,
  triggerView: (view) => set({ pendingView: view }),
  clearPendingView: () => set({ pendingView: null }),

  // Fondo
  backgroundColor: "#222222",
  setBackgroundColor: (color: string) => set({ backgroundColor: color }),

  // Sol (estándar profesional)
  sunPosition: { azimuth: 180, elevation: 45 },
  setSun: (azimuth, elevation) =>
    set({ sunPosition: { azimuth, elevation } }),

  // Alias para compatibilidad (EnvironmentPanel usa este)
  setSunPosition: (azimuth, elevation) =>
    set({ sunPosition: { azimuth, elevation } }),

  // Medición
  measurementResult: null,
  setMeasurementResult: (value) => set({ measurementResult: value }),

  // Input modal
  inputModal: {
    isOpen: false,
    title: "",
    defaultValue: "",
    resolve: null,
  },

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
    const res = get().inputModal.resolve;
    if (res) res(value);

    set({
      inputModal: {
        isOpen: false,
        title: "",
        defaultValue: "",
        resolve: null,
      },
    });
  },

  // Toggles
  toggleGrid: () => set((s) => ({ gridVisible: !s.gridVisible })),
  toggleSky: () => set((s) => ({ skyVisible: !s.skyVisible })),
  toggleEnvPanel: () => set((s) => ({ envPanelVisible: !s.envPanelVisible })),
  toggleSafetyZones: () =>
    set((s) => ({ safetyZonesVisible: !s.safetyZonesVisible })),
  toggleBudget: () => set((s) => ({ budgetVisible: !s.budgetVisible })),

  openQRModal: () => set({ qrModalOpen: true }),
  closeQRModal: () => set({ qrModalOpen: false }),
}));
