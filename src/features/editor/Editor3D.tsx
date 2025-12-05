// --- START OF FILE src/features/editor/Editor3D.tsx ---
import React, { useEffect, useRef } from "react";
import { A42Engine } from "./engine/A42Engine";

import { Toolbar } from "./ui/Toolbar";
import { BudgetPanel } from "./ui/BudgetPanel";
import { EnvironmentPanel } from "./ui/EnvironmentPanel";
import { FloorProperties } from "./ui/FloorProperties";
import { FenceProperties } from "./ui/FenceProperties";
import { InputModal } from "./ui/InputModal";
import { QRModal } from "./ui/QRModal";
import { CatalogPanel } from "./ui/CatalogPanel";
import { useEditorStore } from "@/stores/editor/useEditorStore";
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
  const {
    mode,
    gridVisible,
    items,
    cameraType,
    pendingView,
    clearPendingView,
    sunPosition,
    backgroundColor,
    safetyZonesVisible,
    totalPrice,
  } = useEditorStore();

  const {
    selectedItemId,
    duplicateSelection,
    removeSelection,
    measuredDistance,
  } = useSelectionStore();

  const { isReadOnlyMode } = useProjectStore();

  const [qrVisible, setQRVisible] = React.useState(false);

  // ------------------------------------------------------
  // INIT ENGINE
  // ------------------------------------------------------
  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new A42Engine(containerRef.current);
    engine.init();
    engineRef.current = engine;

    // 🔥 ACTUAL FIX: Mouse events DIRECTLY attached to the canvas
    const canvas = engine.renderer.domElement as HTMLCanvasElement;

    canvas.style.pointerEvents = "auto";
    canvas.style.touchAction = "none"; // evita scroll en móvil

    const handlePointerDown = (e: PointerEvent) => {
      engine.onMouseDown(e as any);
    };

    canvas.addEventListener("pointerdown", handlePointerDown);

    // Debug
    // @ts-ignore
    window.editorEngine = engine;

    // Apply scene settings
    engine.setGridVisible(gridVisible);
    engine.updateSunPosition(sunPosition.azimuth, sunPosition.elevation);

    if (backgroundColor === "#111111") engine.setSkyVisible(true);
    else engine.setBackgroundColor(backgroundColor);

    return () => {
      canvas.removeEventListener("pointerdown", handlePointerDown);
      engine.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------------------------------------------------------
  // REACTIONS
  // ------------------------------------------------------
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

  // ------------------------------------------------------
  // GIZMO ACTIONS
  // ------------------------------------------------------
  const setGizmoMode = (m: "translate" | "rotate" | "scale") =>
    engineRef.current?.setGizmoMode(m);

  // ------------------------------------------------------
  // RENDER
  // ------------------------------------------------------
  return (
    <div className="w-screen h-screen relative bg-neutral-900 overflow-hidden">

      {/* Canvas container */}
      <div
        ref={containerRef}
        className="absolute inset-0 z-0"
        onContextMenu={(e) => e.preventDefault()}
        style={{ pointerEvents: "auto" }}
      />

      <BudgetPanel />
      <EnvironmentPanel />
      <FloorProperties />
      <FenceProperties />
      <CatalogPanel />

      {/* QR BUTTON */}
      <button
        onClick={() => setQRVisible(true)}
        className="absolute top-6 right-6 z-20 bg-neutral-800/90 hover:bg-neutral-700 text-white p-3 rounded-full border border-neutral-600 shadow-lg"
      >
        <QrCode size={20} />
      </button>

      {/* PRICE (only when logged) */}
      {!isReadOnlyMode && (
        <div className="absolute bottom-6 left-6 z-20">
          <button className="bg-neutral-800/90 px-4 py-3 rounded-full border border-neutral-600 text-white flex gap-3 items-center">
            <Euro size={18} />
            <span className="text-lg">{totalPrice.toLocaleString()} €</span>
          </button>
        </div>
      )}

      {/* GIZMO BUTTONS */}
      {selectedItemId && mode === "editing" && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-2 glass-panel p-2 rounded-xl">
          <button onClick={() => setGizmoMode("translate")}>
            <Move size={16} />
          </button>
          <button onClick={() => setGizmoMode("rotate")}>
            <RotateCw size={16} />
          </button>
          <button onClick={() => setGizmoMode("scale")}>
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

      {/* MEASURE TOOL UI */}
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

      {/* Watermark */}
      <div className="absolute bottom-6 right-6 text-white/5 font-black text-4xl pointer-events-none select-none">
        A42
      </div>
    </div>
  );
};
// --- END OF FILE ---
