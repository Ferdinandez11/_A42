// --- START OF FILE src/features/editor/ui/Toolbar.tsx ---
import React, { useState } from 'react';
import { 
  MousePointer2, Grid3X3, Component, Trees, 
  Grid, Undo2, Redo2, Settings,
  Eye, Box, ArrowUp, ArrowRight, GalleryVerticalEnd, Square,
  ChevronUp, Sun // Importar Sun
} from 'lucide-react';
import { useAppStore } from '../../../stores/useAppStore';
import './Editor.css';

export const Toolbar = () => {
  const { 
    mode, setMode, 
    gridVisible, toggleGrid, 
    undo, redo, past, future,
    cameraType, setCameraType, triggerView,
    toggleEnvPanel, envPanelVisible // Importar control panel entorno
  } = useAppStore();

  const [showViews, setShowViews] = useState(false);

  const tools = [
    { id: 'idle', icon: <MousePointer2 size={20} />, label: 'Seleccionar' },
    { id: 'drawing_floor', icon: <Grid3X3 size={20} />, label: 'Suelo' },
    { id: 'drawing_fence', icon: <Component size={20} />, label: 'Valla' },
    { id: 'catalog', icon: <Trees size={20} />, label: 'Catálogo' },
  ];

  return (
    <div className="relative flex flex-col items-center">
      
      {showViews && (
        <div className="absolute bottom-full mb-4 glass-panel flex-row animate-in slide-in-from-bottom-2 fade-in duration-200">
           <button 
             className={`tool-btn ${cameraType === 'perspective' ? 'active' : ''}`} 
             onClick={() => setCameraType('perspective')} title="3D"
           >
             <Eye size={18} />
           </button>
           <button 
             className={`tool-btn ${cameraType === 'orthographic' ? 'active' : ''}`} 
             onClick={() => setCameraType('orthographic')} title="2D"
           >
             <Square size={18} />
           </button>
           
           <div style={{ width: 1, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
           
           <button className="tool-btn" onClick={() => triggerView('top')} title="Planta"><ArrowUp size={18} /></button>
           <button className="tool-btn" onClick={() => triggerView('front')} title="Alzado"><GalleryVerticalEnd size={18} /></button>
           <button className="tool-btn" onClick={() => triggerView('side')} title="Perfil"><ArrowRight size={18} /></button>
           <button className="tool-btn" onClick={() => triggerView('iso')} title="Iso"><Box size={18} /></button>
        </div>
      )}

      <div className="glass-panel">
        {tools.map((tool) => (
          <button
            key={tool.id}
            className={`tool-btn ${mode === tool.id ? 'active' : ''}`}
            onClick={() => { setMode(tool.id as any); setShowViews(false); }}
          >
            {tool.icon}
            <span className="tool-label">{tool.label}</span>
          </button>
        ))}
        
        <div style={{ width: 1, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

        <button 
          className={`tool-btn ${showViews ? 'active' : ''}`} 
          onClick={() => setShowViews(!showViews)}
        >
          <Eye size={20} />
          {cameraType === 'orthographic' && (
             <span className="absolute top-1 right-1 w-2 h-2 bg-green-400 rounded-full"></span>
          )}
          <span className="tool-label">Vistas</span>
          <ChevronUp size={12} className={`absolute top-1 right-1 transition-transform ${showViews ? 'rotate-180' : ''} opacity-50`} />
        </button>

        {/* NUEVO BOTÓN ENTORNO */}
        <button 
          className={`tool-btn ${envPanelVisible ? 'active' : ''}`} 
          onClick={toggleEnvPanel}
        >
          <Sun size={20} />
          <span className="tool-label">Entorno</span>
        </button>

        <button className={`tool-btn ${gridVisible ? 'active' : ''}`} onClick={toggleGrid}>
          <Grid size={20} />
          <span className="tool-label">Grid</span>
        </button>

        <div style={{ width: 1, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

        <button className="tool-btn" onClick={undo} disabled={past.length === 0} style={{ opacity: past.length === 0 ? 0.3 : 1 }}>
          <Undo2 size={20} />
          <span className="tool-label">Undo</span>
        </button>
        
        <button className="tool-btn" onClick={redo} disabled={future.length === 0} style={{ opacity: future.length === 0 ? 0.3 : 1 }}>
          <Redo2 size={20} />
          <span className="tool-label">Redo</span>
        </button>
      </div>
    </div>
  );
};
// --- END OF FILE src/features/editor/ui/Toolbar.tsx ---