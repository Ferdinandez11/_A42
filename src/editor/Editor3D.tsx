import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { A42Engine } from "./engine/A42Engine";
import { EngineContext } from "./context/EngineContext";

import { Toolbar } from "./ui/Toolbar";
import { BudgetPanel } from "./ui/BudgetPanel";
import { EnvironmentPanel } from "./ui/EnvironmentPanel";
import { FloorProperties } from "./ui/FloorProperties";
import { FenceProperties } from "./ui/FenceProperties";
import { InputModal } from "./ui/InputModal";
import { QRModal } from "./ui/QRModal";
import { Catalog } from "./ui/Catalog";

import { useEditorStore } from "@/editor/stores/editor/useEditorStore";
import { useSceneStore } from "@/editor/stores/scene/useSceneStore";
import { useSelectionStore } from "@/editor/stores/selection/useSelectionStore";
import { useProjectStore } from "@/editor/stores/project/useProjectStore";

import {
  Euro,
  Move,
  RotateCw,
  Scaling,
  Trash2,
  Copy,
  QrCode,
} from "lucide-react";


// 🎨 Types
type GizmoMode = 'translate' | 'rotate' | 'scale';
type CameraType = 'perspective' | 'orthographic';
type CameraView = 'top' | 'front' | 'side' | 'iso';

interface GizmoButtonConfig {
  mode: GizmoMode;
  icon: React.ReactNode;
  label: string;
}

interface ActionButtonConfig {
  action: () => void;
  icon: React.ReactNode;
  label: string;
}

// 🎨 Constants
const GIZMO_BUTTONS: GizmoButtonConfig[] = [
  { mode: 'translate', icon: <Move size={16} />, label: 'Mover' },
  { mode: 'rotate', icon: <RotateCw size={16} />, label: 'Rotar' },
  { mode: 'scale', icon: <Scaling size={16} />, label: 'Escalar' },
];

const SKY_BACKGROUND_COLOR = "#111111";

const CLASSES = {
  container: "w-screen h-screen relative bg-neutral-900 overflow-hidden",
  canvas: "absolute inset-0 z-0",
  catalogOverlay: "absolute inset-0 z-40",
  qrButton: "absolute top-6 right-6 z-20 bg-neutral-800/90 hover:bg-neutral-700 text-white p-3 rounded-full border border-neutral-600 shadow-lg",
  priceButton: "absolute bottom-6 left-6 z-20",
  priceContent: "bg-neutral-800/90 px-4 py-3 rounded-full border border-neutral-600 text-white flex gap-3 items-center",
  gizmoPanel: "absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-2 glass-panel p-2 rounded-xl z-30",
  measurementDisplay: "fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-black/80 px-6 py-3 text-white rounded-full border border-white/20 backdrop-blur-md font-mono pointer-events-none",
  watermark: "absolute bottom-6 right-6 text-white/5 font-black text-4xl pointer-events-none select-none",
} as const;

// 🎨 Custom Hooks
const useEngineInitialization = (
  containerRef: React.RefObject<HTMLDivElement | null>,
  gridVisible: boolean,
  sunPosition: { azimuth: number; elevation: number },
  backgroundColor: string
) => {
  const [engine, setEngine] = useState<A42Engine | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize engine
    const engineInstance = new A42Engine(containerRef.current);
    engineInstance.init();
    setEngine(engineInstance);

    // Setup pointer event handler
    const handlePointerDown = (e: PointerEvent): void => {
      if ((e.target as HTMLElement).tagName === "CANVAS") {
        engineInstance.interactionManager.onPointerDown(e);
      }
    };

    const container = containerRef.current;
    container.addEventListener("pointerdown", handlePointerDown);

    // Initial configuration
    engineInstance.setGridVisible(gridVisible);
    engineInstance.updateSunPosition(sunPosition.azimuth, sunPosition.elevation);
    
    if (backgroundColor === SKY_BACKGROUND_COLOR) {
      engineInstance.setSkyVisible(true);
    } else {
      engineInstance.setBackgroundColor(backgroundColor);
    }

    return () => {
      container.removeEventListener("pointerdown", handlePointerDown);
      engineInstance.dispose();
      setEngine(null);
    };
  }, []); // Empty deps - only run on mount/unmount

  return engine;
};

// ✅ OPTIMIZADO - Bug #2 Fix
const useEngineSync = (
  engine: A42Engine | null,
  mode: string,
  selectedItemId: string | null,
  items: any[],
  gridVisible: boolean,
  cameraType: CameraType,
  safetyZonesVisible: boolean,
  sunPosition: { azimuth: number; elevation: number },
  backgroundColor: string,
  pendingView: CameraView | null,
  clearPendingView: () => void
) => {
  // ✅ MEJORA 1: Memoizar hash de items para evitar re-renders innecesarios
  const itemsHash = useMemo(() => JSON.stringify(items), [items]);

  // ✅ MEJORA 2: Memoizar hash de sunPosition
  const sunHash = useMemo(
    () => `${sunPosition.azimuth}-${sunPosition.elevation}`,
    [sunPosition]
  );

  // ✅ MEJORA 3: Estabilizar función de sincronización de items
  const syncItems = useCallback(() => {
    if (!engine) return;
    engine.syncSceneFromStore(items);
  }, [engine, items]);

  // Clear tools on mode change
  useEffect(() => {
    if (!engine) return;
    engine.clearTools();
  }, [mode, engine]);

  // Sync selection
  useEffect(() => {
    if (!engine) return;
    engine.interactionManager.selectItemByUUID(selectedItemId);
  }, [selectedItemId, engine]);

  // ✅ OPTIMIZADO: Sync scene items usando hash
  useEffect(() => {
    syncItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsHash, engine]); // Usa hash en vez de syncItems para evitar loops

  // Sync grid visibility
  useEffect(() => {
    if (!engine) return;
    engine.setGridVisible(gridVisible);
  }, [gridVisible, engine]);

  // Sync camera
  useEffect(() => {
    if (!engine) return;
    engine.switchCamera(cameraType);
    engine.interactionManager.updateCamera(engine.activeCamera);
  }, [cameraType, engine]);

  // Sync safety zones
  useEffect(() => {
    if (!engine) return;
    engine.updateSafetyZones(safetyZonesVisible);
  }, [safetyZonesVisible, engine]);

  // ✅ OPTIMIZADO: Sync sun position usando hash
  useEffect(() => {
    if (!engine) return;
    engine.updateSunPosition(sunPosition.azimuth, sunPosition.elevation);
  }, [sunHash, engine, sunPosition]); // Usa hash pero mantiene sunPosition para acceder a valores

  // Handle pending view
  useEffect(() => {
    if (!pendingView || !engine) return;
    engine.setView(pendingView);
    clearPendingView();
  }, [pendingView, clearPendingView, engine]);

  // Sync background
  useEffect(() => {
    if (!engine) return;
    
    if (backgroundColor === SKY_BACKGROUND_COLOR) {
      engine.setSkyVisible(true);
    } else {
      engine.setBackgroundColor(backgroundColor);
    }
  }, [backgroundColor, engine]);
};

// 🎨 Sub-Components
const QRButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    onClick={onClick}
    className={CLASSES.qrButton}
    aria-label="Mostrar código QR"
  >
    <QrCode size={20} />
  </button>
);

const PriceDisplay: React.FC<{ price: number }> = ({ price }) => (
  <div className={CLASSES.priceButton}>
    <button className={CLASSES.priceContent}>
      <Euro size={18} />
      <span className="text-lg">{price.toLocaleString()} €</span>
    </button>
  </div>
);

const GizmoButton: React.FC<{
  mode: GizmoMode;
  icon: React.ReactNode;
  onClick: () => void;
}> = ({ icon, onClick }) => (
  <button onClick={onClick}>
    {icon}
  </button>
);

const GizmoPanel: React.FC<{
  engine: A42Engine | null;
  onDuplicate: () => void;
  onRemove: () => void;
}> = ({ engine, onDuplicate, onRemove }) => {
  const handleGizmoMode = (mode: GizmoMode): void => {
    engine?.setGizmoMode(mode);
  };

  const actionButtons: ActionButtonConfig[] = [
    { action: onDuplicate, icon: <Copy size={16} />, label: 'Duplicar' },
    { action: onRemove, icon: <Trash2 size={16} />, label: 'Eliminar' },
  ];

  return (
    <div className={CLASSES.gizmoPanel}>
      {GIZMO_BUTTONS.map((button) => (
        <GizmoButton
          key={button.mode}
          mode={button.mode}
          icon={button.icon}
          onClick={() => handleGizmoMode(button.mode)}
        />
      ))}
      {actionButtons.map((button, index) => (
        <button key={index} onClick={button.action}>
          {button.icon}
        </button>
      ))}
    </div>
  );
};

const MeasurementDisplay: React.FC<{ result: number | null }> = ({ result }) => (
  <div className={CLASSES.measurementDisplay}>
    {result !== null
      ? `Distancia: ${result.toFixed(2)} m`
      : "Selecciona punto A y B"}
  </div>
);

const Watermark: React.FC = () => (
  <div className={CLASSES.watermark}>A42</div>
);

// 🎨 Main Component
export const Editor3D: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [qrVisible, setQRVisible] = useState<boolean>(false);

  // Store hooks
  const {
    mode,
    gridVisible,
    cameraType,
    pendingView,
    clearPendingView,
    sunPosition,
    backgroundColor,
    safetyZonesVisible,
    measurementResult,
  } = useEditorStore();

  const { items, totalPrice } = useSceneStore();
  const { selectedItemId, duplicateSelection, removeSelection } = useSelectionStore();
  const { isReadOnlyMode } = useProjectStore();

  // Initialize engine
  const engine = useEngineInitialization(
    containerRef,
    gridVisible,
    sunPosition,
    backgroundColor
  );

  // Sync engine state
  useEngineSync(
    engine,
    mode,
    selectedItemId,
    items,
    gridVisible,
    cameraType,
    safetyZonesVisible,
    sunPosition,
    backgroundColor,
    pendingView,
    clearPendingView
  );

  // Computed values
  const showGizmoPanel = selectedItemId && mode === "editing";
  const showMeasurement = mode === "measuring";
  const showCatalog = mode === "catalog";

  // Handlers
  const handleQROpen = (): void => setQRVisible(true);
  const handleQRClose = (): void => setQRVisible(false);
  const handleContextMenu = (e: React.MouseEvent): void => e.preventDefault();

  return (
    <EngineContext.Provider value={{ engine }}>
      <div className={CLASSES.container}>
        {/* 3D Engine Container */}
        <div
          ref={containerRef}
          className={CLASSES.canvas}
          onContextMenu={handleContextMenu}
        />

        {/* UI Panels */}
        <BudgetPanel />
        <EnvironmentPanel />
        <FloorProperties />
        <FenceProperties />

        {/* Catalog Overlay */}
        {showCatalog && (
          <div className={CLASSES.catalogOverlay}>
            <Catalog />
          </div>
        )}

        {/* QR Button */}
        <QRButton onClick={handleQROpen} />

        {/* Price Display */}
        {!isReadOnlyMode && <PriceDisplay price={totalPrice} />}

        {/* Gizmo Panel */}
        {showGizmoPanel && (
          <GizmoPanel
            engine={engine}
            onDuplicate={duplicateSelection}
            onRemove={removeSelection}
          />
        )}

        {/* Measurement Display */}
        {showMeasurement && <MeasurementDisplay result={measurementResult} />}

        {/* Toolbar */}
        <Toolbar />

        {/* Modals */}
        <QRModal isOpen={qrVisible} onClose={handleQRClose} />
        <InputModal />

        {/* Watermark */}
        <Watermark />
      </div>
    </EngineContext.Provider>
  );
};