// BudgetProjectCard.tsx
import type { Order } from '@/domain/types/types';

interface BudgetProjectCardProps {
  order: Order;
}

export const BudgetProjectCard = ({ order }: BudgetProjectCardProps) => {
  if (!order.projects) return null;

  const handleOpenViewer = () => {
    window.location.href = `/?project_id=${order.project_id}&mode=readonly`;
  };

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5 flex flex-col mb-5">
      <h3 className="text-white mt-0 border-b border-zinc-800 pb-2.5">
        Diseño 3D
      </h3>
      
      <div className="h-[150px] bg-black rounded-lg flex items-center justify-center overflow-hidden border border-zinc-800">
        {order.projects.thumbnail_url ? (
          <img 
            src={order.projects.thumbnail_url} 
            className="w-full object-cover" 
            alt="Vista previa"
          />
        ) : (
          <span className="text-4xl">🖼️</span>
        )}
      </div>
      
      <button 
        onClick={handleOpenViewer}
        className="mt-4 bg-zinc-800 text-white border border-zinc-700 p-2.5 w-full rounded-md cursor-pointer hover:bg-zinc-700 transition-colors"
      >
        Abrir Visor 3D 👁️
      </button>
    </div>
  );
};