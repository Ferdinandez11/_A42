import React, { useEffect, useRef, useState } from 'react';
import { A42Engine } from './engine/A42Engine';
import { Toolbar } from './ui/Toolbar';
import { BudgetPanel } from './ui/BudgetPanel';
import { EnvironmentPanel } from './ui/EnvironmentPanel';
import { FloorProperties } from './ui/FloorProperties';
import { FenceProperties } from './ui/FenceProperties';
import { useAppStore } from '../../stores/useAppStore';
import { Euro, Move, RotateCw, Scaling, Trash2, Copy, QrCode } from 'lucide-react';
import { InputModal } from './ui/InputModal';
import { QRModal } from './ui/QRModal';
import { supabase } from '../../lib/supabase';

export const Editor3D = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<A42Engine | null>(null);
  const [isQRVisible, setQRVisible] = useState(false);
  
  const { 
    mode, gridVisible, items, cameraType, pendingView, clearPendingView,
    totalPrice, toggleBudget, selectedItemId, duplicateItem, removeItem, selectItem,
    sunPosition, backgroundColor, measurementResult, safetyZonesVisible,
    setUser, setProjectInfo 
  } = useAppStore();

  // --- CARGA DE DATOS Y USUARIO ---
  useEffect(() => {
    // 1. Auth check
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user || null));
    supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user || null));

    // 2. Load Project Logic
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get('project_id');
    const sceneData = params.get('scene'); // Legacy QR

    if (projectId) {
      loadProjectFromSupabase(projectId);
    } else if (sceneData) {
      try {
        const json = decodeURIComponent(escape(window.atob(sceneData)));
        const loadedItems = JSON.parse(json);
        if (Array.isArray(loadedItems)) {
            useAppStore.setState({ items: loadedItems });
            window.history.replaceState({}, document.title, window.location.pathname);
        }
      } catch (e) { console.error("Legacy load error", e); }
    }
  }, []);

  const loadProjectFromSupabase = async (id: string) => {
    console.log("📥 Intentando cargar proyecto:", id);
    const { data: project, error } = await supabase.from('projects').select('*').eq('id', id).single();

    if (error || !project) {
      console.error("Error loading:", error);
      alert("Error al cargar proyecto. Puede que haya sido borrado.");
      return;
    }

    // --- LOGICA DE COMPATIBILIDAD DE FORMATOS ---
    let itemsToLoad = [];
    let fenceToLoad = null;

    // Caso 1: Estructura Nueva { items: [], fenceConfig: {} }
    if (project.data && Array.isArray(project.data.items)) {
        itemsToLoad = project.data.items;
        fenceToLoad = project.data.fenceConfig;
    }
    // Caso 2: Estructura Antigua (Array directo)
    else if (Array.isArray(project.data)) {
        itemsToLoad = project.data;
    }
    // Caso 3: Intermedio
    else if (project.data && Array.isArray(project.data.data)) {
        itemsToLoad = project.data.data;
    }

    if (itemsToLoad.length > 0) {
        // 1. Inyectar en Zustand Store
        useAppStore.setState({ 
            items: itemsToLoad,
            fenceConfig: fenceToLoad || { presetId: 'wood', colors: { post: 0, slatA: 0 } },
            totalPrice: project.total_price || 0,
            currentProjectId: project.id,
            currentProjectName: project.name
        });
        
        // 2. Guardar Info de Sesión
        setProjectInfo(project.id, project.name);

        // 3. Forzar sync con Motor 3D (Delay para asegurar que el motor está init)
        setTimeout(() => {
            if (engineRef.current) {
                console.log("🎨 Sincronizando escena 3D...");
                engineRef.current.syncSceneFromStore(itemsToLoad);
            }
        }, 200);
    }
  };

  // --- MOTOR 3D INIT ---
  useEffect(() => {
    if (!containerRef.current) return;
    const engine = new A42Engine(containerRef.current);
    engine.init();
    engineRef.current = engine;
    
    // IMPORTANTE: Exponer engine globalmente para Toolbar (Capturas)
    // @ts-ignore
    window.editorEngine = engine;

    engine.setGridVisible(useAppStore.getState().gridVisible);
    const state = useAppStore.getState();
    engine.updateSunPosition(state.sunPosition.azimuth, state.sunPosition.elevation);
    
    if (state.backgroundColor === '#111111') engine.setSkyVisible(true);
    else engine.setBackgroundColor(state.backgroundColor);

    return () => engine.dispose();
  }, []);

  // --- REACTIVITY HOOKS ---
  useEffect(() => { if (engineRef.current) engineRef.current.setGridVisible(gridVisible); }, [gridVisible]);
  useEffect(() => { if (engineRef.current) engineRef.current.syncSceneFromStore(items); }, [items]);
  useEffect(() => { if (engineRef.current) engineRef.current.switchCamera(cameraType); }, [cameraType]);
  useEffect(() => { if (engineRef.current) engineRef.current.updateSafetyZones(safetyZonesVisible); }, [safetyZonesVisible]);
  useEffect(() => { if (engineRef.current) engineRef.current.clearTools(); }, [mode]);
  useEffect(() => { if (engineRef.current) engineRef.current.updateSunPosition(sunPosition.azimuth, sunPosition.elevation); }, [sunPosition]);
  useEffect(() => {
    if (pendingView && engineRef.current) {
      engineRef.current.setView(pendingView);
      clearPendingView();
    }
  }, [pendingView, clearPendingView]);
  useEffect(() => {
    if (engineRef.current) {
      if (backgroundColor === '#111111') engineRef.current.setSkyVisible(true);
      else engineRef.current.setBackgroundColor(backgroundColor);
    }
  }, [backgroundColor]);

  // --- HANDLERS ---
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
      <div ref={containerRef} onPointerDown={handlePointerDown} onContextMenu={(e) => e.preventDefault()} 
        className={`absolute inset-0 z-0 ${mode === 'placing_item' ? 'cursor-crosshair' : (mode === 'measuring' ? 'cursor-help' : 'cursor-default')}`} />
      
      <BudgetPanel />
      <EnvironmentPanel />
      <FloorProperties />
      <FenceProperties />

      <div className="absolute top-6 right-6 z-20">
        <button onClick={() => setQRVisible(true)} className="bg-neutral-800/90 hover:bg-neutral-700 text-white p-3 rounded-full border border-neutral-600 shadow-lg transition-all group">
            <QrCode size={20} className="group-hover:text-blue-400 transition-colors" />
        </button>
      </div>

      <div className="absolute bottom-6 left-6 z-20">
        <button onClick={toggleBudget} className="bg-neutral-800/90 backdrop-blur border border-neutral-600 hover:border-green-400 text-white rounded-full pl-2 pr-5 py-2 flex items-center gap-3 shadow-lg transition-all group hover:bg-neutral-800">
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
             <button onClick={() => handleGizmoMode('translate')} className="p-2 hover:bg-white/10 rounded text-neutral-300 hover:text-white"><Move size={16} /></button>
             <button onClick={() => handleGizmoMode('rotate')} className="p-2 hover:bg-white/10 rounded text-neutral-300 hover:text-white"><RotateCw size={16} /></button>
             <button onClick={() => handleGizmoMode('scale')} className="p-2 hover:bg-white/10 rounded text-neutral-300 hover:text-white"><Scaling size={16} /></button>
             <div className="w-px h-5 bg-white/20 mx-1"></div>
             <button onClick={handleDuplicate} className="p-2 hover:bg-blue-500/20 rounded text-blue-300 hover:text-blue-100"><Copy size={16} /></button>
             <div className="w-px h-5 bg-white/20 mx-1"></div>
             <button onClick={handleDelete} className="p-2 hover:bg-red-500/20 rounded text-red-300 hover:text-red-100"><Trash2 size={16} /></button>
          </div>
        )}
        <Toolbar />
      </div>

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
      <InputModal />
      <QRModal isOpen={isQRVisible} onClose={() => setQRVisible(false)} />
      <div className="absolute bottom-6 right-6 text-white/5 font-black text-4xl pointer-events-none select-none">A42</div>
    </div>
  );
};