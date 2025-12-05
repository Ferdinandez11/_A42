import { create } from "zustand";

export interface CatalogProduct {
  id: string;
  name: string;
  modelUrl: string;
  price: number;
  preview?: string;
}

interface CatalogState {
  isOpen: boolean;
  selectedProduct: CatalogProduct | null;
  products: CatalogProduct[];

  openCatalog: () => void;
  closeCatalog: () => void;
  selectProduct: (p: CatalogProduct | null) => void;
}

export const useCatalogStore = create<CatalogState>((set) => ({
  isOpen: false,
  selectedProduct: null,
  products: [],

  openCatalog: () => set({ isOpen: true }),
  closeCatalog: () => set({ isOpen: false }),
  selectProduct: (p) => set({ selectedProduct: p }),
}));
