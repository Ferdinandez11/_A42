// --- START OF FILE src/features/editor/Editor3D.tsx ---
import React, { useEffect, useRef } from 'react';
import { A42Engine } from './engine/A42Engine';
import { Toolbar } from './ui/Toolbar';
import { useAppStore } from '../../stores/useAppStore';

export const Editor3D = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<A42Engine | null>(null);
  
  // Obtenemos todo el estado necesario
  const { mode, totalPrice, gridVisible, items, cameraType, pendingView, clearPendingView } = useAppStore();

  useEffect(() => {
    if (!containerRef.current) return;
    
    const engine = new A42Engine(containerRef.current);
    engine.init();
    engineRef.current = engine;

    engine.setGridVisible(useAppStore.getState().gridVisible);

    return () => engine.dispose();
  }, []);

  // Sync Grid
  useEffect(() => {
    if (engineRef.current) engineRef.current.setGridVisible(gridVisible);
  }, [gridVisible]);

  // Sync Items (Undo/Redo)
  useEffect(() => {
    if (engineRef.current) engineRef.current.syncSceneFromStore(items);
  }, [items]);

  // Sync Cámara (Perspectiva vs Ortográfica)
  useEffect(() => {
    if (engineRef.current) engineRef.current.switchCamera(cameraType);
  }, [cameraType]);

  // Trigger View (Top, Front, etc)
  useEffect(() => {
    if (pendingView && engineRef.current) {
      engineRef.current.setView(pendingView);
      clearPendingView(); // Limpiamos la acción para que no se repita
    }
  }, [pendingView, clearPendingView]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (mode === 'catalog') return;
    if ((e.target as HTMLElement).closest('button, .glass-panel, a, input')) return;
    if (engineRef.current) engineRef.current.onMouseDown(e.nativeEvent);
  };

  return (
    <div className="w-screen h-screen relative bg-neutral-900 overflow-hidden">
      
      {/* 3D CANVAS */}
      <div 
        ref={containerRef} 
        onPointerDown={handlePointerDown}
        onContextMenu={(e) => e.preventDefault()} 
        className={`absolute inset-0 z-0 ${mode === 'placing_item' ? 'cursor-crosshair' : 'cursor-default'}`}
      />

      {/* UI LAYERS */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
        <Toolbar />
      </div>

      {/* DEBUG INFO */}
      <div className="absolute top-5 left-5 z-10 text-white font-sans pointer-events-none drop-shadow-md">
        <h1 className="text-xl font-bold">🏗️ A42 Engine</h1>
        <p className="text-sm opacity-80">Mode: <span className="text-blue-400 font-bold uppercase">{mode}</span></p>
        <p className="text-sm font-bold text-green-400">Total: {totalPrice.toLocaleString()} €</p>
        <p className="text-xs text-gray-400 mt-2">
            Click Izq: Seleccionar/Poner <br/>
            Teclas: T/R/E (Gizmo), Z (Undo), Supr (Borrar)
        </p>
      </div>
    </div>
  );
};
// --- END OF FILE src/features/editor/Editor3D.tsx ---