// ============================================================================
// ORDER CARD - Component for displaying a single order in the history
// ============================================================================

import { useMemo } from 'react';
import { ExternalLink } from 'lucide-react';
import type { ClientOrder } from '../../hooks/useClientDetail';

interface OrderCardProps {
  order: ClientOrder;
  onView: () => void;
}

const ORDER_STATUS_CONFIG: Record<string, { bg: string; label: string }> = {
  pedido: { bg: 'bg-blue-500', label: 'PEDIDO' },
  enviado: { bg: 'bg-green-500', label: 'ENVIADO' },
  completado: { bg: 'bg-gray-500', label: 'COMPLETADO' },
} as const;

export const OrderCard: React.FC<OrderCardProps> = ({ order, onView }) => {
  const statusConfig = useMemo(
    () => ORDER_STATUS_CONFIG[order.status] || { bg: 'bg-gray-600', label: order.status.toUpperCase() },
    [order.status]
  );

  const formattedDate = useMemo(
    () =>
      new Date(order.created_at).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
    [order.created_at]
  );

  return (
    <div className="bg-neutral-800 p-4 rounded-lg border border-neutral-700 hover:border-blue-500 transition-colors">
      <div className="flex justify-between items-start mb-2">
        <span className="text-white font-bold">{order.order_ref}</span>
        <span className="text-xs text-neutral-400">{formattedDate}</span>
      </div>

      {order.projects?.name && (
        <div className="text-sm text-neutral-500 mb-3">{order.projects.name}</div>
      )}

      <div className="flex justify-between items-center">
        <span className={`text-xs px-2 py-1 rounded ${statusConfig.bg} text-white font-medium`}>
          {statusConfig.label}
        </span>
        <button
          onClick={onView}
          className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1 transition-colors"
        >
          Ver
          <ExternalLink size={14} />
        </button>
      </div>
    </div>
  );
};
