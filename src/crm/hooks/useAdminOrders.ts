// useAdminOrders.ts
// ✅ Hook para gestión de pedidos en el panel admin
import { useState, useCallback } from 'react';
import { supabase } from '@/core/lib/supabase';
import { useErrorHandler } from '@/core/hooks/useErrorHandler';

export type DashboardTab = 'clients' | 'budgets' | 'orders';

export type OrderStatus =
  | 'borrador'
  | 'pendiente'
  | 'presupuestado'
  | 'pedido'
  | 'en_proceso'
  | 'enviado'
  | 'entregado'
  | 'rechazado';

export interface AdminOrder {
  id: string;
  order_ref: string;
  status: OrderStatus;
  total_price: number;
  created_at: string;
  estimated_delivery_date?: string;
  custom_name?: string;
  user_id: string;
  profiles?: {
    company_name?: string;
    email?: string;
    discount_rate?: number;
  };
  projects?: { name: string };
  order_messages?: Array<{
    created_at: string;
    profiles?: { role: string };
  }>;
}

const BUDGET_STATUSES: OrderStatus[] = ['pendiente', 'presupuestado', 'rechazado'];
const ORDER_STATUSES: OrderStatus[] = [
  'pedido',
  'en_proceso',
  'enviado',
  'entregado',
  'rechazado',
];

interface UseAdminOrdersReturn {
  orders: AdminOrder[];
  loading: boolean;
  fetchOrders: (activeTab: DashboardTab) => Promise<void>;
  updateOrderStatus: (id: string, status: OrderStatus, estimatedDelivery?: string) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
}

/**
 * Hook para gestionar pedidos en el panel administrativo
 */
export const useAdminOrders = (): UseAdminOrdersReturn => {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const { handleError, showSuccess, showLoading, dismissToast } = useErrorHandler({
    context: 'useAdminOrders',
  });

  const fetchOrders = useCallback(
    async (activeTab: DashboardTab) => {
      if (activeTab === 'clients') {
        setOrders([]);
        return;
      }

      setLoading(true);

      try {
        let query = supabase
          .from('orders')
          .select(`
            *,
            profiles(company_name, email, discount_rate),
            projects(name),
            order_messages(created_at, profiles(role))
          `)
          .order('created_at', { ascending: false });

        if (activeTab === 'budgets') {
          query = query.in('status', BUDGET_STATUSES);
        } else if (activeTab === 'orders') {
          query = query.in('status', ORDER_STATUSES);
        }

        const { data, error } = await query;
        if (error) throw error;

        setOrders(data || []);
      } catch (error) {
        handleError(error);
      } finally {
        setLoading(false);
      }
    },
    [handleError]
  );

  const updateOrderStatus = useCallback(
    async (id: string, status: OrderStatus, estimatedDelivery?: string) => {
      const loadingToast = showLoading('Actualizando estado...');

      try {
        const updateData: Partial<AdminOrder> = { status };
        if (estimatedDelivery) {
          updateData.estimated_delivery_date = estimatedDelivery;
        }

        const { error } = await supabase
          .from('orders')
          .update(updateData)
          .eq('id', id);

        if (error) throw error;

        setOrders((prev) =>
          prev.map((order) =>
            order.id === id ? { ...order, ...updateData } : order
          )
        );

        dismissToast(loadingToast);
        showSuccess('✅ Estado actualizado');
      } catch (error) {
        dismissToast(loadingToast);
        handleError(error);
        throw error;
      }
    },
    [handleError, showSuccess, showLoading, dismissToast]
  );

  const deleteOrder = useCallback(
    async (id: string) => {
      const loadingToast = showLoading('Eliminando...');

      try {
        const { error } = await supabase.from('orders').delete().eq('id', id);

        if (error) throw error;

        setOrders((prev) => prev.filter((order) => order.id !== id));
        dismissToast(loadingToast);
        showSuccess('✅ Registro eliminado');
      } catch (error) {
        dismissToast(loadingToast);
        handleError(error);
        throw error;
      }
    },
    [handleError, showSuccess, showLoading, dismissToast]
  );

  return {
    orders,
    loading,
    fetchOrders,
    updateOrderStatus,
    deleteOrder,
  };
};

