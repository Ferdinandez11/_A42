// --- START OF FILE src/features/editor/ui/FenceProperties.tsx ---
import { Fence, Palette } from "lucide-react";
import { FENCE_PRESETS } from "../data/fence_presets";

import { CadControl } from "./CadControl";

// Stores
import { useSceneStore } from "@/stores/scene/useSceneStore";
import { useSelectionStore } from "@/stores/selection/useSelectionStore";

export const FenceProperties = () => {
  // ✔ TU SELECTION STORE REAL: selectedUUID
  const selectedUUID = useSelectionStore((s) => s.selectedUUID);

  // ✔ datos generales de escena
  const items = useSceneStore((s) => s.items);
  const updateItemFenceConfig = useSceneStore((s) => s.updateItemFenceConfig);

  // Buscar item seleccionado
  const selectedItem = items.find((i) => i.uuid === selectedUUID);

  // Si no es valla o no tiene config, no mostrar panel
  if (!selectedItem || selectedItem.type !== "fence" || !selectedItem.fenceConfig) {
    return null;
  }

  const currentConfig = selectedItem.fenceConfig;
  const currentPreset =
    FENCE_PRESETS[currentConfig.presetId] || FENCE_PRESETS["wood"];

  // --- Cambiar preset ---
  const handlePresetChange = (key: string) => {
    const preset = FENCE_PRESETS[key];

    const newConfig = {
      presetId: key,
      colors: {
        ...preset.defaultColors,
        ...currentConfig.colors,
      },
    };

    updateItemFenceConfig(selectedItem.uuid, newConfig);
  };

  // --- Cambiar color individual ---
  const handleColorChange = (
    key: "post" | "slatA" | "slatB" | "slatC",
    hex: string
  ) => {
    const colorInt = parseInt(hex.replace("#", "0x"));

    const newColors = {
      ...currentConfig.colors,
      [key]: colorInt,
    };

    updateItemFenceConfig(selectedItem.uuid, {
      presetId: currentConfig.presetId,
      colors: newColors,
    });
  };

  const toHex = (num: number) => "#" + num.toString(16).padStart(6, "0");

  return (
    <div className="absolute top-20 right-4 bg-neutral-900/95 backdrop-blur-md border border-neutral-700 rounded-xl p-4 shadow-xl z-20 w-80 animate-in fade-in slide-in-from-right-2">

      {/* Panel CAD */}
      <CadControl />

      <h3 className="text-white text-sm font-bold mb-4 flex items-center gap-2 border-b border-white/10 pb-2">
        <Fence size={16} /> Editar Valla
      </h3>

      {/* SELECTOR DE MODELO */}
      <div className="mb-4">
        <label className="text-xs text-neutral-400 mb-2 block uppercase font-bold">
          Modelo
        </label>

        <div className="grid grid-cols-2 gap-2">
          {Object.entries(FENCE_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => handlePresetChange(key)}
              className={`text-xs p-2 rounded border text-left transition-all ${
                currentConfig.presetId === key
                  ? "bg-blue-600 border-blue-400 text-white"
                  : "bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700"
              }`}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* COLORES */}
      <div className="space-y-3">
        <label className="text-xs text-neutral-400 uppercase font-bold flex items-center gap-2">
          <Palette size={12} /> Personalización
        </label>

        {/* Postes */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-neutral-300">Postes / Estructura</span>
          <input
            type="color"
            value={toHex(currentConfig.colors.post)}
            onChange={(e) => handleColorChange("post", e.target.value)}
            className="w-8 h-8 rounded cursor-pointer bg-transparent border-none"
          />
        </div>

        {/* Lamas principales */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-neutral-300">
            {currentPreset.isSolidPanel ? "Panel" : "Lamas Principales"}
          </span>
          <input
            type="color"
            value={toHex(currentConfig.colors.slatA)}
            onChange={(e) => handleColorChange("slatA", e.target.value)}
            className="w-8 h-8 rounded cursor-pointer bg-transparent border-none"
          />
        </div>

        {/* Multicolor */}
        {currentPreset.multiColor && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-300">Lamas Secundarias</span>
              <input
                type="color"
                value={toHex(currentConfig.colors.slatB ?? currentConfig.colors.slatA)}
                onChange={(e) => handleColorChange("slatB", e.target.value)}
                className="w-8 h-8 rounded cursor-pointer bg-transparent border-none"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-300">Lamas Terciarias</span>
              <input
                type="color"
                value={toHex(currentConfig.colors.slatC ?? currentConfig.colors.slatA)}
                onChange={(e) => handleColorChange("slatC", e.target.value)}
                className="w-8 h-8 rounded cursor-pointer bg-transparent border-none"
              />
            </div>
          </>
        )}
      </div>

      <div className="mt-4 pt-2 border-t border-white/10 text-[10px] text-neutral-500 text-center">
        Clic Izq: Dibujar • Clic Dcho: Terminar
      </div>
    </div>
  );
};
// --- END OF FILE ---
