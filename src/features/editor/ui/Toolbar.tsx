import React, { useState, useRef } from 'react';
import { 
  MousePointer2, Grid3X3, Component, Trees, Grid, Undo2, Redo2, Eye, Box, ArrowUp, ArrowRight, GalleryVerticalEnd, Square, Sun, Upload, Ruler, Footprints, Video, Camera, Film, Download, FileText, ShieldAlert, FileDown, Save, LayoutDashboard
} from 'lucide-react';
import { useEditorStore } from "@/stores/editor/useEditorStore";
import { useSceneStore } from "@/stores/scene/useSceneStore"; // 🔥
import { useProjectStore } from "@/stores/project/useProjectStore";
import { supabase } from '../../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import './Editor.css';

export const Toolbar = () => {
  const navigate = useNavigate();
  
  // UI Actions
  const {
    mode, setMode, gridVisible, toggleGrid,
    cameraType, setCameraType, triggerView,
    envPanelVisible, toggleEnvPanel,
    setMeasurementResult,
    safetyZonesVisible, toggleSafetyZones,
    requestInput,
  } = useEditorStore();

  // Data Actions
  const {
    items, addItem, fenceConfig, totalPrice,
    undo, redo, past, future // Undo/Redo movidos aquí
  } = useSceneStore(); // 🔥

  const {
    user, currentProjectId, currentProjectName,
    isReadOnlyMode, setProjectInfo,
  } = useProjectStore();

  const [showViews, setShowViews] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tools = [
    { id: 'idle', icon: <MousePointer2 size={20} />, label: 'Seleccionar' },
    { id: 'drawing_floor', icon: <Grid3X3 size={20} />, label: 'Suelo' },
    { id: 'drawing_fence', icon: <Component size={20} />, label: 'Valla' },
    { id: 'catalog', icon: <Trees size={20} />, label: 'Catálogo' },
  ];

  const handleSaveProject = async () => {
    if (isReadOnlyMode) return alert("Modo de Solo Lectura. No puedes sobrescribir este proyecto.");
    if (!user) return alert("Debes iniciar sesión para guardar.");

    const engine = (window as any).editorEngine;
    if (!engine || !engine.renderer) return;
    
    engine.render(); 
    const thumbnailBase64 = engine.renderer.domElement.toDataURL('image/jpeg', 0.5);

    const projectData = {
      items,
      fenceConfig,
      camera: cameraType
    };

    let nameToSave = currentProjectName;
    let isOverwrite = false;

    if (currentProjectId) {
      if (confirm(`¿Sobreescribir proyecto "${currentProjectName}"?`)) {
        isOverwrite = true;
      } else {
        const newName = await requestInput("Guardar como nuevo:", currentProjectName + " (Copia)");
        if (!newName) return; 
        nameToSave = newName;
        isOverwrite = false;
      }
    } else {
      const newName = await requestInput("Nombre del Proyecto:", "Mi Parque Nuevo");
      if (!newName) return;
      nameToSave = newName;
      isOverwrite = false;
    }

    setIsSaving(true);
    try {
      if (isOverwrite && currentProjectId) {
        const { error } = await supabase.from('projects').update({
          name: nameToSave,
          data: projectData,
          thumbnail_url: thumbnailBase64,
          total_price: totalPrice,
          updated_at: new Date()
        }).eq('id', currentProjectId);
        if (error) throw error;
        alert("Proyecto actualizado correctamente.");
      } else {
        const { data, error } = await supabase.from('projects').insert([{
          user_id: user.id,
          name: nameToSave,
          data: projectData,
          thumbnail_url: thumbnailBase64,
          total_price: totalPrice
        }]).select().single();
        if (error) throw error;
        alert("Proyecto guardado correctamente.");
        if (data) setProjectInfo(data.id, data.name);
      }
    } catch (err: any) {
      alert("Error al guardar: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    const url = URL.createObjectURL(file);
    const fileName = file.name.replace('.glb', '').replace('.gltf', '');
    // Importación con any para simplificar, se recomienda usar ObjectManager directamente
    addItem({ 
        uuid: crypto.randomUUID(), productId: 'custom_upload', name: fileName, price: 0, 
        type: 'model', modelUrl: url, position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] 
    } as any);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleMeasureMode = () => { 
    if (mode === 'measuring') { setMode('idle'); setMeasurementResult(null); } 
    else { setMode('measuring'); setShowViews(false); } 
  };

  const getEngine = () => (window as any).editorEngine;
  const generatePDF = () => { getEngine()?.pdfManager.generatePDF(); };
  const activateWalkMode = () => { getEngine()?.walkManager.enable(); };
  const takePhoto = () => { getEngine()?.recorderManager.takeScreenshot(); };
  const start360Video = () => { getEngine()?.recorderManager.startOrbitAnimation(); };
  const exportGLB = () => { getEngine()?.exportManager.exportGLB(); };
  const exportDXF = () => { getEngine()?.exportManager.exportDXF(); };
  
  const toggleRecording = () => {
    const manager = getEngine()?.recorderManager;
    if (!manager) return;
    if (isRecording) { manager.stopRecording(); setIsRecording(false); } 
    else { manager.startRecording(); setIsRecording(true); }
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center">
      {showViews && (
        <div className="absolute bottom-full mb-4 glass-panel flex-row animate-in slide-in-from-bottom-2 fade-in duration-200">
           <button className={`tool-btn ${cameraType === 'perspective' ? 'active' : ''}`} onClick={() => setCameraType('perspective')} title="3D"><Eye size={18} /></button>
           <button className={`tool-btn ${cameraType === 'orthographic' ? 'active' : ''}`} onClick={() => setCameraType('orthographic')} title="2D"><Square size={18} /></button>
           <div style={{ width: 1, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
           <button className="tool-btn" onClick={() => triggerView('top')} title="Planta"><ArrowUp size={18} /></button>
           <button className="tool-btn" onClick={() => triggerView('front')} title="Alzado"><GalleryVerticalEnd size={18} /></button>
           <button className="tool-btn" onClick={() => triggerView('side')} title="Perfil"><ArrowRight size={18} /></button>
           <button className="tool-btn" onClick={() => triggerView('iso')} title="Iso"><Box size={18} /></button>
        </div>
      )}

      <div className="glass-panel">
        {user && (
           <button className="tool-btn text-blue-400 hover:text-blue-300" onClick={() => navigate(user.email?.includes('admin') || user.email?.includes('levipark') ? '/admin/crm' : '/portal?tab=projects')} title="Ir a Mis Proyectos">
             <LayoutDashboard size={20} /> <span className="tool-label">Portal</span>
           </button>
        )}
        {user && <div style={{ width: 1, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />}

        {tools.map((tool) => (
          <button key={tool.id} className={`tool-btn ${mode === tool.id ? 'active' : ''}`} onClick={() => { setMode(tool.id as any); setShowViews(false); }}>
            {tool.icon} <span className="tool-label">{tool.label}</span>
          </button>
        ))}

        <div style={{ width: 1, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

        {user ? (
            <button 
                className={`tool-btn ${isSaving ? 'text-yellow-400' : ''}`} 
                onClick={handleSaveProject} 
                disabled={isSaving || isReadOnlyMode}
                title={isReadOnlyMode ? "Modo Lectura (No se puede guardar)" : "Guardar Proyecto en Nube"}
                style={{ opacity: isReadOnlyMode ? 0.5 : 1, cursor: isReadOnlyMode ? 'not-allowed' : 'pointer' }}
            >
                <Save size={20} className={isSaving ? 'animate-pulse' : ''} /> 
                <span className="tool-label">{isSaving ? '...' : 'Guardar'}</span>
            </button>
        ) : (
            <button className="tool-btn opacity-50 hover:opacity-100" onClick={() => navigate('/login')} title="Inicia sesión para guardar">
                <Save size={20} /> <span className="tool-label">Login</span>
            </button>
        )}
        
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".glb,.gltf" className="hidden" />
        <button className="tool-btn" onClick={() => fileInputRef.current?.click()} title="Importar GLB">
            <Upload size={20} /> <span className="tool-label">Importar</span>
        </button>

        <div style={{ width: 1, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

        <button className={`tool-btn ${showViews ? 'active' : ''}`} onClick={() => setShowViews(!showViews)}>
          <Eye size={20} /> <span className="tool-label">Vistas</span>
        </button>
        <button className={`tool-btn ${envPanelVisible ? 'active' : ''}`} onClick={toggleEnvPanel}>
          <Sun size={20} /> <span className="tool-label">Entorno</span>
        </button>
        <button className={`tool-btn ${mode === 'measuring' ? 'active' : ''}`} onClick={toggleMeasureMode} title="Medir">
            <Ruler size={20} /> <span className="tool-label">Medir</span>
        </button>
        <button className={`tool-btn ${safetyZonesVisible ? 'active text-red-400' : ''}`} onClick={toggleSafetyZones} title="Zonas de Seguridad">
            <ShieldAlert size={20} /> <span className="tool-label">Zonas</span>
        </button>

        <div style={{ width: 1, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
        
        <button className="tool-btn" onClick={takePhoto} title="Hacer Foto">
            <Camera size={20} /> <span className="tool-label">Foto</span>
        </button>
        <button className="tool-btn" onClick={start360Video} title="Video 360 Auto">
            <Film size={20} /> <span className="tool-label">360º</span>
        </button>

        {user && (
          <>
            <button className="tool-btn" onClick={exportGLB} title="Exportar 3D (.glb)">
                <Download size={20} /> <span className="tool-label">3D</span>
            </button>
            <button className="tool-btn" onClick={exportDXF} title="Exportar Plano (.dxf)">
                <FileText size={20} /> <span className="tool-label">CAD</span>
            </button>
          </>
        )}

        <button className="tool-btn" onClick={generatePDF} title="Generar Dossier PDF">
            <FileDown size={20} /> <span className="tool-label">PDF</span>
        </button>

        <div style={{ width: 1, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

        <button className="tool-btn" onClick={activateWalkMode} title="Paseo (WASD)">
            <Footprints size={20} /> <span className="tool-label">Paseo</span>
        </button>
        <button className={`tool-btn ${isRecording ? 'text-red-500 hover:text-red-400' : ''}`} onClick={toggleRecording}>
            <Video size={20} /> <span className="tool-label">{isRecording ? "Stop" : "Rec"}</span>
        </button>
        
        <div style={{ width: 1, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
        <button className={`tool-btn ${gridVisible ? 'active' : ''}`} onClick={toggleGrid}>
          <Grid size={20} /> <span className="tool-label">Grid</span>
        </button>
        <div style={{ width: 1, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
        <button className="tool-btn" onClick={undo} disabled={past.length === 0} style={{ opacity: past.length === 0 ? 0.3 : 1 }}>
          <Undo2 size={20} /> <span className="tool-label">Undo</span>
        </button>
        <button className="tool-btn" onClick={redo} disabled={future.length === 0} style={{ opacity: future.length === 0 ? 0.3 : 1 }}>
          <Redo2 size={20} /> <span className="tool-label">Redo</span>
        </button>
      </div>
    </div>
  );
};