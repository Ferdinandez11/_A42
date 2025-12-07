// BudgetMaterialsCard.tsx
import type { Item3D, ManualItem } from './budgetTypes';
import { formatMoney } from './budgetUtils';

interface BudgetMaterialsCardProps {
  items3D: Item3D[];
  manualItems: ManualItem[];
  isPending: boolean;
  totals: {
    subtotal: number;
    discountRate: number;
    discountAmount: number;
    final: number;
  };
  onAddItem: () => void;
  onDeleteManualItem: (itemId: string) => void;
}

export const BudgetMaterialsCard = ({
  items3D,
  manualItems,
  isPending,
  totals,
  onAddItem,
  onDeleteManualItem,
}: BudgetMaterialsCardProps) => {
  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5 flex flex-col mb-5">
      <div className="flex justify-between items-center border-b border-zinc-800 pb-2.5">
        <h3 className="m-0 text-white">📋 Desglose</h3>
        {isPending && (
          <button 
            onClick={onAddItem}
            className="bg-blue-500 text-white border-none py-1 px-4 rounded cursor-pointer hover:bg-blue-600 transition-colors"
          >
            + Añadir Extra
          </button>
        )}
      </div>

      <table className="w-full border-collapse text-sm mt-2.5">
        <tbody>
          {items3D.map((item, idx) => (
            <tr key={`3d-${idx}`} className="border-b border-zinc-800">
              <td className="p-3 text-white">{item.name}</td>
              <td className="p-3 text-gray-400 text-xs">🕋 3D</td>
              <td className="p-3 text-right font-bold text-white">
                {formatMoney(item.price)}
              </td>
            </tr>
          ))}
          
          {manualItems.map((item) => (
            <tr 
              key={item.id} 
              className="border-b border-zinc-800 bg-blue-500/5"
            >
              <td className="p-3 text-white">
                {item.name} <small>({item.dimensions})</small>
              </td>
              <td className="p-3 text-blue-500 text-xs">✏️ Manual</td>
              <td className="p-3 text-right font-bold text-white">
                {formatMoney(item.total_price)}
              </td>
              <td className="text-right">
                {isPending && (
                  <button 
                    onClick={() => onDeleteManualItem(item.id)}
                    className="text-red-600 bg-transparent border-none cursor-pointer hover:text-red-500 transition-colors"
                  >
                    🗑️
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      <div className="mt-5 border-t border-zinc-800 text-right pt-2.5">
        {isPending ? (
          <div className="text-lg text-white">
            Estimado: {formatMoney(totals.subtotal)}
          </div>
        ) : (
          <>
            <div className="text-gray-400">
              Subtotal: {formatMoney(totals.subtotal)}
            </div>
            {totals.discountRate > 0 && (
              <div className="text-green-500">
                Dto {totals.discountRate}%: -{formatMoney(totals.discountAmount)}
              </div>
            )}
            <div className="text-[22px] font-bold text-blue-500 mt-1">
              Total: {formatMoney(totals.final)}
            </div>
          </>
        )}
      </div>
    </div>
  );
};