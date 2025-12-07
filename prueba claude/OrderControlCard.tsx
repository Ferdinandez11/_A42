// OrderControlCard.tsx
import { Order, OrderStatus } from './types';
import { STATUS_OPTIONS } from './constants';
import { formatMoney } from './utils';

interface OrderControlCardProps {
  order: Order;
  newDate: string;
  calculatedBasePrice: number;
  isGeneratingPDF: boolean;
  onOrderChange: (order: Order) => void;
  onDateChange: (date: string) => void;
  onStatusChange: (status: OrderStatus) => void;
  onApplyDiscount: () => void;
  onCopyBasePrice: () => void;
  onUpdate: () => void;
}

export const OrderControlCard = ({
  order,
  newDate,
  calculatedBasePrice,
  isGeneratingPDF,
  onOrderChange,
  onDateChange,
  onStatusChange,
  onApplyDiscount,
  onCopyBasePrice,
  onUpdate,
}: OrderControlCardProps) => {
  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5 flex flex-col mb-5">
      <h3 className="m-0 mb-4 border-b border-zinc-800 pb-2.5 text-white">
        ⚙️ Control y Datos
      </h3>
      
      {/* Nombre del Proyecto */}
      <div className="mb-4">
        <label className="block text-gray-400 mb-1 text-xs">
          Nombre del Proyecto (Editable)
        </label>
        <input 
          type="text" 
          value={order.custom_name || ''} 
          onChange={e => onOrderChange({...order, custom_name: e.target.value})}
          placeholder="Ej: Parque Ayuntamiento Norte"
          className="bg-zinc-950 border border-blue-500 text-white p-2.5 rounded-md w-full"
        />
      </div>

      {/* Estado y Fecha */}
      <div className="grid grid-cols-2 gap-5 mb-4">
        <div>
          <label className="block text-gray-400 mb-1 text-xs">Estado</label>
          <select 
            value={order.status} 
            onChange={e => onStatusChange(e.target.value as OrderStatus)} 
            className="bg-zinc-950 border border-zinc-700 text-white p-2.5 rounded-md w-full"
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-gray-400 mb-1 text-xs">
            Fecha Entrega Estimada
          </label>
          <input 
            type="datetime-local" 
            value={newDate} 
            onChange={e => onDateChange(e.target.value)} 
            className="bg-zinc-950 border border-zinc-700 text-white p-2.5 rounded-md w-full"
          />
        </div>
      </div>

      {/* Sección Precios */}
      <div className="bg-blue-500/10 p-4 rounded-lg border border-blue-500/30">
        <div className="flex justify-between items-center mb-2.5 border-b border-white/10 pb-2.5">
          <span className="text-gray-400 text-xs">Total Tarifa (Suma Items):</span>
          <span className="text-base font-bold text-white">
            {formatMoney(calculatedBasePrice)}
          </span>
        </div>

        <div className="grid grid-cols-[1fr_auto_auto] gap-2.5 items-end">
          <div>
            <label className="block text-blue-500 mb-1 text-xs font-bold">
              Precio Final Oferta (€)
            </label>
            <input 
              type="number" 
              step="0.01" 
              value={order.total_price} 
              onChange={e => onOrderChange({...order, total_price: parseFloat(e.target.value)})} 
              className="bg-zinc-950 border border-zinc-700 text-white p-2.5 rounded-md w-full text-base font-bold"
            />
          </div>
          <button 
            onClick={onApplyDiscount} 
            title={`Aplicar Descuento Cliente (${order.profiles?.discount_rate || 0}%)`}
            className="bg-orange-600 text-white border-none rounded-md px-4 h-[42px] cursor-pointer font-bold hover:bg-orange-700 transition-colors"
          >
            % Dto
          </button>
          <button 
            onClick={onCopyBasePrice} 
            title="Copiar precio base a precio oferta"
            className="bg-zinc-800 text-white border border-zinc-700 rounded-md px-4 h-[42px] cursor-pointer hover:bg-zinc-700 transition-colors"
          >
            Igualar ⬇
          </button>
        </div>
      </div>
      
      {/* Botón Guardar */}
      <div className="mt-5 flex justify-end">
        <button 
          onClick={onUpdate} 
          disabled={isGeneratingPDF}
          className={`bg-green-600 text-white px-8 py-3 border-none rounded-md font-bold text-sm transition-all ${
            isGeneratingPDF ? 'cursor-wait opacity-70' : 'cursor-pointer hover:bg-green-700'
          }`}
        >
          {isGeneratingPDF ? 'Guardando y Generando PDF...' : '💾 Guardar Cambios'}
        </button>
      </div>
    </div>
  );
};