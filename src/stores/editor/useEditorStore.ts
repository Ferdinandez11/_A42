import { create } from "zustand";
import type { CameraView, CameraType } from "@/types/editor";

export type EditorMode =
  | "idle"
  | "placing_item"
  | "drawing_floor"
  | "drawing_fence"
  | "catalog"
  | "measuring"
  | "editing";

interface EditorState {
  gridVisible: boolean;
  skyVisible: boolean;
  safetyZonesVisible: boolean;
  envPanelVisible: boolean;
  budgetVisible: boolean;
  qrModalOpen: boolean;

  mode: EditorMode;
  setMode: (mode: EditorMode) => void;

  cameraType: CameraType;
  setCameraType: (type: CameraType) => void;

  pendingView: CameraView | null;
  triggerView: (view: CameraView) => void;
  clearPendingView: () => void;

  backgroundColor: string;
  setBackgroundColor: (color: string) => void;

  sunPosition: { azimuth: number; elevation: number };
  setSun: (azimuth: number, elevation: number) => void;
  setSunPosition: (azimuth: number, elevation: number) => void;

  measurementResult: number | null;
  setMeasurementResult: (value: number | null) => void;

  inputModal: {
    isOpen: boolean;
    title: string;
    defaultValue: string;
    resolve: ((value: string | null) => void) | null;
  };
  requestInput: (title: string, defaultValue?: string) => Promise<string | null>;
  closeInputModal: (value: string | null) => void;

  toggleGrid: () => void;
  toggleSky: () => void;
  toggleEnvPanel: () => void;
  toggleSafetyZones: () => void;
  toggleBudget: () => void;

  openQRModal: () => void;
  closeQRModal: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  // --- CONFIGURACIÓN INICIAL ---
  gridVisible: false, // 👈 CAMBIADO: Grid oculto por defecto
  skyVisible: true,   // Cielo visible
  safetyZonesVisible: false,
  envPanelVisible: false,
  budgetVisible: false,
  qrModalOpen: false,

  mode: "idle",
  setMode: (mode) => set({ mode }),

  cameraType: "perspective",
  setCameraType: (type) => set({ cameraType: type }),

  pendingView: null,
  triggerView: (view) => set({ pendingView: view }),
  clearPendingView: () => set({ pendingView: null }),

  // 👈 CAMBIADO: #111111 activa el Sky en tu SceneManager
  backgroundColor: "#111111", 
  setBackgroundColor: (color: string) => set({ backgroundColor: color }),

  sunPosition: { azimuth: 180, elevation: 45 },
  setSun: (azimuth, elevation) => set({ sunPosition: { azimuth, elevation } }),
  setSunPosition: (azimuth, elevation) => set({ sunPosition: { azimuth, elevation } }),

  measurementResult: null,
  setMeasurementResult: (value) => set({ measurementResult: value }),

  inputModal: { isOpen: false, title: "", defaultValue: "", resolve: null },

  requestInput: (title, defaultValue = "") =>
    new Promise((resolve) => {
      set({ inputModal: { isOpen: true, title, defaultValue, resolve } });
    }),

  closeInputModal: (value) => {
    const res = get().inputModal.resolve;
    if (res) res(value);
    set({ inputModal: { isOpen: false, title: "", defaultValue: "", resolve: null } });
  },

  toggleGrid: () => set((s) => ({ gridVisible: !s.gridVisible })),
  toggleSky: () => set((s) => ({ skyVisible: !s.skyVisible })),
  toggleEnvPanel: () => set((s) => ({ envPanelVisible: !s.envPanelVisible })),
  toggleSafetyZones: () => set((s) => ({ safetyZonesVisible: !s.safetyZonesVisible })),
  toggleBudget: () => set((s) => ({ budgetVisible: !s.budgetVisible })),

  openQRModal: () => set({ qrModalOpen: true }),
  closeQRModal: () => set({ qrModalOpen: false }),
}));