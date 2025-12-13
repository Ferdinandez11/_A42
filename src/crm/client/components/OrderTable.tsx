// OrderTable.tsx
// ✅ Componente extraído de ClientDashboard
import React, { useMemo } from 'react';
import { Eye, RotateCcw } from 'lucide-react';
import { OrderStatusBadge } from './OrderStatusBadge';

export type TabType = 'projects' | 'budgets' | 'orders' | 'archived';

export interface Order {
  id: string;
  order_ref: string;
  status: string;
  total_price: number;
  created_at: string;
  estimated_delivery_date?: string;
  is_archived: boolean;
  user_id: string;
  project_id?: string;
  projects?: {
    name: string;
  };
}

interface OrderTableProps {
  orders: Order[];
  activeTab: TabType;
  onViewOrder: (orderId: string) => void;
  onReactivate: (order: Order) => void;
}

const MESSAGES = {
  NO_DATA: 'No hay datos en esta sección.',
} as const;

export const OrderTable: React.FC<OrderTableProps> = ({
  orders,
  activeTab,
  onViewOrder,
  onReactivate,
}) => {
  const isOrdersTab = useMemo(() => activeTab === 'orders', [activeTab]);
  const isArchivedTab = useMemo(() => activeTab === 'archived', [activeTab]);

  return (
    <div className="bg-neutral-900 rounded-xl border border-neutral-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-neutral-800">
            <tr>
              <th className="text-left text-neutral-400 text-sm font-medium px-6 py-4">
                Ref
              </th>
              <th className="text-left text-neutral-400 text-sm font-medium px-6 py-4">
                Proyecto
              </th>
              <th className="text-left text-neutral-400 text-sm font-medium px-6 py-4">
                {isOrdersTab ? 'F. Inicio Pedido' : 'F. Solicitud'}
              </th>
              <th className="text-left text-neutral-400 text-sm font-medium px-6 py-4">
                F. Entrega Est.
              </th>
              <th className="text-left text-neutral-400 text-sm font-medium px-6 py-4">
                Estado
              </th>
              <th className="text-left text-neutral-400 text-sm font-medium px-6 py-4">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-700">
            {orders.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-12 text-center text-neutral-500"
                >
                  {MESSAGES.NO_DATA}
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr
                  key={order.id}
                  className="hover:bg-neutral-800 transition-colors"
                >
                  <td className="px-6 py-4">
                    <span className="text-white font-bold">
                      {order.order_ref}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-neutral-300">
                    {order.projects?.name || '---'}
                  </td>
                  <td className="px-6 py-4 text-neutral-300 text-sm">
                    {new Date(order.created_at).toLocaleDateString('es-ES')}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {order.estimated_delivery_date ? (
                      <span className="text-neutral-300">
                        {new Date(
                          order.estimated_delivery_date
                        ).toLocaleDateString('es-ES')}
                      </span>
                    ) : (
                      <span className="text-neutral-600">--</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className="px-6 py-4">
                    {isArchivedTab ? (
                      <button
                        onClick={() => onReactivate(order)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                      >
                        <RotateCcw size={14} />
                        Reactivar
                      </button>
                    ) : (
                      <button
                        onClick={() => onViewOrder(order.id)}
                        className="bg-neutral-700 hover:bg-neutral-600 text-white px-4 py-2 rounded-lg text-sm font-medium border border-neutral-600 flex items-center gap-2 transition-colors"
                      >
                        <Eye size={14} />
                        Ver Ficha
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

