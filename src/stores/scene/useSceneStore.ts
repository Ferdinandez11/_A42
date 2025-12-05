import { create } from "zustand";
import type { Vector3Array } from "@/types/editor";

export interface SceneItem {
  uuid: string;
  productId: string;
  name: string;

  // Precio actual según catálogo o cálculo paramétrico
  price: number;

  // Transformaciones básicas
  position: Vector3Array; // [x, y, z]
  rotation: Vector3Array; // [x, y, z]
  scale: Vector3Array;    // [x, y, z]

  // Metadata opcional
  description?: string;
  url_tech?: string;
  url_cert?: string;
  url_inst?: string;

  // Datos del catálogo completo si se necesita
  data?: any;

  // Campos especiales (suelos y vallas)
  type?: "model" | "floor" | "fence";
  info?: string; // Ej: "12 m²" o "6 m"
}

interface SceneState {
  items: SceneItem[];

  // === ACTIONS ===
  addItem: (item: SceneItem) => void;
  updateItem: (uuid: string, partial: Partial<SceneItem>) => void;
  removeItem: (uuid: string) => void;

  clearScene: () => void;

  // Sync para transforms (motor 3D → store)
  setItemTransform: (
    uuid: string,
    position: Vector3Array,
    rotation: Vector3Array,
    scale: Vector3Array
  ) => void;

  // Reemplaza todos los items (cargar proyecto)
  setItems: (items: SceneItem[]) => void;
}

export const useSceneStore = create<SceneState>((set) => ({
  items: [],

  // =====================================================
  // ADD ITEM
  // =====================================================
  addItem: (item) =>
    set((s) => ({
      items: [...s.items, item],
    })),

  // =====================================================
  // UPDATE ITEM
  // =====================================================
  updateItem: (uuid, partial) =>
    set((s) => ({
      items: s.items.map((it) =>
        it.uuid === uuid ? { ...it, ...partial } : it
      ),
    })),

  // =====================================================
  // REMOVE ITEM
  // =====================================================
  removeItem: (uuid) =>
    set((s) => ({
      items: s.items.filter((it) => it.uuid !== uuid),
    })),

  // =====================================================
  // SET TRANSFORMS (motor 3D → estado limpio)
  // =====================================================
  setItemTransform: (uuid, position, rotation, scale) =>
    set((s) => ({
      items: s.items.map((it) =>
        it.uuid === uuid
          ? { ...it, position, rotation, scale }
          : it
      ),
    })),

  // =====================================================
  // REEMPLAZAR ESCENA ENTERA (al cargar proyecto)
  // =====================================================
  setItems: (items) => set({ items }),

  // =====================================================
  // LIMPIAR ESCENA
  // =====================================================
  clearScene: () => set({ items: [] }),
}));
