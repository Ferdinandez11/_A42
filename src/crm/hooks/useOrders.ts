// useOrders.ts
// ✅ Hook para gestión de pedidos del cliente
import { useState, useCallback } from 'react';
import { supabase } from '@/core/lib/supabase';
import { useErrorHandler } from '@/core/hooks/useErrorHandler';

export type TabType = 'projects' | 'budgets' | 'orders' | 'archived';

export interface Order {
  id: string;
  order_ref: string;
  status: string;
  total_price: number;
  created_at: string;
  estimated_delivery_date?: string;
  is_archived: boolean;
  user_id: string;
  project_id?: string;
  projects?: {
    name: string;
  };
}

interface UseOrdersReturn {
  orders: Order[];
  loading: boolean;
  fetchOrders: (activeTab: TabType) => Promise<void>;
  reactivateOrder: (order: Order) => Promise<void>;
}

/**
 * Hook para gestionar pedidos del cliente
 * Maneja fetching y reactivación de pedidos según el tab activo
 */
export const useOrders = (): UseOrdersReturn => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const { handleError, showSuccess, showLoading, dismissToast } = useErrorHandler({
    context: 'useOrders',
  });

  const fetchOrders = useCallback(
    async (activeTab: TabType) => {
      setLoading(true);
      const loadingToast = showLoading('Cargando datos...');

      try {
        let query = supabase
          .from('orders')
          .select('*, projects(name)')
          .order('created_at', { ascending: false });

        if (activeTab === 'budgets') {
          // Solo presupuestos activos (no archivados y no rechazados)
          query = query
            .eq('is_archived', false)
            .in('status', ['pendiente', 'presupuestado']);
        } else if (activeTab === 'orders') {
          query = query
            .eq('is_archived', false)
            .in('status', [
              'pedido',
              'fabricacion',
              'entregado_parcial',
              'entregado',
              'completado',
            ]);
        } else if (activeTab === 'archived') {
          query = query.eq('is_archived', true);
        }

        const { data, error } = await query;

        if (error) throw error;

        setOrders(data || []);
        dismissToast(loadingToast);
      } catch (error) {
        dismissToast(loadingToast);
        handleError(error);
      } finally {
        setLoading(false);
      }
    },
    [handleError, showLoading, dismissToast]
  );

  const reactivateOrder = useCallback(
    async (order: Order) => {
      const loadingToast = showLoading('Reactivando presupuesto...');

      try {
        const { error } = await supabase
          .from('orders')
          .update({
            is_archived: false,
            status: 'pendiente',
            created_at: new Date().toISOString(),
          })
          .eq('id', order.id);

        if (error) throw error;

        setOrders((prev) => prev.filter((o) => o.id !== order.id));
        dismissToast(loadingToast);
        showSuccess('✅ Presupuesto reactivado');
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
    reactivateOrder,
  };
};

