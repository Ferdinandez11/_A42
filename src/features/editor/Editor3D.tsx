// --- START OF FILE src/features/editor/Editor3D.tsx ---
import React, { useEffect, useRef } from 'react';
import { A42Engine } from './engine/A42Engine';
import { Toolbar } from './ui/Toolbar';
import { BudgetPanel } from './ui/BudgetPanel';
import { useAppStore } from '../../stores/useAppStore';
import { Euro, Move, RotateCw, Scaling, Trash2, Copy } from 'lucide-react'; // Iconos nuevos

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
    selectedItemId,
    duplicateItem, // Importamos acción duplicar
    removeItem,    // Importamos acción borrar
    selectItem     // Para deseleccionar si borramos
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

  // Funciones para la barra flotante
  const handleGizmoMode = (mode: 'translate' | 'rotate' | 'scale') => {
    engineRef.current?.setGizmoMode(mode);
  };

  const handleDuplicate = () => {
    if (selectedItemId) duplicateItem(selectedItemId);
  };

  const handleDelete = () => {
    if (selectedItemId) {
      removeItem(selectedItemId);
      selectItem(null); // Deseleccionar visualmente
    }
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

      {/* --- PANEL DE PRESUPUESTO --- */}
      <BudgetPanel />

      {/* --- BOTÓN DE PRESUPUESTO (ABAJO IZQUIERDA) --- */}
      <div className="absolute bottom-6 left-6 z-20">
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

      {/* --- UI CENTRAL: TOOLBAR Y MENÚ CONTEXTUAL --- */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-4">
        
        {/* BARRA FLOTANTE CONTEXTUAL (INTERACTIVA) */}
        {selectedItemId && mode === 'editing' && (
          <div className="glass-panel px-2 py-1 flex items-center gap-1 animate-in fade-in slide-in-from-bottom-2">
             
             {/* MOVER */}
             <button onClick={() => handleGizmoMode('translate')} className="p-2 hover:bg-white/10 rounded text-neutral-300 hover:text-white flex items-center gap-2 transition-colors" title="Mover (T)">
                <Move size={16} />
                <span className="text-xs font-medium hidden sm:inline">Mover</span>
             </button>

             {/* ROTAR */}
             <button onClick={() => handleGizmoMode('rotate')} className="p-2 hover:bg-white/10 rounded text-neutral-300 hover:text-white flex items-center gap-2 transition-colors" title="Rotar (R)">
                <RotateCw size={16} />
                <span className="text-xs font-medium hidden sm:inline">Rotar</span>
             </button>

             {/* ESCALAR */}
             <button onClick={() => handleGizmoMode('scale')} className="p-2 hover:bg-white/10 rounded text-neutral-300 hover:text-white flex items-center gap-2 transition-colors" title="Escalar (E)">
                <Scaling size={16} />
                <span className="text-xs font-medium hidden sm:inline">Escalar</span>
             </button>

             <div className="w-px h-5 bg-white/20 mx-1"></div>

             {/* DUPLICAR */}
             <button onClick={handleDuplicate} className="p-2 hover:bg-blue-500/20 rounded text-blue-300 hover:text-blue-100 flex items-center gap-2 transition-colors" title="Duplicar">
                <Copy size={16} />
                <span className="text-xs font-medium hidden sm:inline">Clonar</span>
             </button>

             <div className="w-px h-5 bg-white/20 mx-1"></div>

             {/* BORRAR */}
             <button onClick={handleDelete} className="p-2 hover:bg-red-500/20 rounded text-red-300 hover:text-red-100 flex items-center gap-2 transition-colors" title="Borrar (Supr)">
                <Trash2 size={16} />
                <span className="text-xs font-medium hidden sm:inline">Borrar</span>
             </button>
          </div>
        )}

        <Toolbar />
      </div>

      {/* LOGO AGUA DISCRETO */}
      <div className="absolute bottom-6 right-6 text-white/5 font-black text-4xl pointer-events-none select-none">
        A42
      </div>

    </div>
  );
};
// --- END OF FILE src/features/editor/Editor3D.tsx ---