// --- START OF FILE useCatalogStore.ts ---
import { create } from "zustand";

interface CatalogState {
  isOpen: boolean;
  selectedProduct: any;

  openCatalog: () => void;
  closeCatalog: () => void;
  toggleCatalog: () => void;

  selectProduct: (product: any) => void;
}

export const useCatalogStore = create<CatalogState>((set) => ({
  isOpen: false,
  selectedProduct: null,

  openCatalog: () => set({ isOpen: true }),
  closeCatalog: () => set({ isOpen: false }),
  toggleCatalog: () => set((s) => ({ isOpen: !s.isOpen })),

  selectProduct: (product) => set({ selectedProduct: product }),
}));
// --- END OF FILE ---
