import { create } from "zustand";

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
 * UI store state
 */
interface UIState {
  // Panel visibility states
  gridVisible: boolean;
  budgetVisible: boolean;
  envPanelVisible: boolean;
  safetyZonesVisible: boolean;

  // Modal states
  inputModal: InputModalState;
  qrModalOpen: boolean;

  // Actions
  toggleGrid: () => void;
  toggleBudget: () => void;
  toggleEnvPanel: () => void;
  toggleSafetyZones: () => void;

  openQRModal: () => void;
  closeQRModal: () => void;

  requestInput: (
    title: string,
    defaultValue?: string
  ) => Promise<string | null>;
  closeInputModal: (value: string | null) => void;
}

/**
 * Zustand store for UI state management
 * Manages panel visibility, modals, and user input dialogs
 */
export const useUIStore = create<UIState>((set, get) => ({
  // Initial UI values
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

  // Toggle actions
  toggleGrid: () => set((state) => ({ gridVisible: !state.gridVisible })),
  toggleBudget: () =>
    set((state) => ({ budgetVisible: !state.budgetVisible })),
  toggleEnvPanel: () =>
    set((state) => ({ envPanelVisible: !state.envPanelVisible })),
  toggleSafetyZones: () =>
    set((state) => ({ safetyZonesVisible: !state.safetyZonesVisible })),

  /**
   * Opens the QR code modal
   */
  openQRModal: () => set({ qrModalOpen: true }),

  /**
   * Closes the QR code modal
   */
  closeQRModal: () => set({ qrModalOpen: false }),

  /**
   * Opens an input modal and returns a promise with the user's input
   * @param title - Modal title
   * @param defaultValue - Default input value
   * @returns Promise that resolves with user input or null if cancelled
   */
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

  /**
   * Closes the input modal and resolves the promise
   * @param value - The user's input value or null if cancelled
   */
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