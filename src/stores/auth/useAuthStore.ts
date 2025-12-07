import { create } from "zustand";
import type { Product } from "@/services/catalogService";

/**
 * Catalog store state
 */
interface CatalogState {
  isOpen: boolean;
  selectedProduct: Product | null;

  openCatalog: () => void;
  closeCatalog: () => void;
  toggleCatalog: () => void;
  selectProduct: (product: Product | null) => void;
}

/**
 * Zustand store for catalog UI state
 * Manages catalog visibility and product selection
 */
export const useCatalogStore = create<CatalogState>((set) => ({
  isOpen: false,
  selectedProduct: null,

  openCatalog: () => set({ isOpen: true }),
  closeCatalog: () => set({ isOpen: false }),
  toggleCatalog: () => set((state) => ({ isOpen: !state.isOpen })),

  selectProduct: (product) => set({ selectedProduct: product }),
}));