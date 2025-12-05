import { Fence, Palette } from "lucide-react";
import { FENCE_PRESETS } from "../data/fence_presets";
import { CadControl } from "./CadControl";

// Stores
import { useSceneStore } from "@/stores/scene/useSceneStore";
import { useSelectionStore } from "@/stores/selection/useSelectionStore";

// Colores rápidos para no tener que abrir el selector siempre
const QUICK_COLORS = [
  { hex: "#8b5a2b", name: "Madera" },
  { hex: "#3b82f6", name: "Azul" },
  { hex: "#22c55e", name: "Verde" },
  { hex: "#eab308", name: "Amarillo" },
  { hex: "#ef4444", name: "Rojo" },
  { hex: "#111111", name: "Negro" },
  { hex: "#cccccc", name: "Blanco" },
];

export const FenceProperties = () => {
  const selectedUUID = useSelectionStore((s) => s.selectedUUID);
  const items = useSceneStore((s) => s.items);
  const updateItemFenceConfig = useSceneStore((s) => s.updateItemFenceConfig);

  const selectedItem = items.find((i) => i.uuid === selectedUUID);

  if (!selectedItem || selectedItem.type !== "fence" || !selectedItem.fenceConfig) {
    return null;
  }

  const currentConfig = selectedItem.fenceConfig;
  const currentPreset = FENCE_PRESETS[currentConfig.presetId] || FENCE_PRESETS["wood"];

  const handlePresetChange = (key: string) => {
    const preset = FENCE_PRESETS[key];
    const newConfig = {
      presetId: key,
      colors: { ...preset.defaultColors, ...currentConfig.colors },
    };
    updateItemFenceConfig(selectedItem.uuid, newConfig);
  };

  const handleColorChange = (key: "post" | "slatA" | "slatB" | "slatC", hex: string) => {
    const colorInt = parseInt(hex.replace("#", "0x"));
    const newColors = { ...currentConfig.colors, [key]: colorInt };
    updateItemFenceConfig(selectedItem.uuid, {
      presetId: currentConfig.presetId,
      colors: newColors,
    });
  };

  const toHex = (num: number) => "#" + num.toString(16).padStart(6, "0");

  // Componente interno para elegir color (Botones rápidos + Selector nativo)
  const ColorPicker = ({ label, colorKey }: { label: string, colorKey: "post" | "slatA" | "slatB" | "slatC" }) => (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-neutral-300">{label}</span>
        <div className="w-6 h-6 rounded-full border border-neutral-600 overflow-hidden relative">
           <input
            type="color"
            value={toHex(currentConfig.colors[colorKey] ?? 0)}
            onChange={(e) => handleColorChange(colorKey, e.target.value)}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] p-0 m-0 border-0 cursor-pointer"
          />
        </div>
      </div>
      {/* Paleta rápida */}
      <div className="flex gap-1 flex-wrap">
        {QUICK_COLORS.map((c) => (
          <button
            key={c.hex}
            onClick={() => handleColorChange(colorKey, c.hex)}
            className="w-5 h-5 rounded-full border border-white/10 hover:scale-110 transition-transform"
            style={{ backgroundColor: c.hex }}
            title={c.name}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="absolute top-20 right-4 bg-neutral-900/95 backdrop-blur-md border border-neutral-700 rounded-xl p-4 shadow-xl z-20 w-80 animate-in fade-in slide-in-from-right-2">
      <CadControl />

      <h3 className="text-white text-sm font-bold mb-4 flex items-center gap-2 border-b border-white/10 pb-2">
        <Fence size={16} /> Editar Valla
      </h3>

      <div className="mb-4">
        <label className="text-xs text-neutral-400 mb-2 block uppercase font-bold">Modelo</label>
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

      <div className="space-y-1">
        <label className="text-xs text-neutral-400 uppercase font-bold flex items-center gap-2 mb-2">
          <Palette size={12} /> Colores
        </label>

        <ColorPicker label="Postes / Estructura" colorKey="post" />
        <ColorPicker label={currentPreset.isSolidPanel ? "Panel" : "Lamas Principales"} colorKey="slatA" />

        {currentPreset.multiColor && (
          <>
            <ColorPicker label="Lamas Secundarias" colorKey="slatB" />
            <ColorPicker label="Lamas Terciarias" colorKey="slatC" />
          </>
        )}
      </div>

      <div className="mt-4 pt-2 border-t border-white/10 text-[10px] text-neutral-500 text-center">
        Clic Izq: Dibujar • Clic Dcho: Terminar
      </div>
    </div>
  );
};