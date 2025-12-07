// BudgetObservationsCard.tsx
import type { Observation } from './budgetTypes';

interface BudgetObservationsCardProps {
  observations: Observation[];
  newObservation: string;
  isPending: boolean;
  isDecisionTime: boolean;
  onNewObservationChange: (value: string) => void;
  onAddObservation: () => void;
}

export const BudgetObservationsCard = ({
  observations,
  newObservation,
  isPending,
  isDecisionTime,
  onNewObservationChange,
  onAddObservation,
}: BudgetObservationsCardProps) => {
  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5 flex flex-col mb-5">
      <h3 className="text-white mt-0 border-b border-zinc-800 pb-2.5 flex justify-between items-center">
        📝 Historial de Observaciones
      </h3>
      
      {/* Lista de observaciones */}
      <div className="max-h-[200px] overflow-y-auto mb-4 flex flex-col gap-2.5">
        {observations.length === 0 && (
          <p className="text-zinc-600 italic text-xs">
            No hay observaciones registradas.
          </p>
        )}
        
        {observations.map(obs => (
          <div 
            key={obs.id}
            className={`bg-zinc-950 p-2.5 rounded-md border-l-4 ${
              obs.profiles?.role === 'admin' ? 'border-l-orange-600' : 'border-l-blue-500'
            }`}
          >
            <div className="flex justify-between mb-1">
              <span className="font-bold text-xs text-white">
                {obs.profiles?.role === 'admin' ? '🏢 Administrador' : '👤 Tú'}
              </span>
              <span className="text-[11px] text-gray-500">
                {new Date(obs.created_at).toLocaleString()}
              </span>
            </div>
            <p className="m-0 text-xs text-gray-300 whitespace-pre-wrap">
              {obs.content}
            </p>
          </div>
        ))}
      </div>

      {/* Input nueva observación */}
      {(isPending || isDecisionTime) ? (
        <div className="flex gap-2.5">
          <input 
            type="text" 
            value={newObservation}
            onChange={e => onNewObservationChange(e.target.value)}
            placeholder="Añadir nueva observación o nota..."
            className="flex-1 p-2.5 bg-zinc-950 border border-zinc-700 text-white rounded-md"
          />
          <button 
            onClick={onAddObservation}
            className="bg-blue-500 text-white border-none px-5 rounded-md cursor-pointer hover:bg-blue-600 transition-colors"
          >
            Añadir
          </button>
        </div>
      ) : (
        <p className="text-xs text-zinc-600">
          * No se pueden añadir más observaciones en este estado.
        </p>
      )}
    </div>
  );
};