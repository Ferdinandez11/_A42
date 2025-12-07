import { useRef, useState } from 'react';
import { 
  MousePointer2, Grid3X3, Component, Trees, Grid, Undo2, Redo2, Eye, Box, ArrowUp, 
  ArrowRight, GalleryVerticalEnd, Square, Sun, Upload, Ruler, Footprints, Video, 
  Camera, Film, Download, FileText, ShieldAlert, FileDown, Save, LayoutDashboard
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// STORES
import { useEditorStore } from "@/stores/editor/useEditorStore";
import { useSceneStore } from "@/stores/scene/useSceneStore";
import { useProjectStore } from "@/stores/project/useProjectStore";

// HOOKS
import { useEditorMedia } from '../hooks/useEditorMedia';
import { useSceneTools } from '../hooks/useSceneTools';
import { useProjectActions } from '../hooks/useProjectActions';

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
const Divider: React.FC<DividerProps> = ({ className = CLASSES.divider }) => (
  <div className={className} />
);

const ToolButton: React.FC<ToolButtonProps> = ({
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
);

const ViewButton: React.FC<ViewButtonConfig> = ({
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
);

const ViewsPanel: React.FC<{
  cameraType: string;
  onCameraChange: (type: 'perspective' | 'orthographic') => void;
  onViewTrigger: (view: 'top' | 'front' | 'side' | 'iso') => void;
}> = ({ cameraType, onCameraChange, onViewTrigger }) => (
  <div className={CLASSES.floatingPanel}>
    <ViewButton
      icon={<Eye size={18} />}
      label="3D"
      onClick={() => onCameraChange('perspective')}
      isActive={cameraType === 'perspective'}
    />
    <ViewButton
      icon={<Square size={18} />}
      label="2D"
      onClick={() => onCameraChange('orthographic')}
      isActive={cameraType === 'orthographic'}
    />
    <Divider />
    <ViewButton
      icon={<ArrowUp size={18} />}
      label="Planta"
      onClick={() => onViewTrigger('top')}
    />
    <ViewButton
      icon={<GalleryVerticalEnd size={18} />}
      label="Alzado"
      onClick={() => onViewTrigger('front')}
    />
    <ViewButton
      icon={<ArrowRight size={18} />}
      label="Perfil"
      onClick={() => onViewTrigger('side')}
    />
    <ViewButton
      icon={<Box size={18} />}
      label="Iso"
      onClick={() => onViewTrigger('iso')}
    />
  </div>
);

const MainTools: React.FC<{
  tools: ToolConfig[];
  currentMode: string;
  onModeChange: (mode: string) => void;
}> = ({ tools, currentMode, onModeChange }) => (
  <>
    {tools.map((tool) => (
      <ToolButton
        key={tool.id}
        icon={tool.icon}
        label={tool.label}
        onClick={() => onModeChange(tool.id)}
        isActive={currentMode === tool.id}
      />
    ))}
  </>
);

const ProjectActions: React.FC<{
  isSaving: boolean;
  isReadOnly: boolean;
  hasUser: boolean;
  onSave: () => void;
  onImport: () => void;
}> = ({ isSaving, isReadOnly, hasUser, onSave, onImport }) => {
  const getSaveTitle = (): string => {
    if (!hasUser) return "Login Requerido";
    if (isReadOnly) return "Solo Lectura";
    return "Guardar";
  };

  const getSaveLabel = (): string => {
    if (!hasUser) return 'Login';
    if (isSaving) return '...';
    return 'Guardar';
  };

  const isSaveDisabled = isSaving || isReadOnly || !hasUser;

  return (
    <>
      <ToolButton
        icon={<Save size={20} className={isSaving ? 'animate-pulse' : ''} />}
        label={getSaveLabel()}
        onClick={onSave}
        disabled={isSaveDisabled}
        className={isSaving ? 'text-yellow-400' : ''}
        title={getSaveTitle()}
        style={{
          opacity: isSaveDisabled ? 0.5 : 1,
          cursor: isSaveDisabled ? 'not-allowed' : 'pointer',
        }}
      />
      <ToolButton
        icon={<Upload size={20} />}
        label="Importar"
        onClick={onImport}
        title="Importar GLB"
      />
    </>
  );
};

const Helpers: React.FC<{
  showViews: boolean;
  envPanelVisible: boolean;
  mode: string;
  safetyZonesVisible: boolean;
  onToggleViews: () => void;
  onToggleEnv: () => void;
  onToggleMeasure: () => void;
  onToggleSafety: () => void;
}> = ({
  showViews,
  envPanelVisible,
  mode,
  safetyZonesVisible,
  onToggleViews,
  onToggleEnv,
  onToggleMeasure,
  onToggleSafety,
}) => (
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
      isActive={mode === 'measuring'}
    />
    <ToolButton
      icon={<ShieldAlert size={20} />}
      label="Zonas"
      onClick={onToggleSafety}
      isActive={safetyZonesVisible}
      className={safetyZonesVisible ? 'text-red-400' : ''}
    />
  </>
);

const MediaTools: React.FC<{
  hasUser: boolean;
  onTakePhoto: () => void;
  onStart360: () => void;
  onExportGLB: () => void;
  onExportDXF: () => void;
  onGeneratePDF: () => void;
}> = ({ hasUser, onTakePhoto, onStart360, onExportGLB, onExportDXF, onGeneratePDF }) => (
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
);

const WalkAndRecord: React.FC<{
  isRecording: boolean;
  onActivateWalk: () => void;
  onToggleRecording: () => void;
}> = ({ isRecording, onActivateWalk, onToggleRecording }) => (
  <>
    <ToolButton
      icon={<Footprints size={20} />}
      label="Paseo"
      onClick={onActivateWalk}
    />
    <ToolButton
      icon={<Video size={20} />}
      label={isRecording ? "Stop" : "Rec"}
      onClick={onToggleRecording}
      className={isRecording ? 'text-red-500 hover:text-red-400' : ''}
    />
  </>
);

const UndoRedo: React.FC<{
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}> = ({ canUndo, canRedo, onUndo, onRedo }) => (
  <>
    <ToolButton
      icon={<Undo2 size={20} />}
      label="Undo"
      onClick={onUndo}
      disabled={!canUndo}
      style={{ opacity: canUndo ? 1 : 0.3 }}
    />
    <ToolButton
      icon={<Redo2 size={20} />}
      label="Redo"
      onClick={onRedo}
      disabled={!canRedo}
      style={{ opacity: canRedo ? 1 : 0.3 }}
    />
  </>
);

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
  const canUndo = past.length > 0;
  const canRedo = future.length > 0;
  const isAdmin = user?.email?.includes('admin') || user?.email?.includes('levipark');
  const portalRoute = isAdmin ? '/admin/crm' : '/portal?tab=projects';

  // Handlers
  const handleModeChange = (newMode: string): void => {
    setMode(newMode as any);
    setShowViews(false);
  };

  const handleToggleMeasure = (): void => {
    if (mode === 'measuring') {
      setMode('idle');
      setMeasurementResult(null);
    } else {
      setMode('measuring');
      setShowViews(false);
    }
  };

  const handleToggleViews = (): void => {
    setShowViews((prev) => !prev);
  };

  const handleImportClick = (): void => {
    fileInputRef.current?.click();
  };

  const handleNavigateToPortal = (): void => {
    navigate(portalRoute);
  };

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