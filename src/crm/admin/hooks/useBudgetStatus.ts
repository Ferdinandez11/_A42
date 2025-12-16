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
  handleReactivate: (orderId: string) => Promise<void>;
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

        // Al aceptar presupuesto: calcular fecha de entrega = aceptación + 6 semanas
        if (status === 'pedido') {
          const d = new Date();
          d.setDate(d.getDate() + 42); // 6 semanas = 42 días
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
            ? '✅ Presupuesto aceptado. El pedido ha pasado a "Mis Pedidos"'
            : '✅ Presupuesto archivado'
        );

        // Al aceptar presupuesto, navegar a Mis Pedidos
        // Al rechazar, navegar a archivados
        if (status === 'pedido') {
          navigate('/portal');
          // El componente recargará con el tab correcto automáticamente
        } else {
          navigate('/portal?tab=archived');
        }
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
      const loadingToast = showLoading('Eliminando...');

      try {
        const { error } = await supabase.from('orders').delete().eq('id', orderId);

        if (error) throw error;

        dismissToast(loadingToast);
        showSuccess('✅ Eliminado definitivamente');
        navigate('/portal?tab=archived');
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
      const loadingToast = showLoading('Archivando pedido...');

      try {
        // El cliente solo puede archivar pedidos en estado 'pedido' (pendiente de aceptación por admin)
        // No se cancela, solo se archiva
        const { error } = await supabase
          .from('orders')
          .update({ is_archived: true })
          .eq('id', orderId);

        if (error) throw error;

        dismissToast(loadingToast);
        showSuccess('✅ Pedido archivado');
        navigate('/portal?tab=archived');
      } catch (error) {
        dismissToast(loadingToast);
        handleError(error);
        throw error;
      }
    },
    [handleError, showSuccess, showLoading, dismissToast, navigate]
  );

  const handleReactivate = useCallback(
    async (orderId: string) => {
      const loadingToast = showLoading('Reactivando presupuesto...');

      try {
        // Reactivar: quitar el flag de archivado y volver a estado pendiente
        const { error } = await supabase
          .from('orders')
          .update({
            is_archived: false,
            status: 'pendiente',
          })
          .eq('id', orderId);

        if (error) throw error;

        dismissToast(loadingToast);
        showSuccess('✅ Presupuesto reactivado. Volverá a "Mis Presupuestos"');
        navigate('/portal?tab=budgets');
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
    handleReactivate,
  };
};

