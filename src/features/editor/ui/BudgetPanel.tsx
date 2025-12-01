// --- START OF FILE src/features/editor/ui/BudgetPanel.tsx ---
//import React from 'react';
import { useAppStore } from '../../../stores/useAppStore';
import { Trash2, X } from 'lucide-react';

export const BudgetPanel = () => {
  const { 
    items, 
    totalPrice, 
    removeItem, 
    resetScene, 
    budgetVisible, 
    toggleBudget,
    selectItem 
  } = useAppStore();

  if (!budgetVisible) return null;

  return (
    <div className="absolute top-20 left-6 bg-neutral-900/95 backdrop-blur-md border border-neutral-700 rounded-xl shadow-2xl w-80 max-h-[70vh] flex flex-col z-30 animate-in fade-in slide-in-from-left-5 duration-200">
      
      {/* Header */}
      <div className="p-4 border-b border-neutral-700 flex justify-between items-center bg-neutral-800/50 rounded-t-xl">
        <h2 className="text-white font-bold text-lg flex items-center gap-2">
          🧾 Presupuesto
        </h2>
        <button onClick={toggleBudget} className="text-neutral-400 hover:text-white">
          <X size={20} />
        </button>
      </div>

      {/* Lista */}
      <div className="flex-grow overflow-y-auto p-2 custom-scrollbar space-y-2">
        {items.length === 0 ? (
          <div className="text-center py-8 text-neutral-500 italic">
            La escena está vacía.
          </div>
        ) : (
          items.map((item) => (
            <div 
              key={item.uuid} 
              className="flex justify-between items-center p-3 bg-neutral-800 rounded-lg group hover:bg-neutral-700 transition-colors border border-transparent hover:border-blue-500/30 cursor-pointer"
              onClick={() => selectItem(item.uuid)}
            >
              <div className="flex flex-col">
                <span className="text-white font-medium text-sm">
                  {item.name || 'Sin Nombre'}
                </span>
                {/* CAMBIO AQUÍ: Mostramos el ID (Referencia) en lugar del tipo */}
                <span className="text-xs text-neutral-500 uppercase font-mono">
                  {item.productId}
                </span>
              </div>
              
              <div className="flex items-center gap-3">
                 <span className="text-sm font-bold text-neutral-400">{item.price.toLocaleString()}€</span>
                 <button 
                    onClick={(e) => { e.stopPropagation(); removeItem(item.uuid); }}
                    className="text-neutral-500 hover:text-red-400 p-2 rounded-full hover:bg-red-900/20 transition-all opacity-0 group-hover:opacity-100"
                    title="Eliminar elemento"
                  >
                    <Trash2 size={16} />
                  </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer / Totales */}
      <div className="p-4 border-t border-neutral-700 bg-neutral-800/50 rounded-b-xl space-y-3">
        <div className="flex justify-between items-end">
          <span className="text-neutral-400 text-sm">Total Estimado</span>
          <span className="text-2xl font-bold text-green-400">{totalPrice.toLocaleString()} €</span>
        </div>
        
        {items.length > 0 && (
          <button 
            onClick={() => { if(window.confirm('¿Borrar todo?')) resetScene(); }}
            className="w-full py-2 bg-red-900/30 hover:bg-red-600 text-red-200 hover:text-white rounded-lg text-sm font-medium transition-all flex justify-center items-center gap-2 border border-red-900/50"
          >
            <Trash2 size={16} />
            Borrar Todo
          </button>
        )}
      </div>
    </div>
  );
};
// --- END OF FILE src/features/editor/ui/BudgetPanel.tsx ---