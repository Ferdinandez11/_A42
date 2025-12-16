// budgetTypes.ts
// ✅ CatalogItem movido a types.ts para eliminar duplicación
// Este archivo ahora solo contiene tipos específicos de presupuestos

export interface Item3D {
  uuid: string;
  name: string;
  quantity: number;
  info: string;
  price: number;
  is3D: boolean;
}

export interface ManualItem {
  id: string;
  name: string;
  quantity: number;
  total_price: number;
  dimensions: string;
  product_id: string;
}

// ✅ CatalogItem ahora se importa desde '@/crm/pages/types'
// export interface CatalogItem { ... } // Movido a types.ts

export interface Message {
  id: string;
  content: string;
  created_at: string;
  profiles?: {
    full_name: string;
    role: string;
  };
}

export interface Observation {
  id: string;
  content: string;
  created_at: string;
  profiles?: {
    full_name: string;
    role: string;
  };
}

export interface Attachment {
  id: string;
  file_name: string;
  file_url: string;
  uploader_id: string;
  created_at?: string;
}

export interface ModalState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  isDestructive: boolean;
}