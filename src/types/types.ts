// ============================================================================
// GLOBAL TYPE DEFINITIONS
// Shared types across the application
// ============================================================================

// ============================================================================
// USER & PROFILE TYPES
// ============================================================================

/**
 * User role in the system
 */
export type UserRole = 'client' | 'employee' | 'admin';

/**
 * User profile from database
 */
export interface Profile {
  // Identity
  /** Unique user identifier (matches Supabase auth.users.id) */
  id: string;
  
  /** User email address */
  email: string;
  
  /** User role for permissions */
  role: UserRole;
  
  // Company information
  /** Company name (if applicable) */
  company_name?: string;
  
  /** Full name of the user */
  full_name?: string;
  
  /** Tax identification number (CIF/NIF) */
  cif?: string;
  
  // Contact information
  /** Phone number */
  phone?: string;
  
  // Addresses
  /** Physical shipping address */
  shipping_address?: string;
  
  /** Billing address (if different from shipping) */
  billing_address?: string;
  
  /** Billing contact email (if different from main) */
  billing_email?: string;
  
  // Metadata
  /** Internal notes or observations */
  observations?: string;
  
  /** Account creation timestamp */
  created_at: string;
}

/**
 * Minimal profile info for display purposes
 */
export interface ProfileSummary {
  id: string;
  email: string;
  full_name?: string;
  company_name?: string;
}

/**
 * Profile data for registration/update
 */
export type ProfileInput = Omit<Profile, 'id' | 'created_at'>;

// ============================================================================
// ORDER TYPES
// ============================================================================

/**
 * Order status workflow
 */
export type OrderStatus =
  | 'borrador'      // Draft - being created
  | 'pendiente'     // Pending - awaiting review
  | 'presupuestado' // Quoted - price provided
  | 'pedido'        // Ordered - confirmed by customer
  | 'en_proceso'    // In process - being manufactured
  | 'enviado'       // Shipped - in transit
  | 'entregado'     // Delivered - completed
  | 'rechazado';    // Rejected - cancelled

/**
 * Order status metadata
 */
export interface OrderStatusInfo {
  status: OrderStatus;
  label: string;
  color: string;
  description: string;
}

/**
 * Map of order statuses to their display information
 */
export const ORDER_STATUS_INFO: Record<OrderStatus, OrderStatusInfo> = {
  borrador: {
    status: 'borrador',
    label: 'Borrador',
    color: '#6B7280',
    description: 'Pedido en borrador',
  },
  pendiente: {
    status: 'pendiente',
    label: 'Pendiente',
    color: '#F59E0B',
    description: 'Esperando revisión',
  },
  presupuestado: {
    status: 'presupuestado',
    label: 'Presupuestado',
    color: '#3B82F6',
    description: 'Presupuesto enviado',
  },
  pedido: {
    status: 'pedido',
    label: 'Pedido',
    color: '#8B5CF6',
    description: 'Pedido confirmado',
  },
  en_proceso: {
    status: 'en_proceso',
    label: 'En Proceso',
    color: '#06B6D4',
    description: 'En fabricación',
  },
  enviado: {
    status: 'enviado',
    label: 'Enviado',
    color: '#10B981',
    description: 'En tránsito',
  },
  entregado: {
    status: 'entregado',
    label: 'Entregado',
    color: '#22C55E',
    description: 'Completado',
  },
  rechazado: {
    status: 'rechazado',
    label: 'Rechazado',
    color: '#EF4444',
    description: 'Cancelado',
  },
};

/**
 * Project reference in orders
 */
export interface OrderProject {
  /** Project identifier */
  id: string;
  
  /** Project name */
  name: string;
  
  /** URL to project thumbnail */
  thumbnail_url?: string;
}

/**
 * Complete order from database
 */
export interface Order {
  // Identity
  /** Unique order identifier */
  id: string;
  
  /** Order creation timestamp */
  created_at: string;
  
  /** Human-readable order reference */
  order_ref: string;
  
  // Relations
  /** User who created the order */
  user_id: string;
  
  /** Associated project (if applicable) */
  project_id?: string;
  
  // Status & Pricing
  /** Current order status */
  status: OrderStatus;
  
  /** Total order price in euros */
  total_price: number;
  
  // Delivery
  /** Estimated delivery date */
  estimated_delivery_date?: string;
  
  // Management
  /** Whether order is archived */
  is_archived?: boolean;
  
  // Joined relations (from Supabase)
  /** User profile data (joined) */
  profiles?: Profile;
  
  /** Project data (joined) */
  projects?: OrderProject;
}

/**
 * Order summary for list views
 */
export interface OrderSummary {
  id: string;
  order_ref: string;
  created_at: string;
  status: OrderStatus;
  total_price: number;
  user_email?: string;
  project_name?: string;
}

/**
 * Order creation data
 */
export type OrderInput = Omit<
  Order,
  'id' | 'created_at' | 'order_ref' | 'profiles' | 'projects'
>;

/**
 * Order update data
 */
export interface OrderUpdate {
  status?: OrderStatus;
  total_price?: number;
  estimated_delivery_date?: string;
  is_archived?: boolean;
}

// ============================================================================
// PROJECT TYPES (Minimal definitions for Orders)
// ============================================================================

/**
 * Minimal project info
 * Full project types should be in a separate file
 */
export interface ProjectReference {
  id: string;
  name: string;
  thumbnail_url?: string;
  created_at?: string;
  user_id?: string;
}

// ============================================================================
// FILTER & PAGINATION TYPES
// ============================================================================

/**
 * Order filter criteria
 */
export interface OrderFilter {
  /** Filter by status */
  status?: OrderStatus;
  
  /** Filter by user */
  user_id?: string;
  
  /** Filter by date range */
  date_from?: string;
  date_to?: string;
  
  /** Filter by price range */
  min_price?: number;
  max_price?: number;
  
  /** Include archived orders */
  include_archived?: boolean;
  
  /** Search query (order_ref, user email, etc.) */
  query?: string;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  /** Page number (1-indexed) */
  page: number;
  
  /** Items per page */
  limit: number;
  
  /** Sort field */
  sort_by?: string;
  
  /** Sort direction */
  sort_order?: 'asc' | 'desc';
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  /** Data items */
  data: T[];
  
  /** Pagination metadata */
  pagination: {
    current_page: number;
    total_pages: number;
    total_items: number;
    items_per_page: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Checks if user has admin role
 */
export const isAdmin = (profile: Profile): boolean => {
  return profile.role === 'admin';
};

/**
 * Checks if user has employee role or higher
 */
export const isEmployee = (profile: Profile): boolean => {
  return profile.role === 'employee' || profile.role === 'admin';
};

/**
 * Checks if order is in final state
 */
export const isOrderFinal = (order: Order): boolean => {
  return ['entregado', 'rechazado'].includes(order.status);
};

/**
 * Checks if order can be edited
 */
export const isOrderEditable = (order: Order): boolean => {
  return ['borrador', 'pendiente'].includes(order.status);
};

/**
 * Checks if order is archived
 */
export const isOrderArchived = (order: Order): boolean => {
  return order.is_archived === true;
};