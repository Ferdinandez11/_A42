// MaterialsBreakdownCard.tsx
import type { Item3D, ManualItem } from '@/crm/pages/types';
import { formatMoney } from '@/crm/pages/utils';

interface MaterialsBreakdownCardProps {
  items3D: Item3D[];
  manualItems: ManualItem[];
  calculatedBasePrice: number;
  projectId?: string | null;
  onAddItem: () => void;
  onDeleteManualItem: (itemId: string) => void;
}

export const MaterialsBreakdownCard = ({
  items3D,
  manualItems,
  calculatedBasePrice,
  projectId,
  onAddItem,
  onDeleteManualItem,
}: MaterialsBreakdownCardProps) => {
  const handleView3D = () => {
    if (projectId) {
      window.location.href = `/?project_id=${projectId}&mode=readonly`;
    }
  };

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5 flex flex-col mb-5">
      <div className="flex justify-between items-center mb-4">
        <h3 className="m-0 text-white">📋 Desglose Materiales</h3>
        <div className="flex gap-2.5">
          <button 
            onClick={onAddItem}
            className="py-1 px-4 bg-green-600 text-white border-none rounded cursor-pointer font-bold hover:bg-green-700 transition-colors"
          >
            + Añadir Item
          </button>
          <button 
            onClick={handleView3D}
            className="py-1 px-2.5 bg-zinc-800 text-white border border-zinc-700 rounded cursor-pointer hover:bg-zinc-700 transition-colors"
          >
            Ver 3D ↗
          </button>
        </div>
      </div>

      <div className="bg-zinc-950 rounded-lg overflow-hidden">
        <table className="w-full border-collapse text-xs">
          <thead className="bg-zinc-800 text-gray-400">
            <tr>
              <th className="p-2 text-left">Ítem</th>
              <th className="p-2 text-center">Origen</th>
              <th className="p-2 text-right">Precio</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {items3D.map((line, idx) => (
              <tr key={`3d-${idx}`} className="border-b border-zinc-800">
                <td className="p-2 text-white">
                  {line.name} <span className="text-zinc-600 text-[10px]">x{line.quantity}</span>
                </td>
                <td className="p-2 text-center text-gray-500 text-[11px]">DISEÑO 3D</td>
                <td className="p-2 text-right text-gray-300">{formatMoney(line.totalPrice)}</td>
                <td className="text-right p-2">
                  <small className="text-zinc-600">Auto</small>
                </td>
              </tr>
            ))}
            
            {manualItems.map((item) => (
              <tr 
                key={item.id} 
                className="border-b border-zinc-800 bg-blue-500/10"
              >
                <td className="p-2 text-white">
                  {item.name} <span className="text-gray-500 text-[11px]">({item.dimensions})</span>
                </td>
                <td className="p-2 text-center text-blue-500 text-[11px]">EXTRA MANUAL</td>
                <td className="p-2 text-right text-white font-bold">{formatMoney(item.total_price)}</td>
                <td className="text-right p-2">
                  <button 
                    onClick={() => onDeleteManualItem(item.id)}
                    className="text-red-600 bg-transparent border-none cursor-pointer hover:text-red-500 transition-colors"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-zinc-800 font-bold">
            <tr>
              <td colSpan={2} className="p-2.5 text-right text-gray-400">SUMA TOTAL</td>
              <td className="p-2.5 text-right text-white">{formatMoney(calculatedBasePrice)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};