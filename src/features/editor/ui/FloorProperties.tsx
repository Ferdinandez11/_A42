// --- FILE: src/features/editor/ui/FloorProperties.tsx ---
import React, { useRef } from "react";
import { Palette, Upload, RotateCw, Move } from "lucide-react";

import { useEditorStore } from "@/stores/editor/useEditorStore";
import { useSelectionStore } from "@/stores/selection/useSelectionStore";
import type { FloorMaterialType } from "@/types/editor";
import { CadControl } from "./CadControl";

export const FloorProperties: React.FC = () => {
  // Selección (qué item está seleccionado)
  const selectedItemId = useSelectionStore((s) => s.selectedItemId);

  // --- STORE FIX (cada selector independiente → evita bucles infinitos)
  const items = useEditorStore((s) => s.items);
  const updateFloorMaterial = useEditorStore((s) => s.updateFloorMaterial);
  const updateFloorTexture = useEditorStore((s) => s.updateFloorTexture);
  // -------------------------------------------------------------

  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedItem = items.find((i) => i.uuid === selectedItemId);
  if (!selectedItem || selectedItem.type !== "floor") return null;

  const materials: { id: FloorMaterialType; color: string; name: string }[] = [
    { id: "rubber_red", color: "#A04040", name: "Rojo" },
    { id: "rubber_green", color: "#22c55e", name: "Verde" },
    { id: "rubber_blue", color: "#3b82f6", name: "Azul" },
    { id: "grass", color: "#4ade80", name: "Césped" },
    { id: "concrete", color: "#9ca3af", name: "Hormigón" },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    updateFloorTexture(selectedItem.uuid, url, 1, 0);
  };

  const handleUpdateTextureParams = (scale: number, rotation: number) => {
    updateFloorTexture(
      selectedItem.uuid,
      selectedItem.textureUrl,
      scale,
      rotation
    );
  };

  return (
    <div className="absolute top-20 right-4 bg-neutral-900/95 backdrop-blur-md border border-neutral-700 rounded-xl p-4 shadow-xl z-20 w-80 animate-in fade-in slide-in-from-right-2">
      {/* CAD Control arriba */}
      <CadControl />

      <h3 className="text-white text-sm font-bold mb-4 flex items-center gap-2 border-b border-white/10 pb-2">
        <Palette size={16} /> Propiedades del Suelo
      </h3>

      {/* MATERIAL BASE */}
      <div className="mb-4">
        <label className="text-xs text-neutral-400 mb-2 block uppercase font-bold">
          Material Base
        </label>
        <div className="flex gap-2">
          {materials.map((mat) => (
            <button
              key={mat.id}
              onClick={() => {
                // si pongo material base, quito textura custom
                updateFloorTexture(selectedItem.uuid, undefined, 1, 0);
                updateFloorMaterial(selectedItem.uuid, mat.id);
              }}
              className={`w-8 h-8 rounded-full border-2 transition-all ${
                !selectedItem.textureUrl &&
                selectedItem.floorMaterial === mat.id
                  ? "border-white scale-110"
                  : "border-transparent opacity-50 hover:opacity-100"
              }`}
              style={{ backgroundColor: mat.color }}
              title={mat.name}
            />
          ))}
        </div>
      </div>

      {/* TEXTURA PERSONALIZADA */}
      <div className="mb-2">
        <label className="text-xs text-neutral-400 mb-2 block uppercase font-bold">
          Textura Personalizada
        </label>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 rounded flex items-center justify-center gap-2 text-sm text-neutral-300 transition-colors mb-3"
        >
          <Upload size={14} />{" "}
          {selectedItem.textureUrl ? "Cambiar Imagen" : "Subir Imagen (JPG/PNG)"}
        </button>

        {selectedItem.textureUrl && (
          <div className="grid grid-cols-2 gap-3">
            {/* ESCALA */}
            <div className="bg-neutral-800 p-2 rounded">
              <div className="flex justify-between mb-1">
                <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                  <Move size={10} /> ESCALA
                </span>
                <span className="text-[10px] text-white">
                  {(selectedItem.textureScale ?? 1).toFixed(1)}x
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="5"
                step="0.1"
                value={selectedItem.textureScale ?? 1}
                onChange={(e) =>
                  handleUpdateTextureParams(
                    parseFloat(e.target.value),
                    selectedItem.textureRotation ?? 0
                  )
                }
                className="w-full h-1 bg-neutral-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            {/* ROTACIÓN */}
            <div className="bg-neutral-800 p-2 rounded">
              <div className="flex justify-between mb-1">
                <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                  <RotateCw size={10} /> ROTACIÓN
                </span>
                <span className="text-[10px] text-white">
                  {selectedItem.textureRotation ?? 0}°
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                step="15"
                value={selectedItem.textureRotation ?? 0}
                onChange={(e) =>
                  handleUpdateTextureParams(
                    selectedItem.textureScale ?? 1,
                    parseInt(e.target.value, 10)
                  )
                }
                className="w-full h-1 bg-neutral-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 pt-2 border-t border-white/10 text-[10px] text-neutral-500 text-center">
        💡 Shift + Clic para seleccionar vértices múltiples.
      </div>
    </div>
  );
};
