// ObservationsCard.tsx
import { Observation } from './types';

interface ObservationsCardProps {
  observations: Observation[];
  newObservation: string;
  onNewObservationChange: (value: string) => void;
  onAddObservation: () => void;
}

export const ObservationsCard = ({
  observations,
  newObservation,
  onNewObservationChange,
  onAddObservation,
}: ObservationsCardProps) => {
  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 border-l-4 border-l-orange-600 p-5 flex flex-col mb-5">
      <h4 className="m-0 mb-4 text-orange-600">📝 Historial de Observaciones</h4>
      
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
                {obs.profiles?.role === 'admin' ? '🏢 Tú (Admin)' : '👤 Cliente'}
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
      
      <div className="flex gap-2.5">
        <input 
          type="text" 
          value={newObservation} 
          onChange={e => onNewObservationChange(e.target.value)} 
          placeholder="Añadir nota interna o mensaje..."
          className="flex-1 p-2 bg-zinc-950 border border-zinc-700 text-white rounded-md"
        />
        <button 
          onClick={onAddObservation}
          className="bg-orange-600 text-white border-none px-4 rounded-md cursor-pointer hover:bg-orange-700 transition-colors"
        >
          Añadir
        </button>
      </div>
    </div>
  );
};