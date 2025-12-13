// orderUtils.ts
// ✅ Utilidades extraídas de CrmDashboard
import type { OrderStatus } from '@/crm/hooks/useAdminOrders';

/**
 * Calcula la fecha estimada de entrega basada en el estado del pedido
 */
export const calculateEstimatedDelivery = (
  status: OrderStatus
): string | null => {
  const now = new Date();

  if (status === 'pedido') {
    // 6 weeks for orders
    const deliveryDate = new Date(now.getTime() + 6 * 7 * 24 * 60 * 60 * 1000);
    return deliveryDate.toISOString();
  }

  if (status === 'presupuestado') {
    // 48 hours for quotes
    const deliveryDate = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    return deliveryDate.toISOString();
  }

  return null;
};

