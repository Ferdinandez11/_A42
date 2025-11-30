// --- START OF FILE src/features/editor/ui/CadControl.tsx ---
import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../../stores/useAppStore';
import { ArrowLeftRight, Ruler, ScanLine } from 'lucide-react';

export const CadControl = () => {
  const selectedVertexIndices = useAppStore((state) => state.selectedVertexIndices);
  const measuredDistance = useAppStore((state) => state.measuredDistance);
  const measuredAngle = useAppStore((state) => state.measuredAngle);
  
  const [inputValue, setInputValue] = useState<string>('');

  // Modo actual: DISTANCE (2 ptos) o ANGLE (3 ptos)
  const mode = selectedVertexIndices.length === 3 ? 'ANGLE' : 'DISTANCE';

  // Sincronizar input cuando cambian los valores medidos
  useEffect(() => {
    if (mode === 'ANGLE' && measuredAngle !== null) {
        setInputValue(measuredAngle.toFixed(1));
    } else if (mode === 'DISTANCE' && measuredDistance !== null) {
        setInputValue(measuredDistance.toFixed(3));
    }
  }, [measuredDistance, measuredAngle, mode]);

  const handleApply = () => {
    const val = parseFloat(inputValue);
    if (isNaN(val) || val <= 0) return;

    // @ts-ignore
    if (window.editorEngine) {
        if (mode === 'DISTANCE') {
             // [0] Ancla, [1] Móvil
             // @ts-ignore
             window.editorEngine.toolsManager.setSegmentLength(val, selectedVertexIndices[1], selectedVertexIndices[0]);
        } else {
             // MODO ÁNGULO
             // @ts-ignore
             window.editorEngine.toolsManager.setVertexAngle(val);
        }
    }
  };

  const handleSwap = () => {
     // @ts-ignore
     if (window.editorEngine) window.editorEngine.toolsManager.swapSelectionOrder();
  };

  if (selectedVertexIndices.length < 2) return null;

  return (
    <div className={`p-3 rounded-lg mb-3 border-l-4 shadow-lg ${mode === 'ANGLE' ? 'border-yellow-500 bg-neutral-800' : 'border-blue-500 bg-neutral-800'}`}>
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-2">
         <h4 className="text-xs font-bold text-white flex gap-2 items-center">
            {mode === 'ANGLE' ? <ScanLine size={14} className="text-yellow-500" /> : <Ruler size={14} className="text-blue-500" />}
            {mode === 'ANGLE' ? 'Ajustar Ángulo' : 'Ajustar Medida'}
         </h4>
         
         {mode === 'DISTANCE' && (
            <button 
                onClick={handleSwap}
                className="p-1 hover:bg-neutral-700 rounded text-neutral-400 hover:text-white transition-colors"
                title="Invertir dirección"
            >
                <ArrowLeftRight size={14} />
            </button>
         )}
      </div>

      {/* INPUT */}
      <div className="flex gap-2 items-center">
        <input
          type="number"
          step={mode === 'ANGLE' ? "1" : "0.01"}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleApply()}
          className="flex-1 px-2 py-1 text-sm bg-neutral-900 border border-neutral-600 rounded text-white focus:border-blue-500 outline-none font-mono"
        />
        <span className="text-xs text-neutral-400 font-bold w-4">
            {mode === 'ANGLE' ? '°' : 'm'}
        </span>
        <button
          onClick={handleApply}
          className={`px-3 py-1 text-white text-xs font-bold rounded transition-colors ${mode === 'ANGLE' ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-blue-600 hover:bg-blue-500'}`}
        >
          Aplicar
        </button>
      </div>
      
      {/* LEYENDA VISUAL */}
      <div className="mt-3 flex items-center justify-between text-[9px] uppercase font-bold tracking-wider text-neutral-400 bg-black/20 p-1 rounded">
        {mode === 'DISTANCE' ? (
            <>
                <div className="flex items-center gap-1"><div className="w-2 h-2 bg-blue-500 rounded-full"></div> Ancla</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 bg-red-500 rounded-full"></div> Móvil</div>
            </>
        ) : (
            <>
                <div className="flex items-center gap-1" title="Referencia"><div className="w-2 h-2 bg-blue-500 rounded-full"></div> Ref</div>
                <div className="flex items-center gap-1" title="Vértice del ángulo"><div className="w-2 h-2 bg-red-500 rounded-full"></div> Pivot</div>
                <div className="flex items-center gap-1" title="Punto que rota"><div className="w-2 h-2 bg-yellow-500 rounded-full"></div> Móvil</div>
            </>
        )}
      </div>
    </div>
  );
};
// --- END OF FILE src/features/editor/ui/CadControl.tsx ---