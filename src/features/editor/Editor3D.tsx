// --- START OF FILE src/features/editor/Editor3D.tsx ---
import React, { useEffect, useRef } from 'react';
import { A42Engine } from './engine/A42Engine';
import { Toolbar } from './ui/Toolbar';
import { BudgetPanel } from './ui/BudgetPanel'; // Importamos el nuevo panel
import { useAppStore } from '../../stores/useAppStore';
import { Euro, Move, RotateCw, Scaling } from 'lucide-react'; // Iconos para el hint

export const Editor3D = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<A42Engine | null>(null);
  
  const { 
    mode, 
    gridVisible, 
    items, 
    cameraType, 
    pendingView, 
    clearPendingView,
    totalPrice,
    toggleBudget,
    selectedItemId 
  } = useAppStore();

  useEffect(() => {
    if (!containerRef.current) return;
    const engine = new A42Engine(containerRef.current);
    engine.init();
    engineRef.current = engine;
    engine.setGridVisible(useAppStore.getState().gridVisible);
    return () => engine.dispose();
  }, []);

  useEffect(() => { if (engineRef.current) engineRef.current.setGridVisible(gridVisible); }, [gridVisible]);
  useEffect(() => { if (engineRef.current) engineRef.current.syncSceneFromStore(items); }, [items]);
  useEffect(() => { if (engineRef.current) engineRef.current.switchCamera(cameraType); }, [cameraType]);
  useEffect(() => {
    if (pendingView && engineRef.current) {
      engineRef.current.setView(pendingView);
      clearPendingView();
    }
  }, [pendingView, clearPendingView]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (mode === 'catalog') return;
    if ((e.target as HTMLElement).closest('button, .glass-panel, a, input, .scroll-container')) return;
    if (engineRef.current) engineRef.current.onMouseDown(e.nativeEvent);
  };

  return (
    <div className="w-screen h-screen relative bg-neutral-900 overflow-hidden font-sans">
      
      {/* 3D CANVAS */}
      <div 
        ref={containerRef} 
        onPointerDown={handlePointerDown}
        onContextMenu={(e) => e.preventDefault()} 
        className={`absolute inset-0 z-0 ${mode === 'placing_item' ? 'cursor-crosshair' : 'cursor-default'}`}
      />

      {/* --- UI SUPERIOR IZQUIERDA: BOTÓN DE PRESUPUESTO --- */}
      <div className="absolute top-6 left-6 z-20">
        <button 
          onClick={toggleBudget}
          className="bg-neutral-800/90 backdrop-blur border border-neutral-600 hover:border-green-400 text-white rounded-full pl-2 pr-5 py-2 flex items-center gap-3 shadow-lg transition-all group hover:bg-neutral-800"
        >
          <div className="w-8 h-8 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center group-hover:bg-green-500 group-hover:text-white transition-colors">
            <Euro size={18} />
          </div>
          <div className="flex flex-col items-start leading-none">
            <span className="text-xs text-neutral-400 uppercase font-bold tracking-wider">Total</span>
            <span className="text-lg font-bold">{totalPrice.toLocaleString()} €</span>
          </div>
        </button>
      </div>

      {/* PANEL DE PRESUPUESTO (Flotante) */}
      <BudgetPanel />

      {/* --- UI CENTRAL INFERIOR: TOOLBAR --- */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
        
        {/* HINT FLOTANTE: SOLO SI HAY OBJETO SELECCIONADO */}
        {selectedItemId && mode === 'editing' && (
          <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 glass-panel px-4 py-2 flex items-center gap-4 whitespace-nowrap animate-in fade-in slide-in-from-bottom-2">
             <div className="flex items-center gap-2 text-neutral-300 text-sm">
                <span className="bg-white/10 px-1.5 py-0.5 rounded text-white font-mono text-xs">T</span>
                <Move size={14} /> Mover
             </div>
             <div className="w-px h-3 bg-white/20"></div>
             <div className="flex items-center gap-2 text-neutral-300 text-sm">
                <span className="bg-white/10 px-1.5 py-0.5 rounded text-white font-mono text-xs">R</span>
                <RotateCw size={14} /> Rotar
             </div>
             <div className="w-px h-3 bg-white/20"></div>
             <div className="flex items-center gap-2 text-neutral-300 text-sm">
                <span className="bg-white/10 px-1.5 py-0.5 rounded text-white font-mono text-xs">E</span>
                <Scaling size={14} /> Escalar
             </div>
             <div className="w-px h-3 bg-white/20"></div>
             <div className="flex items-center gap-2 text-red-300 text-sm">
                <span className="bg-red-500/20 px-1.5 py-0.5 rounded text-red-200 font-mono text-xs">Supr</span>
                Borrar
             </div>
          </div>
        )}

        <Toolbar />
      </div>

      {/* LOGO AGUA (OPCIONAL, ABAJO DERECHA DISCRETO) */}
      <div className="absolute bottom-6 right-6 text-white/10 font-black text-4xl pointer-events-none select-none">
        A42
      </div>

    </div>
  );
};
// --- END OF FILE src/features/editor/Editor3D.tsx ---