// budgetTypes.ts
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

export interface CatalogItem {
  id: string;
  name: string;
  type: 'model' | 'fence' | 'floor';
  price: number;
}

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
}

export interface ModalState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  isDestructive: boolean;
}