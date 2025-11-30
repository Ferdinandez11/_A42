// --- START OF FILE src/features/editor/Editor3D.tsx ---
import React, { useEffect, useRef } from 'react';
import { A42Engine } from './engine/A42Engine';
import { Toolbar } from './ui/Toolbar';
import { BudgetPanel } from './ui/BudgetPanel';
import { EnvironmentPanel } from './ui/EnvironmentPanel';
import { FloorProperties } from './ui/FloorProperties';
import { FenceProperties } from './ui/FenceProperties'; // <--- NUEVO IMPORT
import { useAppStore } from '../../stores/useAppStore';
import { Euro, Move, RotateCw, Scaling, Trash2, Copy } from 'lucide-react';

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
    duplicateItem, 
    removeItem,    
    selectItem,
    sunPosition,
    backgroundColor,
    measurementResult 
  } = useAppStore();

  useEffect(() => {
    if (!containerRef.current) return;
    const engine = new A42Engine(containerRef.current);
    engine.init();
    engineRef.current = engine;
    engine.setGridVisible(useAppStore.getState().gridVisible);

    const state = useAppStore.getState();
    engine.updateSunPosition(state.sunPosition.azimuth, state.sunPosition.elevation);
    if (state.backgroundColor === '#111111') engine.setSkyVisible(true);
    else engine.setBackgroundColor(state.backgroundColor);

    return () => engine.dispose();
  }, []);

  // Sync Engine <-> Store
  useEffect(() => { if (engineRef.current) engineRef.current.setGridVisible(gridVisible); }, [gridVisible]);
  useEffect(() => { if (engineRef.current) engineRef.current.syncSceneFromStore(items); }, [items]);
  useEffect(() => { if (engineRef.current) engineRef.current.switchCamera(cameraType); }, [cameraType]);
  
  // Limpieza automática
  useEffect(() => {
    if (engineRef.current) {
        engineRef.current.clearTools(); 
    }
  }, [mode]);

  useEffect(() => {
    if (pendingView && engineRef.current) {
      engineRef.current.setView(pendingView);
      clearPendingView();
    }
  }, [pendingView, clearPendingView]);

  useEffect(() => {
    if (engineRef.current) engineRef.current.updateSunPosition(sunPosition.azimuth, sunPosition.elevation);
  }, [sunPosition]);

  useEffect(() => {
    if (engineRef.current) {
      if (backgroundColor === '#111111') engineRef.current.setSkyVisible(true);
      else engineRef.current.setBackgroundColor(backgroundColor);
    }
  }, [backgroundColor]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (mode === 'catalog') return;
    if ((e.target as HTMLElement).closest('button, .glass-panel, a, input, .scroll-container')) return;
    if (engineRef.current) engineRef.current.onMouseDown(e.nativeEvent);
  };

  const handleGizmoMode = (mode: 'translate' | 'rotate' | 'scale') => { engineRef.current?.setGizmoMode(mode); };
  const handleDuplicate = () => { if (selectedItemId) duplicateItem(selectedItemId); };
  const handleDelete = () => { if (selectedItemId) { removeItem(selectedItemId); selectItem(null); } };

  return (
    <div className="w-screen h-screen relative bg-neutral-900 overflow-hidden font-sans">
      <div 
        ref={containerRef} 
        onPointerDown={handlePointerDown}
        onContextMenu={(e) => e.preventDefault()} 
        className={`absolute inset-0 z-0 ${mode === 'placing_item' ? 'cursor-crosshair' : (mode === 'measuring' ? 'cursor-help' : 'cursor-default')}`}
      />
      
      {/* PANELES DE PROPIEDADES (DERECHA) */}
      <BudgetPanel />
      <EnvironmentPanel />
      <FloorProperties />
      <FenceProperties /> {/* <--- NUEVO COMPONENTE DE VALLAS */}

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

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-4">
        {selectedItemId && mode === 'editing' && (
          <div className="glass-panel px-2 py-1 flex items-center gap-1 animate-in fade-in slide-in-from-bottom-2">
             <button onClick={() => handleGizmoMode('translate')} className="p-2 hover:bg-white/10 rounded text-neutral-300 hover:text-white" title="Mover"><Move size={16} /></button>
             <button onClick={() => handleGizmoMode('rotate')} className="p-2 hover:bg-white/10 rounded text-neutral-300 hover:text-white" title="Rotar"><RotateCw size={16} /></button>
             <button onClick={() => handleGizmoMode('scale')} className="p-2 hover:bg-white/10 rounded text-neutral-300 hover:text-white" title="Escalar"><Scaling size={16} /></button>
             <div className="w-px h-5 bg-white/20 mx-1"></div>
             <button onClick={handleDuplicate} className="p-2 hover:bg-blue-500/20 rounded text-blue-300 hover:text-blue-100" title="Duplicar"><Copy size={16} /></button>
             <div className="w-px h-5 bg-white/20 mx-1"></div>
             <button onClick={handleDelete} className="p-2 hover:bg-red-500/20 rounded text-red-300 hover:text-red-100" title="Borrar"><Trash2 size={16} /></button>
          </div>
        )}
        <Toolbar />
      </div>

      {/* AQUÍ ESTÁ EL RESULTADO DE LA MEDICIÓN (FIJO ARRIBA) */}
      {mode === 'measuring' && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
            <div className="bg-black/80 backdrop-blur-md text-white px-6 py-3 rounded-full border border-white/20 shadow-2xl font-mono text-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
                <span className="w-3 h-3 rounded-full bg-yellow-400 animate-pulse"></span>
                {measurementResult !== null 
                    ? <span>Distancia: <strong className="text-yellow-400">{measurementResult.toFixed(2)} m</strong></span>
                    : <span className="text-neutral-300 text-sm">Selecciona punto A y punto B</span>}
            </div>
        </div>
      )}

      <div className="absolute bottom-6 right-6 text-white/5 font-black text-4xl pointer-events-none select-none">A42</div>
    </div>
  );
};
// --- END OF FILE src/features/editor/Editor3D.tsx ---