// --- START OF FILE src/features/editor/ui/EnvironmentPanel.tsx ---
//import React from 'react';
import { useAppStore } from '../../../stores/useAppStore';
import { X, Sun, MountainSnow } from 'lucide-react';

export const EnvironmentPanel = () => {
  const { 
    envPanelVisible, 
    toggleEnvPanel, 
    sunPosition, 
    setSunPosition, 
    backgroundColor, 
    setBackgroundColor 
  } = useAppStore();

  if (!envPanelVisible) return null;

  // Definición de colores
  const colors = [
    { name: 'Cielo', value: '#111111', isSky: true }, // Valor dummy, activará el sky
    { name: 'Blanco', value: '#ffffff' },
    { name: 'Azul', value: '#3b82f6' },
    { name: 'Verde', value: '#22c55e' },
    { name: 'Granate', value: '#7f1d1d' },
    { name: 'Negro', value: '#000000' },
  ];

  return (
    <div className="absolute top-20 right-6 bg-neutral-900/95 backdrop-blur-md border border-neutral-700 rounded-xl shadow-2xl w-72 flex flex-col z-30 animate-in fade-in slide-in-from-right-5 duration-200">
      
      {/* Header */}
      <div className="p-4 border-b border-neutral-700 flex justify-between items-center bg-neutral-800/50 rounded-t-xl">
        <h2 className="text-white font-bold text-lg flex items-center gap-2">
          <Sun size={20} className="text-yellow-500" />
          Entorno
        </h2>
        <button onClick={toggleEnvPanel} className="text-neutral-400 hover:text-white">
          <X size={20} />
        </button>
      </div>

      <div className="p-4 space-y-6">
        
        {/* Controles de Sol */}
        <div className="space-y-4">
          <h3 className="text-neutral-400 text-xs uppercase font-bold tracking-wider">Iluminación Solar</h3>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-white">Rotación</span>
              <span className="text-neutral-400">{sunPosition.azimuth}°</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="360" 
              value={sunPosition.azimuth} 
              onChange={(e) => setSunPosition(Number(e.target.value), sunPosition.elevation)}
              className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-white">Altura</span>
              <span className="text-neutral-400">{sunPosition.elevation}°</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="90" 
              value={sunPosition.elevation} 
              onChange={(e) => setSunPosition(sunPosition.azimuth, Number(e.target.value))}
              className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>
        </div>

        {/* Separador */}
        <div className="h-px bg-neutral-700/50" />

        {/* Fondos */}
        <div className="space-y-3">
          <h3 className="text-neutral-400 text-xs uppercase font-bold tracking-wider flex items-center gap-2">
            <MountainSnow size={14} /> Fondo
          </h3>
          
          <div className="grid grid-cols-3 gap-2">
            {colors.map((c) => (
              <button
                key={c.name}
                onClick={() => setBackgroundColor(c.value)}
                className={`
                  relative h-10 rounded-lg border-2 transition-all flex items-center justify-center
                  ${backgroundColor === c.value 
                    ? 'border-blue-500 scale-105 shadow-lg shadow-blue-500/20' 
                    : 'border-transparent hover:border-white/20 hover:scale-105'
                  }
                `}
                style={{ backgroundColor: c.value }}
                title={c.name}
              >
                {c.isSky && <span className="text-[10px] font-bold text-white/50 uppercase">Sky</span>}
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
// --- END OF FILE src/features/editor/ui/EnvironmentPanel.tsx ---