import { create } from "zustand";
import type { CameraView, CameraType } from "@/types/editor";

export type ToolMode =
  | "select"
  | "move"
  | "rotate"
  | "scale"
  | "floor"
  | "fence"
  | "catalog"
  | "none";

export type EditorMode =
  | "idle"
  | "drawing_floor"
  | "drawing_fence"
  | "catalog"
  | "measuring";

interface EditorState {
  // UI
  gridVisible: boolean;
  skyVisible: boolean;
  safetyZonesVisible: boolean;
  envPanelVisible: boolean;
  budgetVisible: boolean;
  qrModalOpen: boolean;

  // Tool mode “antiguo”
  activeTool: ToolMode;

  // Nuevo: modo de editor de alto nivel (para Toolbar / Editor3D)
  mode: EditorMode;
  setMode: (mode: EditorMode) => void;

  // Cámara y vistas
  cameraType: CameraType;
  setCameraType: (type: CameraType) => void;

  pendingView: CameraView | null;
  triggerView: (view: CameraView) => void;
  clearPendingView: () => void;

  // Background
  backgroundColor: string;

  // Sol / Sky (de momento solo un número, p.ej. elevación)
  sunPosition: number;

  // Medición
  measurementResult: number | null;
  setMeasurementResult: (value: number | null) => void;

  // Modals
  inputModal: {
    isOpen: boolean;
    title: string;
    defaultValue: string;
    resolve: ((value: string | null) => void) | null;
  };

  // ==== ACTIONS EXISTENTES ====
  setActiveTool: (tool: ToolMode) => void;

  toggleGrid: () => void;
  toggleSky: () => void;
  toggleEnvPanel: () => void;
  toggleSafetyZones: () => void;
  toggleBudget: () => void;

  setBackgroundColor: (color: string) => void;
  setSunPosition: (pos: number) => void;

  openQRModal: () => void;
  closeQRModal: () => void;

  requestInput: (title: string, defaultValue?: string) => Promise<string | null>;
  closeInputModal: (value: string | null) => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  // === DEFAULT STATE ===
  gridVisible: true,
  skyVisible: true,
  safetyZonesVisible: false,
  envPanelVisible: false,
  budgetVisible: false,
  qrModalOpen: false,

  activeTool: "select",

  // Nuevo estado de modo
  mode: "idle",

  // Cámara por defecto
  cameraType: "perspective",
  pendingView: null,

  backgroundColor: "#222222",
  sunPosition: 45,

  measurementResult: null,

  inputModal: {
    isOpen: false,
    title: "",
    defaultValue: "",
    resolve: null,
  },

  // === ACTIONS ===
  setActiveTool: (tool) => set({ activeTool: tool }),

  setMode: (mode) => set({ mode }),

  setCameraType: (type) => set({ cameraType: type }),

  triggerView: (view) => set({ pendingView: view }),
  clearPendingView: () => set({ pendingView: null }),

  toggleGrid: () => set((s) => ({ gridVisible: !s.gridVisible })),
  toggleSky: () => set((s) => ({ skyVisible: !s.skyVisible })),
  toggleEnvPanel: () => set((s) => ({ envPanelVisible: !s.envPanelVisible })),
  toggleSafetyZones: () =>
    set((s) => ({ safetyZonesVisible: !s.safetyZonesVisible })),
  toggleBudget: () => set((s) => ({ budgetVisible: !s.budgetVisible })),

  setBackgroundColor: (color) => set({ backgroundColor: color }),
  setSunPosition: (pos) => set({ sunPosition: pos }),

  setMeasurementResult: (value) => set({ measurementResult: value }),

  openQRModal: () => set({ qrModalOpen: true }),
  closeQRModal: () => set({ qrModalOpen: false }),

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
