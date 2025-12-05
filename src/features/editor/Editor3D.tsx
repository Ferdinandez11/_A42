import React, { useEffect, useRef, useState } from "react";
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

import { useEditorStore } from "@/stores/editor/useEditorStore";
import { useSceneStore } from "@/stores/scene/useSceneStore";
import { useSelectionStore } from "@/stores/selection/useSelectionStore";
import { useProjectStore } from "@/stores/project/useProjectStore";

import {
  Euro,
  Move,
  RotateCw,
  Scaling,
  Trash2,
  Copy,
  QrCode,
} from "lucide-react";

export const Editor3D = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [engineInstance, setEngineInstance] = useState<A42Engine | null>(null);

  const {
    mode,
    gridVisible,
    cameraType,
    pendingView,
    clearPendingView,
    sunPosition,
    backgroundColor,
    safetyZonesVisible,
    measurementResult, // 👈 1. AÑADE ESTO AQUÍ
  } = useEditorStore();

  const { items, totalPrice } = useSceneStore();
  const { selectedItemId, duplicateSelection, removeSelection } = useSelectionStore();
  const { isReadOnlyMode } = useProjectStore();

  const [qrVisible, setQRVisible] = React.useState(false);

  // 1. INICIALIZACIÓN Y EVENTOS DOM
  useEffect(() => {
    if (!containerRef.current) return;

    // Instanciar motor
    const engine = new A42Engine(containerRef.current);
    engine.init();

    // Guardar en estado
    setEngineInstance(engine);

    // 🔥 FIX: Añadir listener directo al DOM para evitar problemas de bubbling en React
    const handlePointerDown = (e: PointerEvent) => {
      // Solo procesar si el click es en el canvas (evitar UI)
      if ((e.target as HTMLElement).tagName === "CANVAS") {
        engine.interactionManager.onPointerDown(e);
      }
    };

    const container = containerRef.current;
    container.addEventListener("pointerdown", handlePointerDown);

    // Configuración inicial
    engine.setGridVisible(gridVisible);
    engine.updateSunPosition(sunPosition.azimuth, sunPosition.elevation);
    if (backgroundColor === "#111111") engine.setSkyVisible(true);
    else engine.setBackgroundColor(backgroundColor);

    return () => {
      container.removeEventListener("pointerdown", handlePointerDown);
      engine.dispose();
      setEngineInstance(null);
    };
  }, []);

  // 2. LIMPIEZA DE HERRAMIENTAS AL CAMBIAR MODO
  useEffect(() => {
    if (engineInstance) {
      engineInstance.clearTools();
    }
  }, [mode, engineInstance]);

  // 3. SINCRONIZACIÓN DE ESTADO
  useEffect(() => {
    if (engineInstance) {
      engineInstance.interactionManager.selectItemByUUID(selectedItemId);
    }
  }, [selectedItemId, engineInstance]);

  useEffect(() => {
    engineInstance?.syncSceneFromStore(items);
  }, [items, engineInstance]);

  useEffect(() => {
    engineInstance?.setGridVisible(gridVisible);
  }, [gridVisible, engineInstance]);

  useEffect(() => {
    if (!engineInstance) return;
    engineInstance.switchCamera(cameraType);
    engineInstance.interactionManager.updateCamera(engineInstance.activeCamera);
  }, [cameraType, engineInstance]);

  useEffect(() => {
    engineInstance?.updateSafetyZones(safetyZonesVisible);
  }, [safetyZonesVisible, engineInstance]);

  useEffect(() => {
    engineInstance?.updateSunPosition(sunPosition.azimuth, sunPosition.elevation);
  }, [sunPosition, engineInstance]);

  useEffect(() => {
    if (!pendingView || !engineInstance) return;
    engineInstance.setView(pendingView);
    clearPendingView();
  }, [pendingView, clearPendingView, engineInstance]);

  useEffect(() => {
    if (!engineInstance) return;
    if (backgroundColor === "#111111") engineInstance.setSkyVisible(true);
    else engineInstance.setBackgroundColor(backgroundColor);
  }, [backgroundColor, engineInstance]);

  return (
    <EngineContext.Provider value={{ engine: engineInstance }}>
      <div className="w-screen h-screen relative bg-neutral-900 overflow-hidden">
        
        {/* Contenedor del Motor 3D */}
        <div
          ref={containerRef}
          className="absolute inset-0 z-0"
          onContextMenu={(e) => e.preventDefault()}
        />

        {/* UI LAYERS */}
        <BudgetPanel />
        <EnvironmentPanel />
        <FloorProperties />
        <FenceProperties />

        {/* 🔥 FIX: Asegurar que el Catálogo esté por encima de todo */}
        {mode === 'catalog' && (
          <div className="absolute inset-0 z-40">
            <Catalog />
          </div>
        )}

        <button
          onClick={() => setQRVisible(true)}
          className="absolute top-6 right-6 z-20 bg-neutral-800/90 hover:bg-neutral-700 text-white p-3 rounded-full border border-neutral-600 shadow-lg"
        >
          <QrCode size={20} />
        </button>

        {!isReadOnlyMode && (
          <div className="absolute bottom-6 left-6 z-20">
            <button className="bg-neutral-800/90 px-4 py-3 rounded-full border border-neutral-600 text-white flex gap-3 items-center">
              <Euro size={18} />
              <span className="text-lg">{totalPrice.toLocaleString()} €</span>
            </button>
          </div>
        )}

        {selectedItemId && mode === "editing" && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-2 glass-panel p-2 rounded-xl z-30">
            <button onClick={() => engineInstance?.setGizmoMode("translate")}>
              <Move size={16} />
            </button>
            <button onClick={() => engineInstance?.setGizmoMode("rotate")}>
              <RotateCw size={16} />
            </button>
            <button onClick={() => engineInstance?.setGizmoMode("scale")}>
              <Scaling size={16} />
            </button>
            <button onClick={duplicateSelection}>
              <Copy size={16} />
            </button>
            <button onClick={removeSelection}>
              <Trash2 size={16} />
            </button>
          </div>
        )}

        {mode === "measuring" && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-black/80 px-6 py-3 text-white rounded-full border border-white/20 backdrop-blur-md font-mono pointer-events-none">
            {measurementResult !== null
              ? `Distancia: ${measurementResult.toFixed(2)} m`
              : "Selecciona punto A y B"}
          </div>
        )}

        <Toolbar />
        <QRModal isOpen={qrVisible} onClose={() => setQRVisible(false)} />
        <InputModal />

        <div className="absolute bottom-6 right-6 text-white/5 font-black text-4xl pointer-events-none select-none">
          A42
        </div>
      </div>
    </EngineContext.Provider>
  );
};