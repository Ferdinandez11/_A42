import { useRef, useState } from "react";
import {
  MousePointer2,
  Grid3X3,
  Component,
  Trees,
  Grid,
  Undo2,
  Redo2,
  Eye,
  Box,
  ArrowUp,
  ArrowRight,
  GalleryVerticalEnd,
  Square,
  Sun,
  Upload,
  Ruler,
  Footprints,
  Video,
  Camera,
  Film,
  Download,
  FileText,
  ShieldAlert,
  FileDown,
  Save,
  LayoutDashboard,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

// STORES
import { useEditorStore } from "@/stores/editor/useEditorStore";
import { useSceneStore } from "@/stores/scene/useSceneStore";
import { useProjectStore } from "@/stores/project/useProjectStore";
import { useUserStore } from "@/stores/user/useUserStore";

// HOOKS
import { useEditorMedia } from "../hooks/useEditorMedia";
import { useSceneTools } from "../hooks/useSceneTools";
import { useProjectActions } from "../hooks/useProjectActions";

import "./Editor.css";

export const Toolbar = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. HOOKS DE LÓGICA
  const {
    isRecording,
    takePhoto,
    start360Video,
    toggleRecording,
    exportGLB,
    exportDXF,
    generatePDF,
  } = useEditorMedia();
  const { activateWalkMode } = useSceneTools();
  const { saveProject, importGLB, isSaving } = useProjectActions();

  // 2. STORES UI
  const {
    mode,
    setMode,
    gridVisible,
    toggleGrid,
    cameraType,
    setCameraType,
    triggerView,
    envPanelVisible,
    toggleEnvPanel,
    setMeasurementResult,
    safetyZonesVisible,
    toggleSafetyZones,
  } = useEditorStore();

  const { undo, redo, past, future } = useSceneStore();
  const { isReadOnlyMode } = useProjectStore();
  const user = useUserStore((s) => s.user);

  const [showViews, setShowViews] = useState(false);

  const tools = [
    { id: "idle", icon: <MousePointer2 size={20} />, label: "Seleccionar" },
    { id: "drawing_floor", icon: <Grid3X3 size={20} />, label: "Suelo" },
    { id: "drawing_fence", icon: <Component size={20} />, label: "Valla" },
    { id: "catalog", icon: <Trees size={20} />, label: "Catálogo" },
  ] as const;

  const toggleMeasureMode = () => {
    if (mode === "measuring") {
      setMode("idle");
      setMeasurementResult(null);
    } else {
      setMode("measuring");
      setShowViews(false);
    }
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center">
      {/* PANEL FLOTANTE DE VISTAS */}
      {showViews && (
        <div className="absolute bottom-full mb-4 glass-panel flex-row animate-in slide-in-from-bottom-2 fade-in duration-200">
          <button
            className={`tool-btn ${
              cameraType === "perspective" ? "active" : ""
            }`}
            onClick={() => setCameraType("perspective")}
            title="3D"
          >
            <Eye size={18} />
          </button>
          <button
            className={`tool-btn ${
              cameraType === "orthographic" ? "active" : ""
            }`}
            onClick={() => setCameraType("orthographic")}
            title="2D"
          >
            <Square size={18} />
          </button>
          <div className="w-px bg-white/10 mx-1" />
          <button
            className="tool-btn"
            onClick={() => triggerView("top")}
            title="Planta"
          >
            <ArrowUp size={18} />
          </button>
          <button
            className="tool-btn"
            onClick={() => triggerView("front")}
            title="Alzado"
          >
            <GalleryVerticalEnd size={18} />
          </button>
          <button
            className="tool-btn"
            onClick={() => triggerView("side")}
            title="Perfil"
          >
            <ArrowRight size={18} />
          </button>
          <button
            className="tool-btn"
            onClick={() => triggerView("iso")}
            title="Iso"
          >
            <Box size={18} />
          </button>
        </div>
      )}

      {/* BARRA DE HERRAMIENTAS PRINCIPAL */}
      <div className="glass-panel">
        {/* ENLACE AL PORTAL (Solo usuarios logueados) */}
        {user && (
          <button
            className="tool-btn text-blue-400 hover:text-blue-300"
            onClick={() =>
              navigate(
                user.email?.includes("admin") ||
                  user.email?.includes("levipark")
                  ? "/admin/crm"
                  : "/portal?tab=projects"
              )
            }
            title="Ir a Mis Proyectos"
          >
            <LayoutDashboard size={20} />{" "}
            <span className="tool-label">Portal</span>
          </button>
        )}
        {user && <div className="w-px bg-white/10 mx-1" />}

        {/* HERRAMIENTAS PRINCIPALES */}
        {tools.map((tool) => (
          <button
            key={tool.id}
            className={`tool-btn ${mode === tool.id ? "active" : ""}`}
            onClick={() => {
              setMode(tool.id as any);
              setShowViews(false);
            }}
          >
            {tool.icon} <span className="tool-label">{tool.label}</span>
          </button>
        ))}

        <div className="w-px bg-white/10 mx-1" />

        {/* GUARDAR PROYECTO */}
        <button
          className={`tool-btn ${isSaving ? "text-yellow-400" : ""}`}
          onClick={saveProject}
          disabled={isSaving || isReadOnlyMode || !user}
          title={
            !user
              ? "Login Requerido"
              : isReadOnlyMode
              ? "Solo Lectura"
              : "Guardar"
          }
          style={{
            opacity: isReadOnlyMode || !user ? 0.5 : 1,
            cursor: isReadOnlyMode || !user ? "not-allowed" : "pointer",
          }}
        >
          <Save size={20} className={isSaving ? "animate-pulse" : ""} />
          <span className="tool-label">
            {!user ? "Login" : isSaving ? "..." : "Guardar"}
          </span>
        </button>

        {/* IMPORTAR */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={importGLB}
          accept=".glb,.gltf"
          className="hidden"
        />
        <button
          className="tool-btn"
          onClick={() => fileInputRef.current?.click()}
          title="Importar GLB"
        >
          <Upload size={20} /> <span className="tool-label">Importar</span>
        </button>

        <div className="w-px bg-white/10 mx-1" />

        {/* HELPERS */}
        <button
          className={`tool-btn ${showViews ? "active" : ""}`}
          onClick={() => setShowViews(!showViews)}
        >
          <Eye size={20} /> <span className="tool-label">Vistas</span>
        </button>
        <button
          className={`tool-btn ${envPanelVisible ? "active" : ""}`}
          onClick={toggleEnvPanel}
        >
          <Sun size={20} /> <span className="tool-label">Entorno</span>
        </button>
        <button
          className={`tool-btn ${mode === "measuring" ? "active" : ""}`}
          onClick={toggleMeasureMode}
        >
          <Ruler size={20} /> <span className="tool-label">Medir</span>
        </button>
        <button
          className={`tool-btn ${
            safetyZonesVisible ? "active text-red-400" : ""
          }`}
          onClick={toggleSafetyZones}
        >
          <ShieldAlert size={20} />{" "}
          <span className="tool-label">Zonas</span>
        </button>

        <div className="w-px bg-white/10 mx-1" />

        {/* MEDIA */}
        <button className="tool-btn" onClick={takePhoto}>
          <Camera size={20} /> <span className="tool-label">Foto</span>
        </button>
        <button className="tool-btn" onClick={start360Video}>
          <Film size={20} /> <span className="tool-label">360º</span>
        </button>

        {/* EXPORTS (Solo Logueados) */}
        {user && (
          <>
            <button className="tool-btn" onClick={exportGLB}>
              <Download size={20} /> <span className="tool-label">3D</span>
            </button>
            <button className="tool-btn" onClick={exportDXF}>
              <FileText size={20} /> <span className="tool-label">
                CAD
              </span>
            </button>
          </>
        )}

        <button className="tool-btn" onClick={generatePDF}>
          <FileDown size={20} /> <span className="tool-label">PDF</span>
        </button>

        <div className="w-px bg-white/10 mx-1" />

        {/* WALK & REC */}
        <button className="tool-btn" onClick={activateWalkMode}>
          <Footprints size={20} />{" "}
          <span className="tool-label">Paseo</span>
        </button>
        <button
          className={`tool-btn ${
            isRecording ? "text-red-500 hover:text-red-400" : ""
          }`}
          onClick={toggleRecording}
        >
          <Video size={20} />{" "}
          <span className="tool-label">
            {isRecording ? "Stop" : "Rec"}
          </span>
        </button>

        <div className="w-px bg-white/10 mx-1" />

        {/* UTILS */}
        <button
          className={`tool-btn ${gridVisible ? "active" : ""}`}
          onClick={toggleGrid}
        >
          <Grid size={20} /> <span className="tool-label">Grid</span>
        </button>

        <div className="w-px bg-white/10 mx-1" />

        {/* UNDO / REDO */}
        <button
          className="tool-btn"
          onClick={undo}
          disabled={past.length === 0}
          style={{ opacity: past.length === 0 ? 0.3 : 1 }}
        >
          <Undo2 size={20} /> <span className="tool-label">Undo</span>
        </button>
        <button
          className="tool-btn"
          onClick={redo}
          disabled={future.length === 0}
          style={{ opacity: future.length === 0 ? 0.3 : 1 }}
        >
          <Redo2 size={20} /> <span className="tool-label">Redo</span>
        </button>
      </div>
    </div>
  );
};
