// ============================================================================
// BUDGET CALCULATIONS - Pure functions for budget totals
// ============================================================================

import type { ManualItem } from '@/crm/hooks/useOrderItems';

export interface Item3D {
  uuid: string;
  name: string;
  quantity: number;
  info: string;
  price: number;
  is3D: boolean;
}

export interface BudgetTotals {
  subtotal: number;
  discountRate: number;
  discountAmount: number;
  final: number;
}

interface OrderWithDiscount {
  profiles?: {
    discount_rate?: number;
  };
}

/**
 * Calculates budget totals from 3D items, manual items, and order discount
 */
export const calculateBudgetTotals = (
  order: OrderWithDiscount | null,
  items3D: Item3D[],
  manualItems: ManualItem[]
): BudgetTotals => {
  const total3D = items3D.reduce((acc, item) => acc + item.price, 0);
  const totalManual = manualItems.reduce((acc, item) => acc + item.total_price, 0);
  const subtotal = total3D + totalManual;
  
  const discountRate = order?.profiles?.discount_rate || 0;
  const discountAmount = subtotal * (discountRate / 100);
  
  return {
    subtotal,
    discountRate,
    discountAmount,
    final: subtotal - discountAmount,
  };
};

