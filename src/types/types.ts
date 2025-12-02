// --- src/types.ts ---

export interface Profile {
  id: string;
  email: string;
  role: 'client' | 'employee' | 'admin';
  company_name?: string;
  full_name?: string;
  shipping_address?: string;
  billing_address?: string;
  billing_email?: string;
  phone?: string;
  cif?: string;
  observations?: string;
  created_at: string;
}

export type OrderStatus = 'borrador' | 'pendiente' | 'presupuestado' | 'pedido' | 'en_proceso' | 'enviado' | 'entregado' | 'rechazado';

export interface Order {
  id: string;
  created_at: string;
  order_ref: string;
  user_id: string;
  project_id?: string;
  status: OrderStatus;
  total_price: number;
  estimated_delivery_date?: string;
  is_archived?: boolean; 
  
  // Relaciones (Supabase join)
  profiles?: Profile;
  // 👇 AQUÍ ESTABA EL ERROR: Faltaba añadir 'id: string'
  projects?: { 
    id: string; 
    name: string; 
    thumbnail_url?: string 
  };
}