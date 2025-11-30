// --- START OF FILE src/features/editor/ui/Toolbar.tsx ---
import React from 'react';
import { 
  MousePointer2, Grid3X3, Component, Trees, 
  Grid, Undo2, Redo2, Settings,
  Box,        // Para Isométrica
  ArrowUp,    // Para Planta
  ArrowRight, // Para Perfil
  GalleryVerticalEnd, // Para Alzado
  Eye,        // Para Perspectiva
  Square      // Para Ortográfica
} from 'lucide-react';
import { useAppStore } from '../../../stores/useAppStore';
import './Editor.css';

export const Toolbar = () => {
  const { 
    mode, setMode, 
    gridVisible, toggleGrid, 
    undo, redo, past, future,
    cameraType, setCameraType,
    triggerView 
  } = useAppStore();

  const tools = [
    { id: 'idle', icon: <MousePointer2 size={20} />, label: 'Seleccionar' },
    { id: 'drawing_floor', icon: <Grid3X3 size={20} />, label: 'Suelo' },
    { id: 'drawing_fence', icon: <Component size={20} />, label: 'Valla' },
    { id: 'catalog', icon: <Trees size={20} />, label: 'Catálogo' },
  ];

  return (
    <div className="flex flex-col gap-2 items-center">
      {/* BARRA PRINCIPAL */}
      <div className="glass-panel">
        {tools.map((tool) => (
          <button
            key={tool.id}
            className={`tool-btn ${mode === tool.id ? 'active' : ''}`}
            onClick={() => setMode(tool.id as any)}
          >
            {tool.icon}
            <span className="tool-label">{tool.label}</span>
          </button>
        ))}
        
        <div style={{ width: 1, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

        <button className={`tool-btn ${gridVisible ? 'active' : ''}`} onClick={toggleGrid}>
          <Grid size={20} />
          <span className="tool-label">{gridVisible ? 'Ocultar' : 'Grid'}</span>
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

      {/* BARRA DE VISTAS (Debajo de la principal) */}
      <div className="glass-panel">
        {/* Switch Tipo de Cámara */}
        <button 
          className={`tool-btn ${cameraType === 'perspective' ? 'active' : ''}`} 
          onClick={() => setCameraType('perspective')}
          title="Vista Perspectiva"
        >
          <Eye size={20} />
          <span className="tool-label">3D</span>
        </button>
        <button 
          className={`tool-btn ${cameraType === 'orthographic' ? 'active' : ''}`} 
          onClick={() => setCameraType('orthographic')}
          title="Vista Ortográfica"
        >
          <Square size={20} />
          <span className="tool-label">2D</span>
        </button>

        <div style={{ width: 1, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

        {/* Botones de Posición */}
        <button className="tool-btn" onClick={() => triggerView('top')} title="Planta">
          <ArrowUp size={20} />
          <span className="tool-label">Planta</span>
        </button>
        <button className="tool-btn" onClick={() => triggerView('front')} title="Alzado">
          <GalleryVerticalEnd size={20} />
          <span className="tool-label">Alzado</span>
        </button>
        <button className="tool-btn" onClick={() => triggerView('side')} title="Perfil">
          <ArrowRight size={20} />
          <span className="tool-label">Perfil</span>
        </button>
        <button className="tool-btn" onClick={() => triggerView('iso')} title="Isométrica">
          <Box size={20} />
          <span className="tool-label">Iso</span>
        </button>
      </div>
    </div>
  );
};
// --- END OF FILE src/features/editor/ui/Toolbar.tsx ---