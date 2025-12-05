import React, { useEffect, useRef } from "react";
import { A42Engine } from "./engine/A42Engine";

import { Toolbar } from "./ui/Toolbar";
import { BudgetPanel } from "./ui/BudgetPanel";
import { EnvironmentPanel } from "./ui/EnvironmentPanel";
import { FloorProperties } from "./ui/FloorProperties";
import { FenceProperties } from "./ui/FenceProperties";
import { InputModal } from "./ui/InputModal";
import { QRModal } from "./ui/QRModal";
import { Catalog } from "./ui/Catalog";

import { useEditorStore } from "@/stores/editor/useEditorStore";
import { useSceneStore } from "@/stores/scene/useSceneStore"; // 🔥
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
  const engineRef = useRef<A42Engine | null>(null);

  // --- STORES ---
  
  // UI State
  const {
    mode,
    gridVisible,
    cameraType,
    pendingView,
    clearPendingView,
    sunPosition,
    backgroundColor,
    safetyZonesVisible,
  } = useEditorStore();

  // Data State
  const { items, totalPrice } = useSceneStore(); // 🔥

  const {
    selectedItemId,
    duplicateSelection,
    removeSelection,
    measuredDistance,
  } = useSelectionStore();

  const { isReadOnlyMode } = useProjectStore();

  const [qrVisible, setQRVisible] = React.useState(false);

  // --------------------------
  // INIT ENGINE
  // --------------------------
  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new A42Engine(containerRef.current);
    engine.init();

    const canvas = engine.renderer.domElement as HTMLCanvasElement;
    if (canvas) {
      canvas.style.pointerEvents = "auto";
      canvas.style.touchAction = "none";
    }

    engineRef.current = engine;
    // @ts-ignore
    window.editorEngine = engine;

    engine.setGridVisible(gridVisible);
    engine.updateSunPosition(sunPosition.azimuth, sunPosition.elevation);

    if (backgroundColor === "#111111") engine.setSkyVisible(true);
    else engine.setBackgroundColor(backgroundColor);

    return () => engine.dispose();
  }, []);

  // --------------------------
  // 🔥 SYNC SELECTION (REACT -> ENGINE)
  // --------------------------
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.interactionManager.selectItemByUUID(selectedItemId);
    }
  }, [selectedItemId]);

  // --------------------------
  // REACTIONS
  // --------------------------
  useEffect(() => {
    engineRef.current?.syncSceneFromStore(items);
  }, [items]);

  useEffect(() => {
    engineRef.current?.setGridVisible(gridVisible);
  }, [gridVisible]);

  useEffect(() => {
    const eng = engineRef.current;
    if (!eng) return;

    eng.switchCamera(cameraType);
    eng.interactionManager.updateCamera(eng.activeCamera);
  }, [cameraType]);

  useEffect(() => {
    engineRef.current?.updateSafetyZones(safetyZonesVisible);
  }, [safetyZonesVisible]);

  useEffect(() => {
    engineRef.current?.updateSunPosition(
      sunPosition.azimuth,
      sunPosition.elevation
    );
  }, [sunPosition]);

  useEffect(() => {
    if (!pendingView) return;
    engineRef.current?.setView(pendingView);
    clearPendingView();
  }, [pendingView, clearPendingView]);

  useEffect(() => {
    if (backgroundColor === "#111111") engineRef.current?.setSkyVisible(true);
    else engineRef.current?.setBackgroundColor(backgroundColor);
  }, [backgroundColor]);

  return (
    <div className="w-screen h-screen relative bg-neutral-900 overflow-hidden">
      <div
        ref={containerRef}
        className="absolute inset-0 z-0"

        onPointerDown={(e) =>
          engineRef.current?.interactionManager.onPointerDown(e.nativeEvent)
        }
        onContextMenu={(e) => e.preventDefault()}
      />

      <BudgetPanel />
      <EnvironmentPanel />
      <FloorProperties />
      <FenceProperties />

      {mode === 'catalog' && <Catalog />}

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
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-2 glass-panel p-2 rounded-xl">
          <button onClick={() => engineRef.current?.setGizmoMode("translate")}>
            <Move size={16} />
          </button>
          <button onClick={() => engineRef.current?.setGizmoMode("rotate")}>
            <RotateCw size={16} />
          </button>
          <button onClick={() => engineRef.current?.setGizmoMode("scale")}>
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
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-black/80 px-6 py-3 text-white rounded-full border border-white/20 backdrop-blur-md font-mono">
          {measuredDistance !== null
            ? `Distancia: ${measuredDistance.toFixed(2)} m`
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
  );
};