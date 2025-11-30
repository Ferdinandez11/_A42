// --- START OF FILE src/stores/useAppStore.ts ---
import { create } from 'zustand';

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

export interface SceneItem {
  uuid: string;
  productId: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  type: 'model' | 'floor' | 'fence';
  modelUrl?: string; 
  points?: { x: number, z: number }[]; 
  data?: any; 
}

// Definimos los tipos de vista posibles
export type CameraView = 'top' | 'front' | 'side' | 'iso';

interface AppState {
  user: any | null;
  mode: 'idle' | 'drawing_floor' | 'drawing_fence' | 'placing_item' | 'editing' | 'catalog';
  selectedProduct: ProductDefinition | null; 
  selectedItemId: string | null;
  
  items: SceneItem[];
  totalPrice: number;
  gridVisible: boolean;
  
  // NUEVO: Control de Cámara
  cameraType: 'perspective' | 'orthographic';
  pendingView: CameraView | null; // Usamos esto para disparar la animación de cambio de vista

  past: SceneItem[][];
  future: SceneItem[][];

  setMode: (mode: AppState['mode']) => void;
  setSelectedProduct: (product: ProductDefinition | null) => void; 
  selectItem: (uuid: string | null) => void;
  toggleGrid: () => void;
  
  // NUEVAS ACCIONES DE CÁMARA
  setCameraType: (type: 'perspective' | 'orthographic') => void;
  triggerView: (view: CameraView) => void;
  clearPendingView: () => void; // Para limpiar la acción una vez ejecutada

  addItem: (item: SceneItem, price: number) => void;
  updateItemTransform: (uuid: string, pos: number[], rot: number[], scale: number[]) => void;
  removeItem: (uuid: string) => void;
  
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
  
  cameraType: 'perspective',
  pendingView: null,

  past: [],
  future: [],

  setMode: (mode) => {
    if (mode !== 'editing') set({ selectedItemId: null });
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

  // --- CÁMARA ---
  setCameraType: (type) => set({ cameraType: type }),
  triggerView: (view) => set({ pendingView: view }),
  clearPendingView: () => set({ pendingView: null }),

  saveSnapshot: () => {
    const { items, past } = get();
    const newPast = [...past, JSON.parse(JSON.stringify(items))].slice(-20);
    set({ past: newPast, future: [] }); 
  },

  addItem: (item, price) => {
    get().saveSnapshot(); 
    set((state) => ({ 
      items: [...state.items, item],
      totalPrice: state.totalPrice + price
    }));
  },

  removeItem: (uuid) => {
    get().saveSnapshot(); 
    set((state) => {
      const itemToRemove = state.items.find(i => i.uuid === uuid);
      let priceToSubtract = 0;
      if (itemToRemove) {
        priceToSubtract = (itemToRemove.productId === 'custom_floor') ? 100 : 1; 
      }
      return { 
        items: state.items.filter(i => i.uuid !== uuid),
        selectedItemId: null,
        mode: 'idle',
        totalPrice: Math.max(0, state.totalPrice - priceToSubtract)
      };
    });
  },

  updateItemTransform: (uuid, pos, rot, scale) => set((state) => ({
    items: state.items.map(i => i.uuid === uuid 
      ? { ...i, position: pos as any, rotation: rot as any, scale: scale as any } 
      : i
    )
  })),

  undo: () => set((state) => {
    if (state.past.length === 0) return {};
    const previous = state.past[state.past.length - 1];
    const newPast = state.past.slice(0, state.past.length - 1);
    return {
      items: previous,
      past: newPast,
      future: [state.items, ...state.future],
      selectedItemId: null,
      mode: 'idle'
    };
  }),

  redo: () => set((state) => {
    if (state.future.length === 0) return {};
    const next = state.future[0];
    const newFuture = state.future.slice(1);
    return {
      items: next,
      past: [...state.past, state.items],
      future: newFuture,
      selectedItemId: null,
      mode: 'idle'
    };
  }),

  resetScene: () => set({ items: [], totalPrice: 0, selectedProduct: null, mode: 'idle', selectedItemId: null, past: [], future: [], pendingView: null })
}));
// --- END OF FILE src/stores/useAppStore.ts ---