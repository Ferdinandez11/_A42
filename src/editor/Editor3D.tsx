import React, { useEffect, useRef, useState } from "react";
import { A42Engine } from "./engine/A42Engine";
import { EngineContext } from "./context/EngineContext";

// Import modular engine sync hooks
import { useEngineModeSync } from "./hooks/useEngineModeSync";
import { useEngineSelectionSync } from "./hooks/useEngineSelectionSync";
import { useEngineSceneSync } from "./hooks/useEngineSceneSync";
import { useEngineEnvironmentSync } from "./hooks/useEngineEnvironmentSync";
import { useEngineCameraSync } from "./hooks/useEngineCameraSync";
import { useEngineSafetyZonesSync } from "./hooks/useEngineSafetyZonesSync";

import { Toolbar } from "./ui/Toolbar";
import { BudgetPanel } from "./ui/BudgetPanel";
import { EnvironmentPanel } from "./ui/EnvironmentPanel";
import { FloorProperties } from "./ui/FloorProperties";
import { FenceProperties } from "./ui/FenceProperties";
import { InputModal } from "./ui/InputModal";
import { QRModal } from "./ui/QRModal";
import { Catalog } from "./ui/Catalog";
import { ItemsModal } from "./ui/ItemsModal";

import { useEditorStore } from "@/editor/stores/editor/useEditorStore";
import { useSceneStore } from "@/editor/stores/scene/useSceneStore";
import { useSelectionStore } from "@/editor/stores/selection/useSelectionStore";
import { useProjectStore } from "@/editor/stores/project/useProjectStore";

import {
  List,
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

/**
 * Composed hook that syncs all engine state
 * Now uses smaller, focused hooks for better maintainability
 */
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
  // Use modular hooks for each concern
  useEngineModeSync(engine, mode);
  useEngineSelectionSync(engine, selectedItemId);
  useEngineSceneSync(engine, items);
  useEngineEnvironmentSync(engine, gridVisible, sunPosition, backgroundColor);
  useEngineCameraSync(engine, cameraType, pendingView, clearPendingView);
  useEngineSafetyZonesSync(engine, safetyZonesVisible);
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

const PriceDisplay: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <div className={CLASSES.priceButton}>
    <button 
      onClick={onClick}
      className={CLASSES.priceContent}
      title="Ver elementos del proyecto"
    >
      <List size={18} />
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
  const [itemsModalVisible, setItemsModalVisible] = useState<boolean>(false);

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

  const { items } = useSceneStore();
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
  const handleItemsModalOpen = (): void => setItemsModalVisible(true);
  const handleItemsModalClose = (): void => setItemsModalVisible(false);
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
        {!isReadOnlyMode && <PriceDisplay onClick={handleItemsModalOpen} />}

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
        <ItemsModal isOpen={itemsModalVisible} onClose={handleItemsModalClose} />

        {/* Watermark */}
        <Watermark />
      </div>
    </EngineContext.Provider>
  );
};