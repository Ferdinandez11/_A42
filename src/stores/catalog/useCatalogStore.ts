// --- START OF FILE useCatalogStore.ts ---
import { create } from "zustand";

/**
 * Catalog product type
 * Can be extended with more specific properties as needed
 */
interface CatalogProduct {
  id: string;
  name: string;
  price?: number;
  type?: string;
  [key: string]: any;
}

/**
 * Catalog store state
 * Manages catalog modal visibility and product selection
 */
interface CatalogState {
  isOpen: boolean;
  selectedProduct: CatalogProduct | null;

  openCatalog: () => void;
  closeCatalog: () => void;
  toggleCatalog: () => void;

  selectProduct: (product: CatalogProduct | null) => void;
}

/**
 * Zustand store for catalog management
 * 
 * This is a simple UI state store with no async operations,
 * so it doesn't require error handling.
 */
export const useCatalogStore = create<CatalogState>((set) => ({
  isOpen: false,
  selectedProduct: null,

  openCatalog: () => set({ isOpen: true }),
  closeCatalog: () => set({ isOpen: false }),
  toggleCatalog: () => set((s) => ({ isOpen: !s.isOpen })),

  selectProduct: (product) => set({ selectedProduct: product }),
}));
// --- END OF FILE ---