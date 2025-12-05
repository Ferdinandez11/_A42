import React, { useEffect, useRef, useState, useCallback } from "react";
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
import { useCatalogStore } from "@/stores/catalog/useCatalogStore"; // IMPORTANTE

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

  // --- Editor store ---
  const mode = useEditorStore((s) => s.mode);
  const gridVisible = useEditorStore((s) => s.gridVisible);
  const cameraType = useEditorStore((s) => s.cameraType);
  const pendingView = useEditorStore((s) => s.pendingView);
  const clearPendingView = useEditorStore((s) => s.clearPendingView);
  const sunPosition = useEditorStore((s) => s.sunPosition);
  const backgroundColor = useEditorStore((s) => s.backgroundColor);
  const safetyZonesVisible = useEditorStore((s) => s.safetyZonesVisible);
  const measurementResult = useEditorStore((s) => s.measurementResult);

  // --- Scene & Catalog Stores ---
  const items = useSceneStore((s) => s.items);
  const totalPrice = useSceneStore((s) => s.totalPrice);
  const selectedProduct = useCatalogStore((s) => s.selectedProduct); // PRODUCTO SELECCIONADO

  // --- Selection store ---
  const selectedUUID = useSelectionStore((s) => s.selectedUUID);

  // --- Project store ---
  const isReadOnlyMode = useProjectStore((s) => s.isReadOnlyMode);

  const [qrVisible, setQRVisible] = React.useState(false);

  // ============================================================
  // 1. INICIALIZACIÓN DEL MOTOR
  // ============================================================
  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new A42Engine(containerRef.current);
    engine.init();

    setEngineInstance(engine);

    const handlePointerDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement).tagName === "CANVAS") {
        engine.interactionManager.onPointerDown(e as unknown as MouseEvent);
      }
    };

    const container = containerRef.current;
    container.addEventListener("pointerdown", handlePointerDown);

    // Config inicial
    engine.setGrid(gridVisible);
    engine.updateSunPosition?.(sunPosition.azimuth, sunPosition.elevation);
    if (backgroundColor === "#111111") engine.setSky(true);
    else engine.setBackground(backgroundColor);

    return () => {
      container.removeEventListener("pointerdown", handlePointerDown);
      engine.dispose();
      setEngineInstance(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================================
  // 2. LIMPIEZA DE HERRAMIENTAS AL CAMBIAR MODO
  // ============================================================
  useEffect(() => {
    if (engineInstance) {
      engineInstance.clearTools();
    }
  }, [mode, engineInstance]);

  // ============================================================
  // 3. PREVISUALIZACIÓN DE CATÁLOGO (CORREGIDO)
  // ============================================================
  useEffect(() => {
    if (!engineInstance) return;

    if (mode === "placing_item" && selectedProduct) {
      // Crear objeto fantasma
      const previewItem: any = {
        uuid: "preview-temp",
        type: "model",
        productId: selectedProduct.id,
        name: selectedProduct.name,
        modelUrl: selectedProduct.modelUrl,
        price: selectedProduct.price,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        data: selectedProduct,
      };
      
      engineInstance.objectManager.setPreviewItem(previewItem);
    } else {
      // Limpiar preview si no estamos colocando
      // Nota: objectManager maneja la limpieza interna cuando confirma, 
      // pero esto asegura limpieza al cancelar modo.
    }
  }, [selectedProduct, mode, engineInstance]);


  // ============================================================
  // 4. SINCRONIZACIÓN SELECCIÓN UI → ENGINE
  // ============================================================
  useEffect(() => {
    if (!engineInstance) return;
    engineInstance.interactionManager.selectItemByUUID(selectedUUID);
  }, [selectedUUID, engineInstance]);

  // ============================================================
  // 5. SINCRONIZACIÓN ESCENA STORE → ENGINE
  // ============================================================
  useEffect(() => {
    if (!engineInstance) return;
    // syncScene actualiza posición Y propiedades (materiales suelo)
    engineInstance.syncScene(items);
  }, [items, engineInstance]);

  // ============================================================
  // 6. REACTIVIDAD SOBRE PROPIEDADES DEL EDITOR
  // ============================================================
  useEffect(() => {
    engineInstance?.setGrid(gridVisible);
  }, [gridVisible, engineInstance]);

  useEffect(() => {
    if (!engineInstance) return;
    engineInstance.switchCamera(cameraType);
    engineInstance.interactionManager.updateCamera(engineInstance.activeCamera);
  }, [cameraType, engineInstance]);

  useEffect(() => {
    if (!engineInstance) return;
    engineInstance.scene.traverse((obj) => {
      if (obj.userData?.isSafetyZone) {
        obj.visible = safetyZonesVisible;
      }
    });
  }, [safetyZonesVisible, engineInstance]);

  useEffect(() => {
    if (!engineInstance) return;
    engineInstance.updateSunPosition?.(
      sunPosition.azimuth,
      sunPosition.elevation
    );
  }, [sunPosition, engineInstance]);

  useEffect(() => {
    if (!pendingView || !engineInstance) return;
    engineInstance.setView(pendingView);
    clearPendingView();
  }, [pendingView, clearPendingView, engineInstance]);

  useEffect(() => {
    if (!engineInstance) return;
    if (backgroundColor === "#111111") engineInstance.setSky(true);
    else engineInstance.setBackground(backgroundColor);
  }, [backgroundColor, engineInstance]);

  // ============================================================
  // 7. ACCIONES SOBRE LA SELECCIÓN
  // ============================================================
  const handleDuplicateSelection = useCallback(() => {
    if (!selectedUUID) return;

    const sceneState = useSceneStore.getState();
    const currentItems = sceneState.items;
    const original = currentItems.find((i) => i.uuid === selectedUUID);
    if (!original) return;

    const newUuid = crypto.randomUUID();
    const newItem = {
      ...original,
      uuid: newUuid,
      position: [
        original.position[0] + 1,
        original.position[1],
        original.position[2],
      ] as [number, number, number],
    };

    sceneState.addItem(newItem as any);
  }, [selectedUUID]);

  const handleRemoveSelection = useCallback(() => {
    if (!selectedUUID || !engineInstance) return;

    const sceneState = useSceneStore.getState();
    sceneState.removeItem(selectedUUID);

    engineInstance.objectManager.removeByUUID(selectedUUID);

    const selState = useSelectionStore.getState();
    selState.select(null);
  }, [selectedUUID, engineInstance]);

  // ============================================================
  // RENDER
  // ============================================================
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

        {/* Catálogo por encima de todo */}
        {mode === "catalog" && (
          <div className="absolute inset-0 z-40">
            <Catalog />
          </div>
        )}

        {/* Botón QR */}
        <button
          onClick={() => setQRVisible(true)}
          className="absolute top-6 right-6 z-20 bg-neutral-800/90 hover:bg-neutral-700 text-white p-3 rounded-full border border-neutral-600 shadow-lg"
        >
          <QrCode size={20} />
        </button>

        {/* Total presupuesto */}
        {!isReadOnlyMode && (
          <div className="absolute bottom-6 left-6 z-20">
            <button className="bg-neutral-800/90 px-4 py-3 rounded-full border border-neutral-600 text-white flex gap-3 items-center">
              <Euro size={18} />
              <span className="text-lg">{totalPrice.toLocaleString()} €</span>
            </button>
          </div>
        )}

        {/* Mini toolbar de gizmo + acciones sobre selección */}
        {selectedUUID && mode === "editing" && (
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
            <button onClick={handleDuplicateSelection}>
              <Copy size={16} />
            </button>
            <button onClick={handleRemoveSelection}>
              <Trash2 size={16} />
            </button>
          </div>
        )}

        {/* HUD de medición */}
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