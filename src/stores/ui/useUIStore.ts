import { create } from "zustand";

interface InputModalState {
  isOpen: boolean;
  title: string;
  defaultValue: string;
  resolve: ((value: string | null) => void) | null;
}

interface UIState {
  // --- PANEL STATES ---
  gridVisible: boolean;
  budgetVisible: boolean;
  envPanelVisible: boolean;
  safetyZonesVisible: boolean;

  // --- MODALS ---
  inputModal: InputModalState;
  qrModalOpen: boolean;

  // --- ACTIONS ---
  toggleGrid: () => void;
  toggleBudget: () => void;
  toggleEnvPanel: () => void;
  toggleSafetyZones: () => void;

  openQRModal: () => void;
  closeQRModal: () => void;

  requestInput: (title: string, defaultValue?: string) => Promise<string | null>;
  closeInputModal: (value: string | null) => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  // --- INITIAL UI VALUES ---
  gridVisible: false,
  budgetVisible: false,
  envPanelVisible: false,
  safetyZonesVisible: false,

  qrModalOpen: false,

  inputModal: {
    isOpen: false,
    title: "",
    defaultValue: "",
    resolve: null,
  },

  // --- TOGGLES ---
  toggleGrid: () => set((s) => ({ gridVisible: !s.gridVisible })),
  toggleBudget: () => set((s) => ({ budgetVisible: !s.budgetVisible })),
  toggleEnvPanel: () => set((s) => ({ envPanelVisible: !s.envPanelVisible })),
  toggleSafetyZones: () =>
    set((s) => ({ safetyZonesVisible: !s.safetyZonesVisible })),

  // --- QR MODAL ---
  openQRModal: () => set({ qrModalOpen: true }),
  closeQRModal: () => set({ qrModalOpen: false }),

  // --- INPUT MODAL (PROMISE-BASED) ---
  requestInput: (title, defaultValue = "") => {
    return new Promise((resolve) => {
      set({
        inputModal: {
          isOpen: true,
          title,
          defaultValue,
          resolve,
        },
      });
    });
  },

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
