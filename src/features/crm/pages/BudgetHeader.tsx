// BudgetHeader.tsx
interface BudgetHeaderProps {
  isLocked: boolean;
  isDecisionTime: boolean;
  isOrderConfirmed: boolean;
  isPending: boolean;
  onAccept: () => void;
  onReject: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onBack: () => void;
}

export const BudgetHeader = ({
  isLocked,
  isDecisionTime,
  isOrderConfirmed,
  isPending,
  onAccept,
  onReject,
  onCancel,
  onDelete,
  onBack,
}: BudgetHeaderProps) => {
  return (
    <div className="flex justify-between mb-4 flex-wrap gap-2.5">
      <button 
        onClick={onBack}
        className="bg-transparent border-none text-gray-500 cursor-pointer hover:text-gray-400 transition-colors"
      >
        ← Volver
      </button>
      
      <div className="flex gap-2.5 items-center">
        {isLocked && (
          <span className="text-gray-500 text-xs mr-2.5">
            ⚠️ Cambios solo vía chat
          </span>
        )}
        
        {isDecisionTime && (
          <>
            <button 
              onClick={onAccept}
              className="bg-green-600 text-white border-none py-2 px-4 rounded-md cursor-pointer font-bold hover:bg-green-700 transition-colors"
            >
              ✅ Aceptar Presupuesto
            </button>
            <button 
              onClick={onReject}
              className="bg-red-700 text-white border-none py-2 px-4 rounded-md cursor-pointer font-bold hover:bg-red-800 transition-colors"
            >
              ❌ Rechazar
            </button>
          </>
        )}
        
        {isOrderConfirmed && (
          <button 
            onClick={onCancel}
            className="bg-red-700 text-white border-none py-2 px-4 rounded-md cursor-pointer hover:bg-red-800 transition-colors"
          >
            🚫 Cancelar Pedido
          </button>
        )}
        
        {isPending && (
          <button 
            onClick={onDelete}
            className="bg-red-700 text-white border-none py-2 px-4 rounded-md cursor-pointer hover:bg-red-800 transition-colors"
          >
            🗑️ Borrar Solicitud
          </button>
        )}
      </div>
    </div>
  );
};