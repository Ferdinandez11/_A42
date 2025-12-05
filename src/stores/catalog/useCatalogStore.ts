import { create } from "zustand";
import type { ProductDefinition } from "@/types/catalog";

interface CatalogState {
  // Catálogo ya cargado y normalizado
  catalog: ProductDefinition[];

  // Estado de navegación
  currentLine: string | null;
  currentCategory: string | null;

  // Buscador
  searchTerm: string;

  // Producto actualmente seleccionado en el catálogo
  selectedProduct: ProductDefinition | null;

  // ==== ACTIONS ====
  setCatalog: (items: ProductDefinition[]) => void;

  setLine: (line: string | null) => void;
  setCategory: (category: string | null) => void;

  setSearchTerm: (term: string) => void;

  selectProduct: (product: ProductDefinition | null) => void;

  clearNavigation: () => void;
  clearSearch: () => void;
}

export const useCatalogStore = create<CatalogState>((set) => ({
  // === DEFAULT STATE ===
  catalog: [],

  currentLine: null,
  currentCategory: null,

  searchTerm: "",

  selectedProduct: null,

  // === ACTIONS ===
  setCatalog: (items) => set({ catalog: items }),

  setLine: (line) =>
    set({
      currentLine: line,
      currentCategory: null, // reset category when line changes
      searchTerm: "",
    }),

  setCategory: (category) =>
    set({
      currentCategory: category,
      searchTerm: "",
    }),

  setSearchTerm: (term) => set({ searchTerm: term }),

  selectProduct: (product) => set({ selectedProduct: product }),

  clearNavigation: () =>
    set({
      currentLine: null,
      currentCategory: null,
    }),

  clearSearch: () => set({ searchTerm: "" }),
}));
