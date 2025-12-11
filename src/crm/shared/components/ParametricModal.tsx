// ParametricModal.tsx
import type { CatalogItem } from '@/crm/pages/types';

interface ParametricModalProps {
  isOpen: boolean;
  item: CatalogItem | null;
  value: string;
  onValueChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ParametricModal = ({
  isOpen,
  item,
  value,
  onValueChange,
  onConfirm,
  onCancel,
}: ParametricModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex justify-center items-center z-[1000]">
      <div className="bg-zinc-900 p-8 rounded-xl w-[350px] border border-zinc-700">
        <h3 className="m-0 mb-4 text-white">{item?.name}</h3>
        <input 
          type="number" 
          autoFocus 
          value={value} 
          onChange={e => onValueChange(e.target.value)} 
          placeholder="Cantidad"
          className="w-full p-2.5 mb-5 bg-zinc-950 border border-zinc-700 text-white rounded-md"
        />
        <div className="flex gap-2.5 justify-end">
          <button 
            onClick={onCancel}
            className="px-4 py-2 bg-zinc-800 text-white border-none rounded-md cursor-pointer hover:bg-zinc-700 transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={onConfirm}
            className="px-4 py-2 bg-blue-500 text-white border-none rounded-md cursor-pointer hover:bg-blue-600 transition-colors"
          >
            Añadir
          </button>
        </div>
      </div>
    </div>
  );
};