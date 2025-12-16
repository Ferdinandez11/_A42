// types.ts
export interface OrderData {
  id: string;
  order_ref: string;
  status: OrderStatus;
  custom_name?: string | null;
  estimated_delivery_date?: string | null;
  total_price: number;
  project_id?: string | null;
  is_archived?: boolean;
  profiles?: {
    full_name: string;
    role: string;
    discount_rate: number;
  };
  projects?: {
    data?: {
      items?: Record<string, unknown>[];
    };
    items?: Record<string, unknown>[];
  };
}

export type OrderStatus = 
  | 'pendiente' 
  | 'presupuestado' 
  | 'pedido' 
  | 'en_proceso' 
  | 'enviado'
  | 'entregado' 
  | 'rechazado' 
  | 'cancelado';

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

export interface ManualItem {
  id: string;
  name: string;
  quantity: number;
  total_price: number;
  dimensions: string;
  product_id: string;
}

export interface Item3D {
  name: string;
  quantity: number;
  totalPrice: number;
}

export interface CatalogItem {
  id: string;
  name: string;
  type: 'model' | 'fence' | 'floor';
  price: number;
}