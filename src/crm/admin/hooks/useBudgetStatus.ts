// ============================================================================
// USE BUDGET STATUS - Hook for managing budget/order status changes
// ============================================================================

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/core/lib/supabase';
import { useErrorHandler } from '@/core/hooks/useErrorHandler';
import type { Order, OrderStatus } from '@/domain/types/types';
import type { BudgetTotals } from '../utils/budgetCalculations';

interface UseBudgetStatusReturn {
  handleStatusChange: (orderId: string, status: string, totals: BudgetTotals) => Promise<void>;
  handleDelete: (orderId: string) => Promise<void>;
  handleCancelOrder: (orderId: string) => Promise<void>;
}

/**
 * Hook for managing budget/order status changes and deletions
 */
export const useBudgetStatus = (): UseBudgetStatusReturn => {
  const navigate = useNavigate();
  const { handleError, showSuccess, showLoading, dismissToast } = useErrorHandler({
    context: 'useBudgetStatus',
  });

  const handleStatusChange = useCallback(
    async (orderId: string, status: string, totals: BudgetTotals) => {
      const loadingToast = showLoading(
        status === 'pedido' ? 'Confirmando pedido...' : 'Rechazando presupuesto...'
      );

      try {
        const update: Partial<Order> = {
          status: status as OrderStatus,
          total_price: totals.final,
        };

        // Si el presupuesto se rechaza, lo marcamos como archivado
        if (status === 'rechazado') {
          (update as any).is_archived = true;
        }

        if (status === 'pedido') {
          const d = new Date();
          d.setDate(d.getDate() + 42);
          update.estimated_delivery_date = d.toISOString();
        }

        const { error } = await supabase
          .from('orders')
          .update(update)
          .eq('id', orderId);

        if (error) throw error;

        dismissToast(loadingToast);
        showSuccess(
          status === 'pedido'
            ? '✅ Pedido confirmado. ¡Pasando a fabricación!'
            : '✅ Presupuesto archivado'
        );

        if (status === 'pedido') navigate('/portal?tab=orders');
        else navigate('/portal?tab=archived');
      } catch (error) {
        dismissToast(loadingToast);
        handleError(error);
        throw error;
      }
    },
    [handleError, showSuccess, showLoading, dismissToast, navigate]
  );

  const handleDelete = useCallback(
    async (orderId: string) => {
      const loadingToast = showLoading('Eliminando solicitud...');

      try {
        const { error } = await supabase.from('orders').delete().eq('id', orderId);

        if (error) throw error;

        dismissToast(loadingToast);
        showSuccess('✅ Solicitud eliminada');
        navigate('/portal?tab=orders');
      } catch (error) {
        dismissToast(loadingToast);
        handleError(error);
        throw error;
      }
    },
    [handleError, showSuccess, showLoading, dismissToast, navigate]
  );

  const handleCancelOrder = useCallback(
    async (orderId: string) => {
      const loadingToast = showLoading('Cancelando pedido...');

      try {
        const { error } = await supabase
          .from('orders')
          .update({ status: 'cancelado', is_archived: true })
          .eq('id', orderId);

        if (error) throw error;

        dismissToast(loadingToast);
        showSuccess('✅ Pedido cancelado');
        navigate('/portal?tab=archived');
      } catch (error) {
        dismissToast(loadingToast);
        handleError(error);
        throw error;
      }
    },
    [handleError, showSuccess, showLoading, dismissToast, navigate]
  );

  return {
    handleStatusChange,
    handleDelete,
    handleCancelOrder,
  };
};

