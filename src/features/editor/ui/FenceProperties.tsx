// --- START OF FILE src/features/editor/ui/FenceProperties.tsx ---
import React, { useCallback, useMemo } from 'react';
import { Fence, Palette } from 'lucide-react';

import { FENCE_PRESETS } from '../data/fence_presets';
import { CadControl } from './CadControl';
import { useSceneStore } from '@/stores/scene/useSceneStore';
import { useSelectionStore } from '@/stores/selection/useSelectionStore';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

type ColorKey = 'post' | 'slatA' | 'slatB' | 'slatC';

interface FenceConfig {
  presetId: string;
  colors: FenceColors;
}

interface FenceColors {
  post: number;
  slatA: number;
  slatB?: number;
  slatC?: number;
}

interface FencePreset {
  name: string;
  defaultColors: FenceColors;
  multiColor?: boolean;
  isSolidPanel?: boolean;
}

interface PresetSelectorProps {
  presets: Record<string, FencePreset>;
  currentPresetId: string;
  onPresetChange: (presetId: string) => void;
}

interface ColorControlProps {
  label: string;
  value: number;
  onChange: (hex: string) => void;
}

interface ColorCustomizerProps {
  config: FenceConfig;
  preset: FencePreset;
  onColorChange: (key: ColorKey, hex: string) => void;
}

interface PanelHeaderProps {
  icon: React.ReactNode;
  title: string;
}

interface HelpTextProps {
  text: string;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const LABELS = {
  PANEL_TITLE: 'Editar Valla',
  MODEL_LABEL: 'Modelo',
  CUSTOMIZATION_LABEL: 'Personalización',
  POST_LABEL: 'Postes / Estructura',
  MAIN_SLATS_LABEL: 'Lamas Principales',
  PANEL_LABEL: 'Panel',
  SECONDARY_SLATS_LABEL: 'Lamas Secundarias',
  TERTIARY_SLATS_LABEL: 'Lamas Terciarias',
  HELP_TEXT: 'Clic Izq: Dibujar • Clic Dcho: Terminar',
} as const;

const PANEL_CONFIG = {
  width: 'w-80',
  position: 'top-20 right-4',
  zIndex: 'z-20',
} as const;

// ============================================================================
// UTILIDADES
// ============================================================================

/**
 * Convierte número decimal a hexadecimal
 */
const toHex = (num: number): string => {
  return '#' + num.toString(16).padStart(6, '0');
};

/**
 * Convierte hexadecimal a número decimal
 */
const hexToInt = (hex: string): number => {
  return parseInt(hex.replace('#', '0x'));
};

// ============================================================================
// COMPONENTES AUXILIARES
// ============================================================================

/**
 * Header del panel
 */
const PanelHeader: React.FC<PanelHeaderProps> = ({ icon, title }) => (
  <h3 className="text-white text-sm font-bold mb-4 flex items-center gap-2 border-b border-white/10 pb-2">
    {icon}
    {title}
  </h3>
);

/**
 * Botón de preset individual
 */
const PresetButton: React.FC<{
  presetKey: string;
  preset: FencePreset;
  isSelected: boolean;
  onClick: () => void;
}> = ({ preset, isSelected, onClick }) => (
  <button
    onClick={onClick}
    className={`
      text-xs p-2 rounded border text-left transition-all duration-200
      ${
        isSelected
          ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/20'
          : 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700 hover:border-neutral-600'
      }
    `}
    aria-pressed={isSelected}
  >
    {preset.name}
  </button>
);

/**
 * Selector de preset de valla
 */
const PresetSelector: React.FC<PresetSelectorProps> = ({
  presets,
  currentPresetId,
  onPresetChange,
}) => {
  const handlePresetClick = useCallback(
    (presetKey: string) => {
      onPresetChange(presetKey);
    },
    [onPresetChange]
  );

  return (
    <div className="mb-4">
      <label className="text-xs text-neutral-400 mb-2 block uppercase font-bold">
        {LABELS.MODEL_LABEL}
      </label>
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(presets).map(([key, preset]) => (
          <PresetButton
            key={key}
            presetKey={key}
            preset={preset}
            isSelected={currentPresetId === key}
            onClick={() => handlePresetClick(key)}
          />
        ))}
      </div>
    </div>
  );
};

/**
 * Control individual de color
 */
const ColorControl: React.FC<ColorControlProps> = ({
  label,
  value,
  onChange,
}) => {
  const hexValue = useMemo(() => toHex(value), [value]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  return (
    <div className="flex items-center justify-between group">
      <span className="text-xs text-neutral-300 group-hover:text-white transition-colors">
        {label}
      </span>
      <input
        type="color"
        value={hexValue}
        onChange={handleChange}
        className="w-8 h-8 rounded cursor-pointer bg-transparent border-none hover:scale-110 transition-transform"
        aria-label={`Cambiar color de ${label}`}
      />
    </div>
  );
};

/**
 * Sección de personalización de colores
 */
const ColorCustomizer: React.FC<ColorCustomizerProps> = ({
  config,
  preset,
  onColorChange,
}) => {
  const handleColorChange = useCallback(
    (key: ColorKey, hex: string) => {
      onColorChange(key, hex);
    },
    [onColorChange]
  );

  return (
    <div className="space-y-3">
      <label className="text-xs text-neutral-400 uppercase font-bold flex items-center gap-2">
        <Palette size={12} />
        {LABELS.CUSTOMIZATION_LABEL}
      </label>

      {/* Postes / Estructura */}
      <ColorControl
        label={LABELS.POST_LABEL}
        value={config.colors.post}
        onChange={(hex) => handleColorChange('post', hex)}
      />

      {/* Lamas principales o Panel */}
      <ColorControl
        label={preset.isSolidPanel ? LABELS.PANEL_LABEL : LABELS.MAIN_SLATS_LABEL}
        value={config.colors.slatA}
        onChange={(hex) => handleColorChange('slatA', hex)}
      />

      {/* Colores adicionales si el preset es multicolor */}
      {preset.multiColor && (
        <>
          <ColorControl
            label={LABELS.SECONDARY_SLATS_LABEL}
            value={config.colors.slatB ?? config.colors.slatA}
            onChange={(hex) => handleColorChange('slatB', hex)}
          />

          <ColorControl
            label={LABELS.TERTIARY_SLATS_LABEL}
            value={config.colors.slatC ?? config.colors.slatA}
            onChange={(hex) => handleColorChange('slatC', hex)}
          />
        </>
      )}
    </div>
  );
};

/**
 * Texto de ayuda al pie
 */
const HelpText: React.FC<HelpTextProps> = ({ text }) => (
  <div className="mt-4 pt-2 border-t border-white/10 text-[10px] text-neutral-500 text-center">
    {text}
  </div>
);

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export const FenceProperties: React.FC = () => {
  // ==========================================================================
  // HOOKS Y ESTADO
  // ==========================================================================

  const selectedItemId = useSelectionStore((s) => s.selectedItemId);
  const items = useSceneStore((s) => s.items);
  const updateItemFenceConfig = useSceneStore((s) => s.updateItemFenceConfig);

  // ==========================================================================
  // DATOS DERIVADOS
  // ==========================================================================

  const selectedItem = useMemo(
    () => items.find((i) => i.uuid === selectedItemId),
    [items, selectedItemId]
  );

  const currentConfig = useMemo(
    () => selectedItem?.type === 'fence' ? selectedItem.fenceConfig : null,
    [selectedItem]
  );

  const currentPreset = useMemo(
    () =>
      currentConfig
        ? FENCE_PRESETS[currentConfig.presetId] || FENCE_PRESETS['wood']
        : null,
    [currentConfig]
  );

  // ==========================================================================
  // VALIDACIÓN
  // ==========================================================================

  const shouldRender = useMemo(
    () =>
      selectedItem &&
      selectedItem.type === 'fence' &&
      currentConfig &&
      currentPreset,
    [selectedItem, currentConfig, currentPreset]
  );

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handlePresetChange = useCallback(
    (presetKey: string) => {
      if (!selectedItem || !currentConfig) return;

      const preset = FENCE_PRESETS[presetKey];
      if (!preset) return;

      const newConfig: FenceConfig = {
        presetId: presetKey,
        colors: {
          ...preset.defaultColors,
          ...currentConfig.colors,
        },
      };

      updateItemFenceConfig(selectedItem.uuid, newConfig);
    },
    [selectedItem, currentConfig, updateItemFenceConfig]
  );

  const handleColorChange = useCallback(
    (key: ColorKey, hex: string) => {
      if (!selectedItem || !currentConfig) return;

      const colorInt = hexToInt(hex);
      const newColors: FenceColors = {
        ...currentConfig.colors,
        [key]: colorInt,
      };

      updateItemFenceConfig(selectedItem.uuid, {
        presetId: currentConfig.presetId,
        colors: newColors,
      });
    },
    [selectedItem, currentConfig, updateItemFenceConfig]
  );

  // ==========================================================================
  // RENDER
  // ==========================================================================

  if (!shouldRender || !currentConfig || !currentPreset) {
    return null;
  }

  return (
    <div
      className={`
        absolute ${PANEL_CONFIG.position}
        bg-neutral-900/95 backdrop-blur-md
        border border-neutral-700
        rounded-xl p-4 shadow-xl
        ${PANEL_CONFIG.width} ${PANEL_CONFIG.zIndex}
        animate-in fade-in slide-in-from-right-2 duration-200
      `}
      role="complementary"
      aria-label="Panel de propiedades de valla"
    >
      {/* CAD Control */}
      <CadControl />

      {/* Header */}
      <PanelHeader icon={<Fence size={16} />} title={LABELS.PANEL_TITLE} />

      {/* Preset Selector */}
      <PresetSelector
        presets={FENCE_PRESETS}
        currentPresetId={currentConfig.presetId}
        onPresetChange={handlePresetChange}
      />

      {/* Color Customizer */}
      <ColorCustomizer
        config={currentConfig}
        preset={currentPreset}
        onColorChange={handleColorChange}
      />

      {/* Help Text */}
      <HelpText text={LABELS.HELP_TEXT} />
    </div>
  );
};

// ============================================================================
// EXPORTS ADICIONALES
// ============================================================================

export {
  PresetSelector,
  ColorCustomizer,
  ColorControl,
  PanelHeader,
  HelpText,
  toHex,
  hexToInt,
};
export type {
  FenceConfig,
  FenceColors,
  FencePreset,
  ColorKey,
  PresetSelectorProps,
  ColorCustomizerProps,
};

// --- END OF FILE ---