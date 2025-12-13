// OrderStatusBadge.tsx
// ✅ Componente extraído de ClientDashboard
import React, { useMemo } from 'react';

const ORDER_STATUS_CONFIG: Record<
  string,
  { color: string; label: string; bgColor: string }
> = {
  pendiente: {
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    label: 'Pendiente',
  },
  presupuestado: {
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    label: 'Presupuestado',
  },
  pedido: {
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    label: 'Pedido',
  },
  fabricacion: {
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    label: 'Fabricación',
  },
  entregado_parcial: {
    color: 'text-yellow-300',
    bgColor: 'bg-yellow-500/10',
    label: 'Entregado Parcial',
  },
  entregado: {
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    label: 'Entregado',
  },
  completado: {
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    label: 'Completado',
  },
  rechazado: {
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    label: 'Rechazado',
  },
  cancelado: {
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/10',
    label: 'Cancelado',
  },
};

interface OrderStatusBadgeProps {
  status: string;
}

export const OrderStatusBadge: React.FC<OrderStatusBadgeProps> = ({ status }) => {
  const config = useMemo(
    () =>
      ORDER_STATUS_CONFIG[status] || {
        color: 'text-neutral-400',
        bgColor: 'bg-neutral-500/10',
        label: status,
      },
    [status]
  );

  return (
    <span
      className={`${config.color} ${config.bgColor} px-3 py-1 rounded-full text-xs font-bold uppercase`}
    >
      {config.label}
    </span>
  );
};

