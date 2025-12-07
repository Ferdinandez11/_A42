// BudgetInfoCard.tsx
import type { Order } from '../../../types/types';

interface BudgetInfoCardProps {
  order: Order;
  customName: string;
  isPending: boolean;
  isDecisionTime: boolean;
  statusBadge: { label: string; color: string };
  onCustomNameChange: (value: string) => void;
  onSaveName: () => void;
}

export const BudgetInfoCard = ({
  order,
  customName,
  isPending,
  isDecisionTime,
  statusBadge,
  onCustomNameChange,
  onSaveName,
}: BudgetInfoCardProps) => {
  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5 flex flex-col mb-5">
      <div className="flex justify-between items-center">
        <h2 className="m-0 text-white">Ref: {order.order_ref}</h2>
        <span 
          className="py-1 px-2.5 rounded font-bold text-white"
          style={{ backgroundColor: statusBadge.color }}
        >
          {statusBadge.label}
        </span>
      </div>
      
      {/* Campo Nombre Personalizado */}
      <div className="mt-4">
        <label className="text-gray-400 text-xs block mb-1">
          Nombre del Proyecto / Referencia Personal:
        </label>
        <div className="flex gap-2.5">
          <input 
            type="text" 
            value={customName}
            onChange={e => onCustomNameChange(e.target.value)}
            placeholder="Ej: Reforma Parque Infantil Comunidad..."
            disabled={!isPending && !isDecisionTime}
            className="flex-1 p-2.5 bg-zinc-950 border border-zinc-700 rounded-md text-white disabled:opacity-50 disabled:cursor-not-allowed"
          />
          {(isPending || isDecisionTime) && (
            <button 
              onClick={onSaveName}
              className="bg-zinc-800 border border-zinc-700 text-white rounded-md px-4 cursor-pointer hover:bg-zinc-700 transition-colors"
              title="Guardar Nombre"
            >
              💾
            </button>
          )}
        </div>
      </div>
      
      <p className="text-gray-500 mt-2.5 text-xs">
        Solicitado el: {new Date(order.created_at).toLocaleString()}
      </p>
      
      {order.estimated_delivery_date && (
        <p className="text-blue-500 mt-0 font-bold">
          📅 Fecha Entrega Estimada: {new Date(order.estimated_delivery_date).toLocaleDateString()}
        </p>
      )}
    </div>
  );
};