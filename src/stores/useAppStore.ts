import { create } from 'zustand';
import * as THREE from 'three'; 
import { FENCE_PRESETS } from '../features/editor/data/fence_presets';

// ... (MANTÉN TUS INTERFACES ANTERIORES: ProductDefinition, SceneItem, etc. IGUALES) ...
export interface ProductDefinition { 
  id: string;
  name: string;
  price: number;
  type: 'tree' | 'bench' | 'structure' | 'floor'; 
  modelUrl?: string; 
  img_2d?: string; 
  line?: string; 
  category?: string;
  url_tech?: string;
  url_cert?: string;
  url_inst?: string;
}

export type FloorMaterialType = 'rubber_red' | 'rubber_green' | 'rubber_blue' | 'grass' | 'concrete';

export interface FenceConfig {
    presetId: string;
    colors: { post: number; slatA: number; slatB?: number; slatC?: number };
}

export interface SceneItem {
  uuid: string;
  productId: string;
  name?: string; 
  price: number; 
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  type: 'model' | 'floor' | 'fence';
  modelUrl?: string; 
  points?: { x: number, z: number }[]; 
  floorMaterial?: FloorMaterialType;
  textureUrl?: string;
  textureScale?: number;
  textureRotation?: number;
  fenceConfig?: FenceConfig;
  url_tech?: string;
  url_cert?: string;
  url_inst?: string;
  data?: any; 
}

export type CameraView = 'top' | 'front' | 'side' | 'iso';

interface AppState {
  // --- AUTH & PROJECT STATE (NUEVO) ---
  user: any | null;
  currentProjectId: string | null;
  currentProjectName: string | null;

  setUser: (user: any) => void;
  setProjectInfo: (id: string | null, name: string | null) => void;

  // --- RESTO DE TU ESTADO EXISTENTE ---
  mode: 'idle' | 'drawing_floor' | 'drawing_fence' | 'placing_item' | 'editing' | 'catalog' | 'measuring';
  selectedProduct: ProductDefinition | null; 
  selectedItemId: string | null;
  items: SceneItem[];
  totalPrice: number;
  gridVisible: boolean;
  budgetVisible: boolean;
  envPanelVisible: boolean;
  sunPosition: { azimuth: number; elevation: number };
  backgroundColor: string;
  measurementResult: number | null;
  cameraType: 'perspective' | 'orthographic';
  pendingView: CameraView | null;
  past: SceneItem[][];
  future: SceneItem[][];
  selectedVertexIndices: number[];
  measuredDistance: number | null;
  measuredAngle: number | null;
  fenceConfig: FenceConfig;
  inputModal: {
    isOpen: boolean;
    title: string;
    defaultValue: string;
    resolve: ((value: string | null) => void) | null;
  };
  safetyZonesVisible: boolean;

  // Acciones
  setMode: (mode: AppState['mode']) => void;
  setSelectedProduct: (product: ProductDefinition | null) => void; 
  selectItem: (uuid: string | null) => void;
  toggleGrid: () => void;
  toggleBudget: () => void;
  toggleEnvPanel: () => void;
  setSunPosition: (azimuth: number, elevation: number) => void;
  setBackgroundColor: (color: string) => void;
  setMeasurementResult: (dist: number | null) => void;
  addItem: (item: SceneItem) => void; 
  updateItemTransform: (uuid: string, pos: number[], rot: number[], scale: number[]) => void;
  updateFloorMaterial: (uuid: string, material: FloorMaterialType) => void;
  updateFloorTexture: (uuid: string, url: string | undefined, scale: number, rotation: number) => void;
  updateFloorPoints: (uuid: string, points: { x: number, z: number }[]) => void;
  setFenceConfig: (config: Partial<FenceConfig>) => void; 
  updateItemFenceConfig: (uuid: string, config: Partial<FenceConfig>) => void; 
  removeItem: (uuid: string) => void;
  duplicateItem: (uuid: string) => void; 
  setCameraType: (type: 'perspective' | 'orthographic') => void;
  triggerView: (view: CameraView) => void;
  clearPendingView: () => void;
  saveSnapshot: () => void;
  undo: () => void;
  redo: () => void;
  resetScene: () => void;
  setSelectedVertices: (indices: number[], distance: number | null, angle: number | null) => void;
  requestInput: (title: string, defaultValue?: string) => Promise<string | null>;
  closeInputModal: (value: string | null) => void;
  toggleSafetyZones: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({ 
  // --- INITIAL STATE ---
  user: null,
  currentProjectId: null,
  currentProjectName: null,
  
  setUser: (user) => set({ user }),
  setProjectInfo: (id, name) => set({ currentProjectId: id, currentProjectName: name }),

  // ... (RESTO DE TU ESTADO INICIAL IGUAL QUE ANTES) ...
  mode: 'idle',
  selectedProduct: null,
  selectedItemId: null,
  items: [],
  totalPrice: 0,
  gridVisible: false,
  budgetVisible: false, 
  envPanelVisible: false,
  sunPosition: { azimuth: 180, elevation: 45 },
  backgroundColor: '#111111',
  measurementResult: null,
  cameraType: 'perspective',
  pendingView: null,
  past: [],
  future: [],
  selectedVertexIndices: [],
  measuredDistance: null,
  measuredAngle: null,
  fenceConfig: {
    presetId: 'wood',
    colors: FENCE_PRESETS['wood'].defaultColors
  },
  safetyZonesVisible: false,
  inputModal: {
    isOpen: false,
    title: '',
    defaultValue: '',
    resolve: null,
  },

  // ... (ACTIONS - COPIA TUS ACCIONES EXISTENTES AQUÍ, requestInput, etc.) ...
  requestInput: (title: string, defaultValue = '') => {
    return new Promise((resolve) => {
      set({
        inputModal: {
          isOpen: true,
          title,
          defaultValue,
          resolve, 
        },
      });
    });
  },

  closeInputModal: (value: string | null) => {
    const { resolve } = get().inputModal;
    if (resolve) resolve(value); 
    set({
      inputModal: { isOpen: false, title: '', defaultValue: '', resolve: null },
    });
  },

  toggleSafetyZones: () => set((state) => ({ safetyZonesVisible: !state.safetyZonesVisible })),

  setMode: (mode) => {
    if (mode !== 'editing') set({ selectedItemId: null });
    if (mode !== 'measuring') set({ measurementResult: null });
    // @ts-ignore
    if (window.editorEngine) window.editorEngine.clearTools();
    set({ mode, selectedVertexIndices: [], measuredDistance: null, measuredAngle: null });
  },

  setSelectedProduct: (product) => set({ 
    selectedProduct: product, 
    mode: product ? 'placing_item' : 'idle',
    selectedItemId: null 
  }),

  selectItem: (uuid) => {
    set({ 
      selectedItemId: uuid, 
      selectedProduct: null, 
      mode: uuid ? 'editing' : 'idle',
      selectedVertexIndices: [],
      measuredDistance: null,
      measuredAngle: null
    });
  },

  toggleGrid: () => set((state) => ({ gridVisible: !state.gridVisible })),
  toggleBudget: () => set((state) => ({ budgetVisible: !state.budgetVisible })),
  toggleEnvPanel: () => set((state) => ({ envPanelVisible: !state.envPanelVisible })),
  setSunPosition: (azimuth, elevation) => set({ sunPosition: { azimuth, elevation } }),
  setBackgroundColor: (color) => set({ backgroundColor: color }),
  setMeasurementResult: (dist) => set({ measurementResult: dist }),
  setCameraType: (type) => set({ cameraType: type }),
  triggerView: (view) => set({ pendingView: view }),
  clearPendingView: () => set({ pendingView: null }),

  saveSnapshot: () => {
    const { items, past } = get();
    const newPast = [...past, JSON.parse(JSON.stringify(items))].slice(-20);
    set({ past: newPast, future: [] }); 
  },

  addItem: (item) => {
    get().saveSnapshot(); 
    set((state) => ({ 
      items: [...state.items, item],
      totalPrice: state.totalPrice + item.price 
    }));
  },

  removeItem: (uuid) => {
    get().saveSnapshot(); 
    set((state) => {
      const itemToRemove = state.items.find(i => i.uuid === uuid);
      const priceToSubtract = itemToRemove ? itemToRemove.price : 0;
      return { 
        items: state.items.filter(i => i.uuid !== uuid),
        selectedItemId: null,
        mode: 'idle',
        totalPrice: Math.max(0, state.totalPrice - priceToSubtract)
      };
    });
  },

  duplicateItem: (uuid) => {
    const state = get();
    const originalItem = state.items.find(i => i.uuid === uuid);
    if (!originalItem) return;
    state.saveSnapshot();
    const newItem: SceneItem = JSON.parse(JSON.stringify(originalItem));
    newItem.uuid = THREE.MathUtils.generateUUID(); 
    newItem.position = [originalItem.position[0] + 1, originalItem.position[1], originalItem.position[2] + 1];
    set({
      items: [...state.items, newItem],
      totalPrice: state.totalPrice + newItem.price,
      selectedItemId: newItem.uuid, 
      mode: 'editing'
    });
  },

  updateItemTransform: (uuid, pos, rot, scale) => set((state) => ({
    items: state.items.map(i => i.uuid === uuid 
      ? { ...i, position: pos as any, rotation: rot as any, scale: scale as any } 
      : i
    )
  })),

  updateFloorMaterial: (uuid, material) => set((state) => ({
    items: state.items.map(i => i.uuid === uuid ? { ...i, floorMaterial: material, textureUrl: undefined } : i)
  })),

  updateFloorTexture: (uuid, url, scale, rotation) => set((state) => ({
    items: state.items.map(i => i.uuid === uuid ? { 
      ...i, 
      textureUrl: url, 
      textureScale: scale, 
      textureRotation: rotation,
      floorMaterial: undefined 
    } : i)
  })),

  updateFloorPoints: (uuid, points) => {
    get().saveSnapshot(); 
    set((state) => ({
      items: state.items.map(i => i.uuid === uuid ? { ...i, points: points } : i)
    }));
  },

  setFenceConfig: (config) => set((state) => ({
      fenceConfig: { ...state.fenceConfig, ...config }
  })),

  updateItemFenceConfig: (uuid, config) => {
    get().saveSnapshot();
    set((state) => ({
      items: state.items.map(i => {
         if (i.uuid === uuid && i.fenceConfig) {
             return { ...i, fenceConfig: { ...i.fenceConfig, ...config } };
         }
         return i;
      })
    }));
  },

  undo: () => set((state) => {
    if (state.past.length === 0) return {};
    const previous = state.past[state.past.length - 1];
    const newPast = state.past.slice(0, state.past.length - 1);
    const prevTotal = previous.reduce((sum, item) => sum + item.price, 0);
    return {
      items: previous,
      past: newPast,
      future: [state.items, ...state.future],
      selectedItemId: null,
      mode: 'idle',
      totalPrice: prevTotal
    };
  }),

  redo: () => set((state) => {
    if (state.future.length === 0) return {};
    const next = state.future[0];
    const newFuture = state.future.slice(1);
    const nextTotal = next.reduce((sum, item) => sum + item.price, 0);
    return {
      items: next,
      past: [...state.past, state.items],
      future: newFuture,
      selectedItemId: null,
      mode: 'idle',
      totalPrice: nextTotal
    };
  }),

  resetScene: () => set({ 
    items: [], 
    totalPrice: 0, 
    selectedProduct: null, 
    mode: 'idle', 
    selectedItemId: null, 
    past: [], 
    future: [], 
    pendingView: null 
  }),

  setSelectedVertices: (indices, distance, angle) => set({ 
    selectedVertexIndices: indices, 
    measuredDistance: distance,
    measuredAngle: angle
  }),
}));