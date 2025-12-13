// StatusSelect.tsx
// ✅ Componente extraído de CrmDashboard
import React from 'react';
import type { OrderStatus } from '@/crm/hooks/useAdminOrders';

interface StatusSelectProps {
  value: OrderStatus;
  onChange: (status: OrderStatus) => void;
  isBudget: boolean;
}

export const StatusSelect: React.FC<StatusSelectProps> = ({
  value,
  onChange,
  isBudget,
}) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value as OrderStatus)}
    className="bg-neutral-900 text-white border border-neutral-700 px-2 py-1 rounded cursor-pointer max-w-[130px]"
  >
    {isBudget ? (
      <>
        <option value="pendiente">🟠 Pendiente</option>
        <option value="presupuestado">🟣 Presupuestado</option>
        <option value="rechazado">🔴 Rechazado</option>
        <option value="pedido">➡️ A PEDIDO</option>
      </>
    ) : (
      <>
        <option value="pedido">🔵 Pedido</option>
        <option value="en_proceso">🟠 Fabricación</option>
        <option value="enviado">🟢 Enviado</option>
        <option value="entregado">🏁 Completado</option>
      </>
    )}
  </select>
);

