import { create } from "zustand";

export type ToolMode =
  | "select"
  | "move"
  | "rotate"
  | "scale"
  | "floor"
  | "fence"
  | "catalog"
  | "none";

interface EditorState {
  // UI
  gridVisible: boolean;
  skyVisible: boolean;
  safetyZonesVisible: boolean;
  envPanelVisible: boolean;
  budgetVisible: boolean;
  qrModalOpen: boolean;

  // Tool mode
  activeTool: ToolMode;

  // Background
  backgroundColor: string;

  // Sun position (for Sky)
  sunPosition: number;

  // Modals
  inputModal: {
    isOpen: boolean;
    title: string;
    defaultValue: string;
    resolve: ((value: string | null) => void) | null;
  };

  // ==== ACTIONS ====
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

  backgroundColor: "#222222",
  sunPosition: 45,

  inputModal: {
    isOpen: false,
    title: "",
    defaultValue: "",
    resolve: null,
  },

  // === ACTIONS ===
  setActiveTool: (tool) => set({ activeTool: tool }),

  toggleGrid: () => set((s) => ({ gridVisible: !s.gridVisible })),
  toggleSky: () => set((s) => ({ skyVisible: !s.skyVisible })),
  toggleEnvPanel: () => set((s) => ({ envPanelVisible: !s.envPanelVisible })),
  toggleSafetyZones: () =>
    set((s) => ({ safetyZonesVisible: !s.safetyZonesVisible })),
  toggleBudget: () => set((s) => ({ budgetVisible: !s.budgetVisible })),

  setBackgroundColor: (color) => set({ backgroundColor: color }),
  setSunPosition: (pos) => set({ sunPosition: pos }),

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
