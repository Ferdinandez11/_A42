// orderPriceUtils.ts
// ✅ Utilidades para cálculo de precios del pedido
import type { OrderData } from '@/crm/pages/types';
import { calculateDeliveryDate } from '@/crm/pages/utils';
import { formatMoney } from '@/crm/pages/utils';

/**
 * Aplica el descuento del cliente al precio base
 */
export const applyClientDiscount = (
  basePrice: number,
  discountRate: number
): number => {
  const discountAmount = basePrice * (discountRate / 100);
  return basePrice - discountAmount;
};

/**
 * Copia el precio base al total del pedido
 */
export const copyBasePriceToTotal = (order: OrderData, basePrice: number): OrderData => {
  return { ...order, total_price: basePrice };
};

/**
 * Calcula y actualiza la fecha de entrega estimada según el estado
 */
export const updateDeliveryDate = (
  order: OrderData,
  status: string,
  currentDate?: string
): string => {
  return calculateDeliveryDate(status as any, currentDate);
};

/**
 * Formatea el mensaje de confirmación de descuento
 */
export const formatDiscountConfirmation = (
  basePrice: number,
  discountRate: number,
  discountAmount: number,
  finalPrice: number
): string => {
  return (
    `Base: ${formatMoney(basePrice)}\n` +
    `Dto (${discountRate}%): -${formatMoney(discountAmount)}\n\n` +
    `Total: ${formatMoney(finalPrice)}`
  );
};

