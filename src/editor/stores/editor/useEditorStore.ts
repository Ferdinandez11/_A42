import { create } from "zustand";
import type { EditorMode, CameraType, CameraView } from "@/domain/types/editor";

/**
 * Input modal state
 */
interface InputModalState {
  isOpen: boolean;
  title: string;
  defaultValue: string;
  resolve: ((value: string | null) => void) | null;
}

/**
 * Editor store state
 */
interface EditorState {
  // UI State
  mode: EditorMode;
  gridVisible: boolean;
  budgetVisible: boolean;
  envPanelVisible: boolean;
  safetyZonesVisible: boolean;

  // Environment
  sunPosition: { azimuth: number; elevation: number };
  backgroundColor: string;

  // Camera
  cameraType: CameraType;
  pendingView: CameraView | null;

  // Measurements
  measurementResult: number | null;

  // Input modal
  inputModal: InputModalState;

  // Actions (UI and modes only)
  setMode: (mode: EditorMode) => void;

  toggleGrid: () => void;
  toggleBudget: () => void;
  toggleEnvPanel: () => void;
  toggleSafetyZones: () => void;

  setSunPosition: (azimuth: number, elevation: number) => void;
  setBackgroundColor: (color: string) => void;

  setMeasurementResult: (distance: number | null) => void;

  setCameraType: (type: CameraType) => void;
  triggerView: (view: CameraView) => void;
  clearPendingView: () => void;

  requestInput: (
    title: string,
    defaultValue?: string
  ) => Promise<string | null>;
  closeInputModal: (value: string | null) => void;
}

/**
 * Zustand store for editor UI state
 * Manages editor modes, visibility toggles, environment settings, and camera controls
 */
export const useEditorStore = create<EditorState>((set, get) => ({
  // Initial state
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

  // Actions
  setMode: (mode) => {
    set({ mode });
  },

  toggleGrid: () => set((state) => ({ gridVisible: !state.gridVisible })),
  toggleBudget: () =>
    set((state) => ({ budgetVisible: !state.budgetVisible })),
  toggleEnvPanel: () =>
    set((state) => ({ envPanelVisible: !state.envPanelVisible })),
  toggleSafetyZones: () =>
    set((state) => ({ safetyZonesVisible: !state.safetyZonesVisible })),

  setSunPosition: (azimuth, elevation) =>
    set({ sunPosition: { azimuth, elevation } }),

  setBackgroundColor: (color) => set({ backgroundColor: color }),

  setMeasurementResult: (distance) => set({ measurementResult: distance }),

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