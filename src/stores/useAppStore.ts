// --- TEMPORARY BRIDGE FILE ---
// Este archivo existe solo para evitar errores mientras migramos.
// TODO: eliminar completamente tras mover toda la UI a stores individuales.

import { create } from "zustand";

// Reexporta tipos antiguos desde el nuevo sistema
export * from "@/types/editor";

interface AppUIState {
  budgetVisible: boolean;
  toggleBudget: () => void;
}

export const useAppStore = create<AppUIState>((set) => ({
  // Valores mínimos para que los paneles no rompan
  budgetVisible: false,

  toggleBudget: () =>
    set((s) => ({
      budgetVisible: !s.budgetVisible,
    })),
}));
