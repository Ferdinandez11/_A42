// --- FILE: src/stores/editor/useEditorStore.ts ---
import { create } from "zustand";
import * as THREE from "three";

import type {
  SceneItem,
  FloorMaterialType,
  FenceConfig,
  EditorMode,
  CameraType,
  CameraView
} from "@/types/editor";

declare global {
  interface Window {
    editorEngine?: any;
  }
}

import { FENCE_PRESETS } from "@/features/editor/data/fence_presets";

interface InputModalState {
  isOpen: boolean;
  title: string;
  defaultValue: string;
  resolve: ((value: string | null) => void) | null;
}

interface EditorState {
  items: SceneItem[];
  totalPrice: number;

  mode: EditorMode;

  gridVisible: boolean;
  budgetVisible: boolean;
  envPanelVisible: boolean;
  safetyZonesVisible: boolean;

  sunPosition: { azimuth: number; elevation: number };
  backgroundColor: string;

  cameraType: CameraType;
  pendingView: CameraView | null;

  past: SceneItem[][];
  future: SceneItem[][];

  measurementResult: number | null;

  fenceConfig: FenceConfig;

  inputModal: InputModalState;

  // actions
  saveSnapshot: () => void;

  addItem: (item: SceneItem) => void;
  removeItem: (uuid: string) => void;
  duplicateItem: (uuid: string) => void;

  updateItemTransform: (
    uuid: string,
    pos: number[],
    rot: number[],
    scale: number[]
  ) => void;

  updateFloorMaterial: (uuid: string, material: FloorMaterialType) => void;
  updateFloorTexture: (
    uuid: string,
    url: string | undefined,
    scale: number,
    rotation: number
  ) => void;

  updateFloorPoints: (
    uuid: string,
    points: { x: number; z: number }[]
  ) => void;

  updateFencePoints: (
    uuid: string,
    points: { x: number; z: number }[]
  ) => void;

  setFenceConfig: (config: Partial<FenceConfig>) => void;
  updateItemFenceConfig: (uuid: string, config: Partial<FenceConfig>) => void;

  undo: () => void;
  redo: () => void;
  resetScene: () => void;

  setMode: (mode: EditorMode) => void;

  toggleGrid: () => void;
  toggleBudget: () => void;
  toggleEnvPanel: () => void;
  toggleSafetyZones: () => void;

  setSunPosition: (azimuth: number, elevation: number) => void;
  setBackgroundColor: (color: string) => void;

  setMeasurementResult: (dist: number | null) => void;

  setCameraType: (type: CameraType) => void;
  triggerView: (view: CameraView) => void;
  clearPendingView: () => void;

  requestInput: (title: string, defaultValue?: string) => Promise<string | null>;
  closeInputModal: (value: string | null) => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  // --- ESTADO INICIAL ---
  items: [],
  totalPrice: 0,

  mode: "idle",

  gridVisible: false,
  budgetVisible: false,
  envPanelVisible: false,
  safetyZonesVisible: false,

  sunPosition: { azimuth: 180, elevation: 45 },
  backgroundColor: "#111111",

  cameraType: "perspective",
  pendingView: null,

  measurementResult: null,

  past: [],
  future: [],

  fenceConfig: {
    presetId: "wood",
    colors: FENCE_PRESETS["wood"].defaultColors,
  },

  inputModal: {
    isOpen: false,
    title: "",
    defaultValue: "",
    resolve: null,
  },

  // -----------------------------
  // ACTIONS
  // -----------------------------
  saveSnapshot: () => {
    const snapshot = structuredClone(get().items);
    set((state) => ({
      past: [...state.past.slice(-19), snapshot],
      future: [],
    }));
  },

  addItem: (item) => {
    const price = item.price ?? 0;
    get().saveSnapshot();
    set((s) => ({
      items: [...s.items, item],
      totalPrice: s.totalPrice + price,
    }));
  },

  removeItem: (uuid) => {
    get().saveSnapshot();
    set((s) => {
      const newItems = s.items.filter((i) => i.uuid !== uuid);
      return {
        items: newItems,
        totalPrice: newItems.reduce((sum, it) => sum + it.price, 0),
        mode: "idle",
      };
    });
  },

  duplicateItem: (uuid) => {
    const s = get();
    const original = s.items.find((i) => i.uuid === uuid);
    if (!original) return;

    s.saveSnapshot();

    const cloned = structuredClone(original);
    cloned.uuid = THREE.MathUtils.generateUUID();
    cloned.position = [
      original.position[0] + 1,
      original.position[1],
      original.position[2] + 1,
    ];

    set({
      items: [...s.items, cloned],
      totalPrice: s.totalPrice + cloned.price,
      mode: "editing",
    });
  },

  updateItemTransform: (uuid, pos, rot, scale) =>
    set((s) => ({
      items: s.items.map((i) =>
        i.uuid === uuid
          ? {
              ...i,
              position: pos as [number, number, number],
              rotation: rot as [number, number, number],
              scale: scale as [number, number, number],
            }
          : i
      ),
    })),

  updateFloorMaterial: (uuid, material) =>
    set((s) => ({
      items: s.items.map((i) =>
        i.uuid === uuid && i.type === "floor"
          ? { ...i, floorMaterial: material, textureUrl: undefined }
          : i
      ),
    })),

  updateFloorTexture: (uuid, url, scale, rotation) =>
    set((s) => ({
      items: s.items.map((i) =>
        i.uuid === uuid && i.type === "floor"
          ? {
              ...i,
              textureUrl: url,
              textureScale: scale,
              textureRotation: rotation,
              floorMaterial: undefined,
            }
          : i
      ),
    })),

  updateFloorPoints: (uuid, points) => {
    get().saveSnapshot();
    set((s) => ({
      items: s.items.map((i) =>
        i.uuid === uuid && i.type === "floor" ? { ...i, points } : i
      ),
    }));
  },

  updateFencePoints: (uuid, points) => {
    get().saveSnapshot();
    set((s) => ({
      items: s.items.map((i) =>
        i.uuid === uuid && i.type === "fence" ? { ...i, points } : i
      ),
    }));
  },

  setFenceConfig: (config) =>
    set((s) => ({
      fenceConfig: { ...s.fenceConfig, ...config },
    })),

  updateItemFenceConfig: (uuid, config) => {
    get().saveSnapshot();
    set((s) => ({
      items: s.items.map((i) => {
        if (i.uuid === uuid && i.type === "fence") {
          return {
            ...i,
            fenceConfig: { ...i.fenceConfig, ...config },
          };
        }
        return i;
      }),
    }));
  },

  undo: () => {
    const { past, items, future } = get();
    if (past.length === 0) return;

    const prev = past[past.length - 1];
    set({
      items: prev,
      past: past.slice(0, -1),
      future: [items, ...future],
      mode: "idle",
      totalPrice: prev.reduce((s, i) => s + i.price, 0),
    });
  },

  redo: () => {
    const { past, items, future } = get();
    if (future.length === 0) return;

    const next = future[0];
    set({
      items: next,
      past: [...past, items],
      future: future.slice(1),
      mode: "idle",
      totalPrice: next.reduce((s, i) => s + i.price, 0),
    });
  },

  resetScene: () =>
    set({
      items: [],
      totalPrice: 0,
      mode: "idle",
      past: [],
      future: [],
      pendingView: null,
    }),

  setMode: (mode) => {
    window.editorEngine?.clearTools?.();
    set({ mode });
  },

  toggleGrid: () => set((s) => ({ gridVisible: !s.gridVisible })),
  toggleBudget: () => set((s) => ({ budgetVisible: !s.budgetVisible })),
  toggleEnvPanel: () => set((s) => ({ envPanelVisible: !s.envPanelVisible })),
  toggleSafetyZones: () =>
    set((s) => ({ safetyZonesVisible: !s.safetyZonesVisible })),

  setSunPosition: (azimuth, elevation) =>
    set({ sunPosition: { azimuth, elevation } }),

  setBackgroundColor: (color) => set({ backgroundColor: color }),

  setMeasurementResult: (dist) => set({ measurementResult: dist }),

  setCameraType: (type) => set({ cameraType: type }),
  triggerView: (view) => set({ pendingView: view }),
  clearPendingView: () => set({ pendingView: null }),

  requestInput: (title, defaultValue = "") =>
    new Promise((resolve) => {
      set({
        inputModal: {
          isOpen: true,
          title,
          defaultValue,
          resolve,
        },
      });
    }),

  closeInputModal: (value) => {
    const resolver = get().inputModal.resolve;
    resolver?.(value);

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