import React, { useRef, useState, useMemo, useCallback } from 'react';
import { 
  MousePointer2, Grid3X3, Component, Trees, Grid, Undo2, Redo2, Eye, Box, ArrowUp, 
  ArrowRight, GalleryVerticalEnd, Square, Sun, Upload, Ruler, Footprints, Video, 
  Camera, Film, Download, FileText, ShieldAlert, FileDown, Save, LayoutDashboard
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// STORES
import { useEditorStore } from "@/editor/stores/editor/useEditorStore";
import { useSceneStore } from "@/editor/stores/scene/useSceneStore";
import { useProjectStore } from "@/editor/stores/project/useProjectStore";
import type { EditorMode } from "@/domain/types/editor";

// HOOKS
import { useEditorMedia } from '@/editor/hooks/useEditorMedia';
import { useSceneTools } from '@/editor/hooks/useSceneTools';
import { useProjectActions } from '@/editor/hooks/useProjectActions';

import './Editor.css';

// 🎨 Types
interface ToolConfig {
  id: string;
  icon: React.ReactNode;
  label: string;
}

interface ViewButtonConfig {
  type?: 'camera' | 'view';
  id?: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  isActive?: boolean;
}

interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  className?: string;
  title?: string;
  style?: React.CSSProperties;
}

interface DividerProps {
  className?: string;
}

// 🎨 Constants
const TOOLS: ToolConfig[] = [
  { id: 'idle', icon: <MousePointer2 size={20} />, label: 'Seleccionar' },
  { id: 'drawing_floor', icon: <Grid3X3 size={20} />, label: 'Suelo' },
  { id: 'drawing_fence', icon: <Component size={20} />, label: 'Valla' },
  { id: 'catalog', icon: <Trees size={20} />, label: 'Catálogo' },
];

const CLASSES = {
  container: "fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center",
  panel: "glass-panel",
  floatingPanel: "absolute bottom-full mb-4 glass-panel flex-row animate-in slide-in-from-bottom-2 fade-in duration-200",
  divider: "w-px bg-white/10 mx-1",
  toolBtn: "tool-btn",
  toolBtnActive: "tool-btn active",
  toolLabel: "tool-label",
  portalBtn: "tool-btn text-blue-400 hover:text-blue-300",
} as const;

// 🎨 Sub-Components
const Divider: React.FC<DividerProps> = React.memo(({ className = CLASSES.divider }) => (
  <div className={className} />
));

Divider.displayName = 'Divider';

const ToolButton: React.FC<ToolButtonProps> = React.memo(({
  icon,
  label,
  onClick,
  isActive = false,
  disabled = false,
  className = '',
  title,
  style,
}) => (
  <button
    className={`${isActive ? CLASSES.toolBtnActive : CLASSES.toolBtn} ${className}`}
    onClick={onClick}
    disabled={disabled}
    title={title}
    style={style}
  >
    {icon}
    <span className={CLASSES.toolLabel}>{label}</span>
  </button>
), (prevProps, nextProps) => {
  return (
    prevProps.isActive === nextProps.isActive &&
    prevProps.disabled === nextProps.disabled &&
    prevProps.className === nextProps.className &&
    prevProps.label === nextProps.label &&
    prevProps.onClick === nextProps.onClick &&
    prevProps.title === nextProps.title
  );
});

ToolButton.displayName = 'ToolButton';

const ViewButton: React.FC<ViewButtonConfig> = React.memo(({
  icon,
  label,
  onClick,
  isActive = false,
}) => (
  <button
    className={`${CLASSES.toolBtn} ${isActive ? 'active' : ''}`}
    onClick={onClick}
    title={label}
  >
    {icon}
  </button>
), (prevProps, nextProps) => {
  return (
    prevProps.isActive === nextProps.isActive &&
    prevProps.onClick === nextProps.onClick &&
    prevProps.label === nextProps.label
  );
});

ViewButton.displayName = 'ViewButton';

const ViewsPanel: React.FC<{
  cameraType: string;
  onCameraChange: (type: 'perspective' | 'orthographic') => void;
  onViewTrigger: (view: 'top' | 'front' | 'side' | 'iso') => void;
}> = React.memo(({ cameraType, onCameraChange, onViewTrigger }) => {
  const handlePerspective = useCallback(() => onCameraChange('perspective'), [onCameraChange]);
  const handleOrthographic = useCallback(() => onCameraChange('orthographic'), [onCameraChange]);
  const handleTop = useCallback(() => onViewTrigger('top'), [onViewTrigger]);
  const handleFront = useCallback(() => onViewTrigger('front'), [onViewTrigger]);
  const handleSide = useCallback(() => onViewTrigger('side'), [onViewTrigger]);
  const handleIso = useCallback(() => onViewTrigger('iso'), [onViewTrigger]);

  return (
    <div className={CLASSES.floatingPanel}>
      <ViewButton
        icon={<Eye size={18} />}
        label="3D"
        onClick={handlePerspective}
        isActive={cameraType === 'perspective'}
      />
      <ViewButton
        icon={<Square size={18} />}
        label="2D"
        onClick={handleOrthographic}
        isActive={cameraType === 'orthographic'}
      />
      <Divider />
      <ViewButton
        icon={<ArrowUp size={18} />}
        label="Planta"
        onClick={handleTop}
      />
      <ViewButton
        icon={<GalleryVerticalEnd size={18} />}
        label="Alzado"
        onClick={handleFront}
      />
      <ViewButton
        icon={<ArrowRight size={18} />}
        label="Perfil"
        onClick={handleSide}
      />
      <ViewButton
        icon={<Box size={18} />}
        label="Iso"
        onClick={handleIso}
      />
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.cameraType === nextProps.cameraType &&
    prevProps.onCameraChange === nextProps.onCameraChange &&
    prevProps.onViewTrigger === nextProps.onViewTrigger
  );
});

ViewsPanel.displayName = 'ViewsPanel';

const MainTools: React.FC<{
  tools: ToolConfig[];
  currentMode: string;
  onModeChange: (mode: string) => void;
}> = React.memo(({ tools, currentMode, onModeChange }) => {
  const handleToolClick = useCallback((toolId: string) => {
    onModeChange(toolId);
  }, [onModeChange]);

  return (
    <>
      {tools.map((tool) => (
        <ToolButton
          key={tool.id}
          icon={tool.icon}
          label={tool.label}
          onClick={() => handleToolClick(tool.id)}
          isActive={currentMode === tool.id}
        />
      ))}
    </>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.currentMode === nextProps.currentMode &&
    prevProps.onModeChange === nextProps.onModeChange &&
    prevProps.tools === nextProps.tools
  );
});

MainTools.displayName = 'MainTools';

const ProjectActions: React.FC<{
  isSaving: boolean;
  isReadOnly: boolean;
  hasUser: boolean;
  onSave: () => void;
  onImport: () => void;
}> = React.memo(({ isSaving, isReadOnly, hasUser, onSave, onImport }) => {
  const saveTitle = useMemo(() => {
    if (!hasUser) return "Login Requerido";
    if (isReadOnly) return "Guardar como nuevo proyecto (no sobrescribirá el original)";
    return "Guardar";
  }, [hasUser, isReadOnly]);

  const saveLabel = useMemo(() => {
    if (!hasUser) return 'Login';
    if (isSaving) return '...';
    if (isReadOnly) return 'Guardar como nuevo';
    return 'Guardar';
  }, [hasUser, isSaving, isReadOnly]);

  // Permitir guardar incluso en modo solo lectura (siempre como nuevo proyecto)
  const isSaveDisabled = isSaving || !hasUser;

  const saveClassName = useMemo(() => {
    return [
      isSaving ? 'text-yellow-400' : '',
      isSaveDisabled ? 'opacity-50 cursor-not-allowed' : 'opacity-100 cursor-pointer',
    ].filter(Boolean).join(' ');
  }, [isSaving, isSaveDisabled]);

  return (
    <>
      <ToolButton
        icon={<Save size={20} className={isSaving ? 'animate-pulse' : ''} />}
        label={saveLabel}
        onClick={onSave}
        disabled={isSaveDisabled}
        title={saveTitle}
        className={saveClassName}
      />
      <ToolButton
        icon={<Upload size={20} />}
        label="Importar"
        onClick={onImport}
        title="Importar GLB"
      />
    </>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.isSaving === nextProps.isSaving &&
    prevProps.isReadOnly === nextProps.isReadOnly &&
    prevProps.hasUser === nextProps.hasUser &&
    prevProps.onSave === nextProps.onSave &&
    prevProps.onImport === nextProps.onImport
  );
});

ProjectActions.displayName = 'ProjectActions';

const Helpers: React.FC<{
  showViews: boolean;
  envPanelVisible: boolean;
  mode: string;
  safetyZonesVisible: boolean;
  onToggleViews: () => void;
  onToggleEnv: () => void;
  onToggleMeasure: () => void;
  onToggleSafety: () => void;
}> = React.memo(({
  showViews,
  envPanelVisible,
  mode,
  safetyZonesVisible,
  onToggleViews,
  onToggleEnv,
  onToggleMeasure,
  onToggleSafety,
}) => {
  const isMeasuring = mode === 'measuring';
  const safetyClassName = safetyZonesVisible ? 'text-red-400' : '';

  return (
    <>
      <ToolButton
        icon={<Eye size={20} />}
        label="Vistas"
        onClick={onToggleViews}
        isActive={showViews}
      />
      <ToolButton
        icon={<Sun size={20} />}
        label="Entorno"
        onClick={onToggleEnv}
        isActive={envPanelVisible}
      />
      <ToolButton
        icon={<Ruler size={20} />}
        label="Medir"
        onClick={onToggleMeasure}
        isActive={isMeasuring}
      />
      <ToolButton
        icon={<ShieldAlert size={20} />}
        label="Zonas"
        onClick={onToggleSafety}
        isActive={safetyZonesVisible}
        className={safetyClassName}
      />
    </>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.showViews === nextProps.showViews &&
    prevProps.envPanelVisible === nextProps.envPanelVisible &&
    prevProps.mode === nextProps.mode &&
    prevProps.safetyZonesVisible === nextProps.safetyZonesVisible &&
    prevProps.onToggleViews === nextProps.onToggleViews &&
    prevProps.onToggleEnv === nextProps.onToggleEnv &&
    prevProps.onToggleMeasure === nextProps.onToggleMeasure &&
    prevProps.onToggleSafety === nextProps.onToggleSafety
  );
});

Helpers.displayName = 'Helpers';

const MediaTools: React.FC<{
  hasUser: boolean;
  onTakePhoto: () => void;
  onStart360: () => void;
  onExportGLB: () => void;
  onExportDXF: () => void;
  onGeneratePDF: () => void;
}> = React.memo(({ hasUser, onTakePhoto, onStart360, onExportGLB, onExportDXF, onGeneratePDF }) => (
  <>
    <ToolButton
      icon={<Camera size={20} />}
      label="Foto"
      onClick={onTakePhoto}
    />
    <ToolButton
      icon={<Film size={20} />}
      label="360º"
      onClick={onStart360}
    />
    {hasUser && (
      <>
        <ToolButton
          icon={<Download size={20} />}
          label="3D"
          onClick={onExportGLB}
        />
        <ToolButton
          icon={<FileText size={20} />}
          label="CAD"
          onClick={onExportDXF}
        />
      </>
    )}
    <ToolButton
      icon={<FileDown size={20} />}
      label="PDF"
      onClick={onGeneratePDF}
    />
  </>
), (prevProps, nextProps) => {
  return (
    prevProps.hasUser === nextProps.hasUser &&
    prevProps.onTakePhoto === nextProps.onTakePhoto &&
    prevProps.onStart360 === nextProps.onStart360 &&
    prevProps.onExportGLB === nextProps.onExportGLB &&
    prevProps.onExportDXF === nextProps.onExportDXF &&
    prevProps.onGeneratePDF === nextProps.onGeneratePDF
  );
});

MediaTools.displayName = 'MediaTools';

const WalkAndRecord: React.FC<{
  isRecording: boolean;
  onActivateWalk: () => void;
  onToggleRecording: () => void;
}> = React.memo(({ isRecording, onActivateWalk, onToggleRecording }) => {
  const recordLabel = isRecording ? "Stop" : "Rec";
  const recordClassName = isRecording ? 'text-red-500 hover:text-red-400' : '';

  return (
    <>
      <ToolButton
        icon={<Footprints size={20} />}
        label="Paseo"
        onClick={onActivateWalk}
      />
      <ToolButton
        icon={<Video size={20} />}
        label={recordLabel}
        onClick={onToggleRecording}
        className={recordClassName}
      />
    </>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.isRecording === nextProps.isRecording &&
    prevProps.onActivateWalk === nextProps.onActivateWalk &&
    prevProps.onToggleRecording === nextProps.onToggleRecording
  );
});

WalkAndRecord.displayName = 'WalkAndRecord';

const UndoRedo: React.FC<{
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}> = React.memo(({ canUndo, canRedo, onUndo, onRedo }) => (
  <>
    <ToolButton
      icon={<Undo2 size={20} />}
      label="Undo"
      onClick={onUndo}
      disabled={!canUndo}
      className={canUndo ? 'opacity-100' : 'opacity-30'}
    />
    <ToolButton
      icon={<Redo2 size={20} />}
      label="Redo"
      onClick={onRedo}
      disabled={!canRedo}
      className={canRedo ? 'opacity-100' : 'opacity-30'}
    />
  </>
), (prevProps, nextProps) => {
  return (
    prevProps.canUndo === nextProps.canUndo &&
    prevProps.canRedo === nextProps.canRedo &&
    prevProps.onUndo === nextProps.onUndo &&
    prevProps.onRedo === nextProps.onRedo
  );
});

UndoRedo.displayName = 'UndoRedo';

// 🎨 Main Component
export const Toolbar: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showViews, setShowViews] = useState<boolean>(false);

  // Hooks - Logic
  const { isRecording, takePhoto, start360Video, toggleRecording, exportGLB, exportDXF, generatePDF } = useEditorMedia();
  const { activateWalkMode } = useSceneTools();
  const { saveProject, importGLB, isSaving } = useProjectActions();

  // Hooks - Stores
  const {
    mode, setMode, gridVisible, toggleGrid,
    cameraType, setCameraType, triggerView,
    envPanelVisible, toggleEnvPanel,
    setMeasurementResult,
    safetyZonesVisible, toggleSafetyZones,
  } = useEditorStore();

  const { undo, redo, past, future } = useSceneStore();
  const { user, isReadOnlyMode } = useProjectStore();

  // Computed values
  const canUndo = useMemo(() => past.length > 0, [past.length]);
  const canRedo = useMemo(() => future.length > 0, [future.length]);
  const isAdmin = useMemo(() => 
    user?.email?.includes('admin') || user?.email?.includes('levipark'),
    [user?.email]
  );
  const portalRoute = useMemo(() => 
    isAdmin ? '/admin/crm' : '/portal?tab=projects',
    [isAdmin]
  );

  // Handlers
  const handleModeChange = useCallback((newMode: string): void => {
    setMode(newMode as EditorMode);
    setShowViews(false);
  }, [setMode]);

  const handleToggleMeasure = useCallback((): void => {
    if (mode === 'measuring') {
      setMode('idle');
      setMeasurementResult(null);
    } else {
      setMode('measuring');
      setShowViews(false);
    }
  }, [mode, setMode, setMeasurementResult]);

  const handleToggleViews = useCallback((): void => {
    setShowViews((prev) => !prev);
  }, []);

  const handleImportClick = useCallback((): void => {
    fileInputRef.current?.click();
  }, []);

  const handleNavigateToPortal = useCallback((): void => {
    navigate(portalRoute);
  }, [navigate, portalRoute]);

  return (
    <div className={CLASSES.container}>
      {/* Floating Views Panel */}
      {showViews && (
        <ViewsPanel
          cameraType={cameraType}
          onCameraChange={setCameraType}
          onViewTrigger={triggerView}
        />
      )}

      {/* Main Toolbar */}
      <div className={CLASSES.panel}>
        {/* Portal Link (Logged users only) */}
        {user && (
          <>
            <ToolButton
              icon={<LayoutDashboard size={20} />}
              label="Portal"
              onClick={handleNavigateToPortal}
              className={CLASSES.portalBtn}
              title="Ir a Mis Proyectos"
            />
            <Divider />
          </>
        )}

        {/* Main Tools */}
        <MainTools
          tools={TOOLS}
          currentMode={mode}
          onModeChange={handleModeChange}
        />
        <Divider />

        {/* Project Actions */}
        <ProjectActions
          isSaving={isSaving}
          isReadOnly={isReadOnlyMode}
          hasUser={!!user}
          onSave={saveProject}
          onImport={handleImportClick}
        />
        <Divider />

        {/* Helper Tools */}
        <Helpers
          showViews={showViews}
          envPanelVisible={envPanelVisible}
          mode={mode}
          safetyZonesVisible={safetyZonesVisible}
          onToggleViews={handleToggleViews}
          onToggleEnv={toggleEnvPanel}
          onToggleMeasure={handleToggleMeasure}
          onToggleSafety={toggleSafetyZones}
        />
        <Divider />

        {/* Media Tools */}
        <MediaTools
          hasUser={!!user}
          onTakePhoto={takePhoto}
          onStart360={start360Video}
          onExportGLB={exportGLB}
          onExportDXF={exportDXF}
          onGeneratePDF={generatePDF}
        />
        <Divider />

        {/* Walk & Record */}
        <WalkAndRecord
          isRecording={isRecording}
          onActivateWalk={activateWalkMode}
          onToggleRecording={toggleRecording}
        />
        <Divider />

        {/* Grid Toggle */}
        <ToolButton
          icon={<Grid size={20} />}
          label="Grid"
          onClick={toggleGrid}
          isActive={gridVisible}
        />
        <Divider />

        {/* Undo/Redo */}
        <UndoRedo
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={undo}
          onRedo={redo}
        />

        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={importGLB}
          accept=".glb,.gltf"
          className="hidden"
        />
      </div>
    </div>
  );
};