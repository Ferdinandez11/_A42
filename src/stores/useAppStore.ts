// --- START OF FILE src/stores/useAppStore.ts ---
import { create } from 'zustand';
import * as THREE from 'three'; 

export interface ProductDefinition { 
  id: string;
  name: string;
  price: number;
  type: 'tree' | 'bench' | 'structure' | 'floor'; 
  modelUrl?: string; 
  img_2d?: string; 
  line?: string; 
  category?: string; 
}

export type FloorMaterialType = 'rubber_red' | 'rubber_green' | 'rubber_blue' | 'grass' | 'concrete';

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
  
  // Propiedades de Suelo
  floorMaterial?: FloorMaterialType;
  // Nuevas propiedades para Texturas
  textureUrl?: string;
  textureScale?: number;
  textureRotation?: number;

  data?: any; 
}

export type CameraView = 'top' | 'front' | 'side' | 'iso';

interface AppState {
  user: any | null;
  mode: 'idle' | 'drawing_floor' | 'drawing_fence' | 'placing_item' | 'editing' | 'catalog' | 'measuring';
  
  selectedProduct: ProductDefinition | null; 
  selectedItemId: string | null;
  
  items: SceneItem[];
  totalPrice: number;
  gridVisible: boolean;
  budgetVisible: boolean;
  
  // Entorno
  envPanelVisible: boolean;
  sunPosition: { azimuth: number; elevation: number };
  backgroundColor: string;

  // Medición
  measurementResult: number | null;

  cameraType: 'perspective' | 'orthographic';
  pendingView: CameraView | null;

  past: SceneItem[][];
  future: SceneItem[][];

  // Acciones
  setMode: (mode: AppState['mode']) => void;
  setSelectedProduct: (product: ProductDefinition | null) => void; 
  selectItem: (uuid: string | null) => void;
  toggleGrid: () => void;
  toggleBudget: () => void;
  
  // Acciones Entorno
  toggleEnvPanel: () => void;
  setSunPosition: (azimuth: number, elevation: number) => void;
  setBackgroundColor: (color: string) => void;

  // Acciones Medición
  setMeasurementResult: (dist: number | null) => void;

  // Acciones Items
  addItem: (item: SceneItem) => void; 
  updateItemTransform: (uuid: string, pos: number[], rot: number[], scale: number[]) => void;
  
  // Acciones Suelo
  updateFloorMaterial: (uuid: string, material: FloorMaterialType) => void;
  updateFloorTexture: (uuid: string, url: string | undefined, scale: number, rotation: number) => void; // Nuevo
  updateFloorPoints: (uuid: string, points: { x: number, z: number }[]) => void;
  
  removeItem: (uuid: string) => void;
  duplicateItem: (uuid: string) => void; 
  
  // Vistas y deshacer
  setCameraType: (type: 'perspective' | 'orthographic') => void;
  triggerView: (view: CameraView) => void;
  clearPendingView: () => void;
  saveSnapshot: () => void;
  undo: () => void;
  redo: () => void;
  resetScene: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({ 
  user: null,
  mode: 'idle',
  selectedProduct: null,
  selectedItemId: null,
  items: [],
  totalPrice: 0,
  gridVisible: false,
  budgetVisible: false, 
  
  // Valores iniciales
  envPanelVisible: false,
  sunPosition: { azimuth: 180, elevation: 45 },
  backgroundColor: '#111111',
  measurementResult: null,
  cameraType: 'perspective',
  pendingView: null,

  past: [],
  future: [],

  setMode: (mode) => {
    if (mode !== 'editing') set({ selectedItemId: null });
    // Si cambiamos de modo, reseteamos la medición
    if (mode !== 'measuring') set({ measurementResult: null });
    set({ mode });
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
      mode: uuid ? 'editing' : 'idle' 
    });
  },

  toggleGrid: () => set((state) => ({ gridVisible: !state.gridVisible })),
  toggleBudget: () => set((state) => ({ budgetVisible: !state.budgetVisible })),

  // Entorno
  toggleEnvPanel: () => set((state) => ({ envPanelVisible: !state.envPanelVisible })),
  setSunPosition: (azimuth, elevation) => set({ sunPosition: { azimuth, elevation } }),
  setBackgroundColor: (color) => set({ backgroundColor: color }),

  // Medición
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

  // NUEVA ACCIÓN TEXTURAS
  updateFloorTexture: (uuid, url, scale, rotation) => set((state) => ({
    items: state.items.map(i => i.uuid === uuid ? { 
      ...i, 
      textureUrl: url, 
      textureScale: scale, 
      textureRotation: rotation,
      floorMaterial: undefined // Limpiamos material sólido si hay textura
    } : i)
  })),

  updateFloorPoints: (uuid, points) => set((state) => ({
    items: state.items.map(i => i.uuid === uuid ? { ...i, points: points } : i)
  })),

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

  resetScene: () => set({ items: [], totalPrice: 0, selectedProduct: null, mode: 'idle', selectedItemId: null, past: [], future: [], pendingView: null })
}));
// --- END OF FILE src/stores/useAppStore.ts ---