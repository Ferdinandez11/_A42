import React, { useRef } from "react";
import { Palette, Upload, RotateCw, Move } from "lucide-react";

import { useSceneStore } from "@/editor/stores/scene/useSceneStore";
import { useSelectionStore } from "@/editor/stores/selection/useSelectionStore";
import type { FloorMaterialType } from "@/domain/types/editor";
import { CadControl } from "@/editor/ui/CadControl";

// 🎨 Types
interface MaterialOption {
  id: FloorMaterialType;
  color: string;
  name: string;
}

interface TextureControlProps {
  label: string;
  icon: React.ElementType;
  value: number;
  min: string;
  max: string;
  step: string;
  unit: string;
  onChange: (value: number) => void;
}

// 🎨 Constants
const MATERIALS: MaterialOption[] = [
  { id: "rubber_red", color: "#A04040", name: "Rojo" },
  { id: "rubber_green", color: "#22c55e", name: "Verde" },
  { id: "rubber_blue", color: "#3b82f6", name: "Azul" },
  { id: "grass", color: "#4ade80", name: "Césped" },
  { id: "concrete", color: "#9ca3af", name: "Hormigón" },
];

// 🎨 Styled Classes (como constantes para reutilización)
const CLASSES = {
  container: "absolute top-20 right-4 bg-neutral-900/95 backdrop-blur-md border border-neutral-700 rounded-xl p-4 shadow-xl z-20 w-80 animate-in fade-in slide-in-from-right-2",
  header: "text-white text-sm font-bold mb-4 flex items-center gap-2 border-b border-white/10 pb-2",
  sectionLabel: "text-xs text-neutral-400 mb-2 block uppercase font-bold",
  materialButton: {
    base: "w-8 h-8 rounded-full border-2 transition-all",
    active: "border-white scale-110",
    inactive: "border-transparent opacity-50 hover:opacity-100",
  },
  uploadButton: "w-full py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 rounded flex items-center justify-center gap-2 text-sm text-neutral-300 transition-colors mb-3",
  controlContainer: "bg-neutral-800 p-2 rounded",
  controlHeader: "flex justify-between mb-1",
  controlLabel: "text-[10px] text-neutral-400 flex items-center gap-1",
  controlValue: "text-[10px] text-white",
  slider: "w-full h-1 bg-neutral-600 rounded-lg appearance-none cursor-pointer accent-blue-500",
  footer: "mt-4 pt-2 border-t border-white/10 text-[10px] text-neutral-500 text-center",
} as const;

// 🎨 Sub-Components
const MaterialSelector: React.FC<{
  materials: MaterialOption[];
  selectedMaterial: FloorMaterialType | undefined;
  hasTexture: boolean;
  onSelect: (materialId: FloorMaterialType) => void;
}> = ({ materials, selectedMaterial, hasTexture, onSelect }) => (
  <div className="mb-4">
    <label className={CLASSES.sectionLabel}>Material Base</label>
    <div className="flex gap-2">
      {materials.map((mat) => (
        <button
          key={mat.id}
          onClick={() => onSelect(mat.id)}
          className={`${CLASSES.materialButton.base} ${
            !hasTexture && selectedMaterial === mat.id
              ? CLASSES.materialButton.active
              : CLASSES.materialButton.inactive
          }`}
          style={{ backgroundColor: mat.color } as React.CSSProperties}
          title={mat.name}
          aria-label={`Material ${mat.name}`}
        />
      ))}
    </div>
  </div>
);

const TextureControl: React.FC<TextureControlProps> = ({
  label,
  icon: Icon,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}) => (
  <div className={CLASSES.controlContainer}>
    <div className={CLASSES.controlHeader}>
      <span className={CLASSES.controlLabel}>
        <Icon size={10} /> {label}
      </span>
      <span className={CLASSES.controlValue}>
        {typeof value === "number" ? value.toFixed(label === "ESCALA" ? 1 : 0) : value}{unit}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className={CLASSES.slider}
      aria-label={label}
    />
  </div>
);

const TextureUpload: React.FC<{
  hasTexture: boolean;
  textureScale: number;
  textureRotation: number;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUpdateParams: (scale: number, rotation: number) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}> = ({
  hasTexture,
  textureScale,
  textureRotation,
  onFileChange,
  onUpdateParams,
  fileInputRef,
}) => (
  <div className="mb-2">
    <label className={CLASSES.sectionLabel}>Textura Personalizada</label>

    <input
      type="file"
      ref={fileInputRef}
      onChange={onFileChange}
      accept="image/*"
      className="hidden"
      aria-label="Subir textura"
    />

    <button
      onClick={() => fileInputRef.current?.click()}
      className={CLASSES.uploadButton}
    >
      <Upload size={14} />
      {hasTexture ? "Cambiar Imagen" : "Subir Imagen (JPG/PNG)"}
    </button>

    {hasTexture && (
      <div className="grid grid-cols-2 gap-3">
        <TextureControl
          label="ESCALA"
          icon={Move}
          value={textureScale}
          min="0.1"
          max="5"
          step="0.1"
          unit="x"
          onChange={(scale) => onUpdateParams(scale, textureRotation)}
        />
        <TextureControl
          label="ROTACIÓN"
          icon={RotateCw}
          value={textureRotation}
          min="0"
          max="360"
          step="15"
          unit="°"
          onChange={(rotation) => onUpdateParams(textureScale, rotation)}
        />
      </div>
    )}
  </div>
);

// 🎨 Main Component
export const FloorProperties: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Store hooks
  const selectedItemId = useSelectionStore((s) => s.selectedItemId);
  const items = useSceneStore((s) => s.items);
  const updateFloorMaterial = useSceneStore((s) => s.updateFloorMaterial);
  const updateFloorTexture = useSceneStore((s) => s.updateFloorTexture);

  // Selected item
  const selectedItem = items.find((i) => i.uuid === selectedItemId);

  // Type guard
  if (!selectedItem || selectedItem.type !== "floor") {
    return null;
  }

  // Handlers
  const handleMaterialSelect = (materialId: FloorMaterialType): void => {
    updateFloorTexture(selectedItem.uuid, undefined, 1, 0);
    updateFloorMaterial(selectedItem.uuid, materialId);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const url = URL.createObjectURL(file);
    updateFloorTexture(selectedItem.uuid, url, 1, 0);
  };

  const handleUpdateTextureParams = (scale: number, rotation: number): void => {
    updateFloorTexture(selectedItem.uuid, selectedItem.textureUrl, scale, rotation);
  };

  return (
    <div className={CLASSES.container}>
      <CadControl />

      <h3 className={CLASSES.header}>
        <Palette size={16} /> Propiedades del Suelo
      </h3>

      <MaterialSelector
        materials={MATERIALS}
        selectedMaterial={selectedItem.floorMaterial}
        hasTexture={!!selectedItem.textureUrl}
        onSelect={handleMaterialSelect}
      />

      <TextureUpload
        hasTexture={!!selectedItem.textureUrl}
        textureScale={selectedItem.textureScale ?? 1}
        textureRotation={selectedItem.textureRotation ?? 0}
        onFileChange={handleFileChange}
        onUpdateParams={handleUpdateTextureParams}
        fileInputRef={fileInputRef}
      />

      <div className={CLASSES.footer}>
        💡 Shift + Clic para seleccionar vértices múltiples.
      </div>
    </div>
  );
};