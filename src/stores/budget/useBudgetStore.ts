import { create } from "zustand";

export interface ManualBudgetItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  dimensions?: string; // ejemplo: "12 m²" o "6 m"
}

interface BudgetState {
  manualItems: ManualBudgetItem[];

  discountRate: number; // porcentaje aplicado al total

  notes: string; // observaciones temporales
  isEditing: boolean;

  // === ACTIONS ===
  addManualItem: (item: ManualBudgetItem) => void;
  updateManualItem: (id: string, partial: Partial<ManualBudgetItem>) => void;
  removeManualItem: (id: string) => void;

  clearManualItems: () => void;

  setDiscountRate: (rate: number) => void;

  setNotes: (text: string) => void;
  setEditing: (state: boolean) => void;

  // Cálculos globales (derivados)
  getSubtotal: () => number;
  getFinalTotal: () => number;
}

export const useBudgetStore = create<BudgetState>((set, get) => ({
  manualItems: [],

  discountRate: 0,

  notes: "",
  isEditing: false,

  // === ACTIONS ===

  addManualItem: (item) =>
    set((s) => ({
      manualItems: [...s.manualItems, item],
    })),

  updateManualItem: (id, partial) =>
    set((s) => ({
      manualItems: s.manualItems.map((i) =>
        i.id === id ? { ...i, ...partial, totalPrice: (partial.unitPrice ?? i.unitPrice) * (partial.quantity ?? i.quantity) } : i
      ),
    })),

  removeManualItem: (id) =>
    set((s) => ({
      manualItems: s.manualItems.filter((i) => i.id !== id),
    })),

  clearManualItems: () => set({ manualItems: [] }),

  setDiscountRate: (rate) => set({ discountRate: rate }),

  setNotes: (text) => set({ notes: text }),
  setEditing: (state) => set({ isEditing: state }),

  // === CÁLCULOS ===
  getSubtotal: () => {
    const { manualItems } = get();
    return manualItems.reduce((acc, i) => acc + i.totalPrice, 0);
  },

  getFinalTotal: () => {
    const subtotal = get().getSubtotal();
    const discount = subtotal * (get().discountRate / 100);
    return subtotal - discount;
  },
}));
