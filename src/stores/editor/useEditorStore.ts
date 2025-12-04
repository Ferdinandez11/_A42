import { create } from "zustand";
import type { SceneItem, FenceConfig, FloorMaterialType } from "@/types/editor";

export type EditorMode =
  | "idle"
  | "placing_item"
  | "editing"
  | "measuring";

export type CameraView = "top" | "front" | "side" | "iso";

interface EditorState {
  // --- Scene ---
  items: SceneItem[];
  fenceConfig: FenceConfig;

  // --- UI / Tools ---
  mode: EditorMode;
  gridVisible: boolean;
  backgroundColor: string;
  sunPosition: { azimuth: number; elevation: number };
  safetyZonesVisible: boolean;

  // --- Camera ---
  cameraType: "perspective" | "orthographic";
  pendingView: CameraView | null;

  // --- Pricing ---
  totalPrice: number;

  // --- Actions ---
  setMode: (mode: EditorMode) => void;

  setGridVisible: (value: boolean) => void;
  setBackgroundColor: (value: string) => void;
  updateSunPosition: (az: number, el: number) => void;
  toggleSafetyZones: () => void;

  setCameraType: (t: "perspective" | "orthographic") => void;
  triggerView: (v: CameraView) => void;
  clearPendingView: () => void;

  // --- Scene actions ---
  addItem: (item: SceneItem) => void;
  updateItemTransform: (uuid: string, pos: number[], rot: number[], scale: number[]) => void;
  updateFloorMaterial: (uuid: string, material: FloorMaterialType) => void;
  updateFloorTexture: (uuid: string, url: string | undefined, scale: number, rotation: number) => void;
  updateFloorPoints: (uuid: string, points: { x: number; z: number }[]) => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  // -----------------------------------
  // INITIAL STATE
  // -----------------------------------
  items: [],
  fenceConfig: { presetId: "wood", colors: { post: 0, slatA: 0 } },

  mode: "idle",
  gridVisible: true,
  backgroundColor: "#111111",
  sunPosition: { azimuth: 180, elevation: 45 },
  safetyZonesVisible: false,

  cameraType: "perspective",
  pendingView: null,

  totalPrice: 0,

  // -----------------------------------
  // ACTIONS
  // -----------------------------------
  setMode: (mode) =>
    set({
      mode,
    }),

  setGridVisible: (value) =>
    set({
      gridVisible: value,
    }),

  setBackgroundColor: (value) =>
    set({
      backgroundColor: value,
    }),

  updateSunPosition: (azimuth, elevation) =>
    set({
      sunPosition: { azimuth, elevation },
    }),

  toggleSafetyZones: () =>
    set((s) => ({
      safetyZonesVisible: !s.safetyZonesVisible,
    })),

  setCameraType: (t) =>
    set({
      cameraType: t,
    }),

  triggerView: (v) =>
    set({
      pendingView: v,
    }),

  clearPendingView: () =>
    set({
      pendingView: null,
    }),

  // -----------------------------------
  // SCENE UPDATE ACTIONS
  // -----------------------------------
  addItem: (item) => {
    const items = [...get().items, item];
    const newTotal = items.reduce((s, i) => s + (i.price || 0), 0);

    set({
      items,
      totalPrice: newTotal,
    });
  },

  updateItemTransform: (uuid, pos, rot, scale) => {
    const newList = get().items.map((i) =>
      i.uuid === uuid
        ? { ...i, position: pos as any, rotation: rot as any, scale: scale as any }
        : i
    );

    set({ items: newList });
  },

  updateFloorMaterial: (uuid, material) => {
    const newList = get().items.map((i) =>
      i.uuid === uuid ? { ...i, floorMaterial: material, textureUrl: undefined } : i
    );

    set({ items: newList });
  },

  updateFloorTexture: (uuid, url, scale, rotation) => {
    const newList = get().items.map((i) =>
      i.uuid === uuid
        ? {
            ...i,
            textureUrl: url,
            textureScale: scale,
            textureRotation: rotation,
            floorMaterial: undefined,
          }
        : i
    );

    set({ items: newList });
  },

  updateFloorPoints: (uuid, points) => {
    const newList = get().items.map((i) =>
      i.uuid === uuid ? { ...i, points } : i
    );

    set({ items: newList });
  },
}));
