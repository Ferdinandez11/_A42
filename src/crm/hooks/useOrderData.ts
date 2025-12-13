// useOrderData.ts
// ✅ Hook para gestión de datos del pedido
import { useState, useCallback } from 'react';
import { supabase } from '@/core/lib/supabase';
import { useErrorHandler } from '@/core/hooks/useErrorHandler';
import { AppError, ErrorType, ErrorSeverity } from '@/core/lib/errorHandler';
import { PriceCalculator } from '@/pdf/utils/PriceCalculator';
import { generateBillOfMaterials } from '@/pdf/utils/budgetUtils';
import type { OrderData, OrderStatus } from '@/crm/pages/types';

export interface BillOfMaterialsLine {
  name: string;
  quantity: number;
  totalPrice: number;
  info?: string;
}

export interface ManualItem {
  id: string;
  product_id: string;
  name: string;
  quantity: number;
  total_price: number;
  dimensions: string;
}

interface UseOrderDataReturn {
  order: OrderData | null;
  items3D: BillOfMaterialsLine[];
  manualItems: ManualItem[];
  calculatedBasePrice: number;
  loading: boolean;
  loadOrderData: (orderId: string) => Promise<void>;
  updateOrder: (updates: Partial<OrderData>) => Promise<void>;
}

/**
 * Hook para gestionar los datos principales de un pedido
 */
export const useOrderData = (): UseOrderDataReturn => {
  const [order, setOrder] = useState<OrderData | null>(null);
  const [items3D, setItems3D] = useState<BillOfMaterialsLine[]>([]);
  const [manualItems, setManualItems] = useState<ManualItem[]>([]);
  const [calculatedBasePrice, setCalculatedBasePrice] = useState(0);
  const [loading, setLoading] = useState(false);
  const { handleError, showLoading, dismissToast } = useErrorHandler({
    context: 'useOrderData',
  });

  const loadOrderData = useCallback(
    async (orderId: string) => {
      setLoading(true);
      const loadingToast = showLoading('Cargando pedido...');

      try {
        // 1. Cargar Pedido
        const { data: o, error: orderError } = await supabase
          .from('orders')
          .select('*, projects(*), profiles(*)')
          .eq('id', orderId)
          .single();

        if (orderError) throw orderError;

        if (!o) {
          throw new AppError(ErrorType.NOT_FOUND, 'Order not found', {
            userMessage: 'Pedido no encontrado',
            severity: ErrorSeverity.MEDIUM,
          });
        }

        setOrder(o as OrderData);

        // 1.1 Procesar Items 3D
        let total3D = 0;
        let processed3DItems: BillOfMaterialsLine[] = [];
        const raw3DItems = o.projects?.data?.items || o.projects?.items || [];

        if (raw3DItems.length > 0) {
          const itemsWithRealPrices = raw3DItems.map((item: Record<string, unknown>) => ({
            ...item,
            // @ts-expect-error - PriceCalculator expects SceneItem but we have dynamic project data
            price: PriceCalculator.getItemPrice(item),
          }));
          processed3DItems = generateBillOfMaterials(itemsWithRealPrices);
          total3D = processed3DItems.reduce((acc, line) => acc + line.totalPrice, 0);
        }
        setItems3D(processed3DItems);

        // 1.2 Cargar Items Manuales
        const { data: mItems, error: itemsError } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', orderId);

        if (itemsError) throw itemsError;

        const manual = mItems || [];
        setManualItems(manual);

        // 1.3 Calcular Total Base Real
        const totalManual = manual.reduce(
          (acc: number, item: ManualItem) => acc + item.total_price,
          0
        );
        setCalculatedBasePrice(total3D + totalManual);

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

  const updateOrder = useCallback(
    async (updates: Partial<OrderData>) => {
      if (!order) return;

      try {
        const { error } = await supabase
          .from('orders')
          .update(updates)
          .eq('id', order.id);

        if (error) throw error;

        setOrder((prev) => (prev ? { ...prev, ...updates } : null));
      } catch (error) {
        handleError(error);
        throw error;
      }
    },
    [order, handleError]
  );

  return {
    order,
    items3D,
    manualItems,
    calculatedBasePrice,
    loading,
    loadOrderData,
    updateOrder,
  };
};

