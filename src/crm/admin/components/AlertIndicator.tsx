// AlertIndicator.tsx
// ✅ Componente extraído de CrmDashboard
import React from 'react';
import type { AdminOrder } from '@/crm/hooks/useAdminOrders';

interface AlertIndicatorProps {
  order: AdminOrder;
}

export const AlertIndicator: React.FC<AlertIndicatorProps> = ({ order }) => {
  const messages = order.order_messages || [];
  const sortedMessages = [...messages].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  if (!sortedMessages[0]) return <span className="text-2xl">⚪</span>;

  const isClientMessage = sortedMessages[0].profiles?.role === 'client';

  return (
    <span
      className="text-2xl"
      title={isClientMessage ? 'Cliente escribió' : 'Respondido'}
    >
      {isClientMessage ? '🔴' : '🟢'}
    </span>
  );
};

