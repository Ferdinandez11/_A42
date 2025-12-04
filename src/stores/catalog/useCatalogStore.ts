import { create } from "zustand";
import type { Product } from "@/services/catalogService";

interface CatalogState {
  selectedProduct: Product | null;

  setSelectedProduct: (p: Product | null) => void;
}

export const useCatalogStore = create<CatalogState>((set) => ({
  selectedProduct: null,

  setSelectedProduct: (p) => set({ selectedProduct: p }),
}));
