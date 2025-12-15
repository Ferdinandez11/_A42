// ============================================================================
// ORDER HISTORY - Component for displaying client order history
// ============================================================================

import { useCallback } from 'react';
import { Package } from 'lucide-react';
import type { ClientOrder } from '../../hooks/useClientDetail';
import { OrderCard } from './OrderCard';

interface OrderHistoryProps {
  orders: ClientOrder[];
  onViewOrder: (orderId: string) => void;
}

const SECTION_TITLES = {
  ORDER_HISTORY: 'Historial de Pedidos',
} as const;

const MESSAGES = {
  NO_ORDERS: 'Sin pedidos.',
} as const;

export const OrderHistory: React.FC<OrderHistoryProps> = ({ orders, onViewOrder }) => {
  const handleViewOrder = useCallback(
    (orderId: string) => () => {
      onViewOrder(orderId);
    },
    [onViewOrder]
  );

  return (
    <div className="bg-neutral-900 rounded-xl border border-neutral-700 p-6">
      <h3 className="text-white text-lg font-bold border-b border-neutral-700 pb-4 mb-6 flex items-center gap-2">
        <Package size={20} />
        {SECTION_TITLES.ORDER_HISTORY} ({orders.length})
      </h3>

      <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto custom-scrollbar">
        {orders.length === 0 ? (
          <p className="text-neutral-500 text-center py-8">{MESSAGES.NO_ORDERS}</p>
        ) : (
          orders.map((order) => (
            <OrderCard key={order.id} order={order} onView={handleViewOrder(order.id)} />
          ))
        )}
      </div>
    </div>
  );
};
