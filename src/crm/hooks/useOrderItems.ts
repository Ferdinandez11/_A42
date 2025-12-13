// useOrderItems.ts
// ✅ Hook para gestión de items manuales del pedido
import { useState, useCallback } from 'react';
import { supabase } from '@/core/lib/supabase';
import { useErrorHandler } from '@/core/hooks/useErrorHandler';
import { AppError, ErrorType, ErrorSeverity } from '@/core/lib/errorHandler';
import { PRICES } from '@/pdf/utils/PriceCalculator';
import type { CatalogItem } from '@/crm/pages/types';

export interface ManualItem {
  id: string;
  product_id: string;
  name: string;
  quantity: number;
  total_price: number;
  dimensions: string;
}

interface UseOrderItemsReturn {
  manualItems: ManualItem[];
  loading: boolean;
  fetchItems: (orderId: string) => Promise<void>;
  addItem: (orderId: string, item: CatalogItem, quantity?: number) => Promise<void>;
  addParametricItem: (
    orderId: string,
    item: CatalogItem,
    value: number
  ) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
}

/**
 * Hook para gestionar items manuales de un pedido
 */
export const useOrderItems = (): UseOrderItemsReturn => {
  const [manualItems, setManualItems] = useState<ManualItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { handleError, showSuccess, showLoading, dismissToast } = useErrorHandler({
    context: 'useOrderItems',
  });

  const fetchItems = useCallback(
    async (orderId: string) => {
      setLoading(true);

      try {
        const { data, error } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', orderId);

        if (error) throw error;

        setManualItems(data || []);
      } catch (error) {
        handleError(error);
      } finally {
        setLoading(false);
      }
    },
    [handleError]
  );

  const addItem = useCallback(
    async (orderId: string, item: CatalogItem, quantity: number = 1) => {
      const loadingToast = showLoading('Añadiendo elemento...');

      try {
        const { error } = await supabase.from('order_items').insert([
          {
            order_id: orderId,
            product_id: item.id,
            name: item.name,
            quantity: quantity,
            total_price: item.price * quantity,
            dimensions: '1 ud',
          },
        ]);

        if (error) throw error;

        dismissToast(loadingToast);
        showSuccess(`✅ ${item.name} añadido correctamente`);
        await fetchItems(orderId);
      } catch (error) {
        dismissToast(loadingToast);
        handleError(error);
        throw error;
      }
    },
    [handleError, showSuccess, showLoading, dismissToast, fetchItems]
  );

  const addParametricItem = useCallback(
    async (orderId: string, item: CatalogItem, value: number) => {
      if (!value || value <= 0) {
        handleError(
          new AppError(ErrorType.VALIDATION, 'Invalid value', {
            userMessage: 'El valor debe ser mayor que 0',
            severity: ErrorSeverity.LOW,
          })
        );
        return;
      }

      const loadingToast = showLoading('Añadiendo elemento...');

      try {
        let price = 0;
        let dimensions = '';

        if (item.type === 'fence') {
          price = value * PRICES.FENCE_M;
          dimensions = `${value} ml`;
        } else if (item.type === 'floor') {
          price = value * PRICES.FLOOR_M2;
          dimensions = `${value} m²`;
        } else {
          throw new Error('Invalid item type for parametric item');
        }

        const { error } = await supabase.from('order_items').insert([
          {
            order_id: orderId,
            product_id: item.id,
            name: item.name,
            quantity: 1,
            total_price: price,
            dimensions: dimensions,
          },
        ]);

        if (error) throw error;

        dismissToast(loadingToast);
        showSuccess(`✅ ${item.name} añadido correctamente`);
        await fetchItems(orderId);
      } catch (error) {
        dismissToast(loadingToast);
        handleError(error);
        throw error;
      }
    },
    [handleError, showSuccess, showLoading, dismissToast, fetchItems]
  );

  const deleteItem = useCallback(
    async (itemId: string) => {
      const loadingToast = showLoading('Eliminando elemento...');

      try {
        const { error } = await supabase
          .from('order_items')
          .delete()
          .eq('id', itemId);

        if (error) throw error;

        setManualItems((prev) => prev.filter((item) => item.id !== itemId));
        dismissToast(loadingToast);
        showSuccess('✅ Elemento eliminado');
      } catch (error) {
        dismissToast(loadingToast);
        handleError(error);
        throw error;
      }
    },
    [handleError, showSuccess, showLoading, dismissToast]
  );

  return {
    manualItems,
    loading,
    fetchItems,
    addItem,
    addParametricItem,
    deleteItem,
  };
};

