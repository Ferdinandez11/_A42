// CatalogModal.tsx
// ✅ Componente unificado - Eliminada duplicación con BudgetCatalogModal
import { CATALOG_ITEMS } from '@/crm/pages/constants';
import type { CatalogItem } from '@/crm/pages/types';

interface CatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectItem: (item: CatalogItem) => void;
}

/**
 * Modal unificado para seleccionar items del catálogo
 * Reemplaza tanto CatalogModal como BudgetCatalogModal
 */
export const CatalogModal = ({ isOpen, onClose, onSelectItem }: CatalogModalProps) => {
  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 bg-black/80 flex justify-center items-center`} style={{ zIndex: 999 } as React.CSSProperties}>
      <div className="bg-zinc-900 w-[600px] max-h-[80vh] rounded-xl border border-zinc-700 flex flex-col">
        <div className="p-5 border-b border-zinc-800 flex justify-between items-center">
          <h3 className="m-0 text-white">Añadir Extra</h3>
          <button 
            onClick={onClose}
            className="bg-transparent border-none text-gray-500 text-xl cursor-pointer hover:text-gray-400 transition-colors"
          >
            ✕
          </button>
        </div>
        
        <div className="p-5 overflow-y-auto grid grid-cols-2 gap-4">
          {CATALOG_ITEMS.map(item => (
            <div 
              key={item.id} 
              onClick={() => onSelectItem(item)}
              className="bg-zinc-950 p-4 rounded-lg cursor-pointer border border-zinc-800 hover:border-blue-500 transition-colors"
            >
              <div className="font-bold text-white">{item.name}</div>
              <div className="text-gray-500 text-xs">
                {item.type === 'model' ? `${item.price} €` : 'Paramétrico'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};