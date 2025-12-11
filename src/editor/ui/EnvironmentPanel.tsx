// --- START OF FILE src/features/editor/ui/EnvironmentPanel.tsx ---
import React, { useCallback, useMemo } from 'react';
import { X, Sun, MountainSnow } from 'lucide-react';

import { useEditorStore } from '@/editor/stores/editor/useEditorStore';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

interface SunPosition {
  azimuth: number;
  elevation: number;
}

interface ColorOption {
  name: string;
  value: string;
  isSky?: boolean;
  icon?: React.ReactNode;
}

interface SliderControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  unit?: string;
  onChange: (value: number) => void;
  step?: number;
}

interface ColorPickerProps {
  colors: ColorOption[];
  selectedColor: string;
  onColorSelect: (color: string) => void;
}

interface ColorSwatchProps {
  color: ColorOption;
  isSelected: boolean;
  onClick: () => void;
}

interface PanelHeaderProps {
  title: string;
  icon: React.ReactNode;
  onClose: () => void;
}

interface SectionTitleProps {
  title: string;
  icon?: React.ReactNode;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const COLOR_PRESETS: ColorOption[] = [
  {
    name: 'Cielo',
    value: '#111111',
    isSky: true,
    icon: <span className="text-[10px] font-bold text-white/50 uppercase">Sky</span>,
  },
  { name: 'Blanco', value: '#ffffff' },
  { name: 'Azul', value: '#3b82f6' },
  { name: 'Verde', value: '#22c55e' },
  { name: 'Granate', value: '#7f1d1d' },
  { name: 'Negro', value: '#000000' },
] as const;

const SUN_RANGES = {
  AZIMUTH: { min: 0, max: 360, step: 1 },
  ELEVATION: { min: 0, max: 90, step: 1 },
} as const;

const LABELS = {
  PANEL_TITLE: 'Entorno',
  SOLAR_LIGHTING: 'Iluminación Solar',
  ROTATION: 'Rotación',
  HEIGHT: 'Altura',
  BACKGROUND: 'Fondo',
  DEGREE_SYMBOL: '°',
} as const;

const PANEL_CONFIG = {
  width: 'w-72',
  position: 'top-20 right-6',
  zIndex: 'z-30',
} as const;

// ============================================================================
// COMPONENTES AUXILIARES
// ============================================================================

/**
 * Header del panel con título y botón de cerrar
 */
const PanelHeader: React.FC<PanelHeaderProps> = ({ title, icon, onClose }) => (
  <div className="p-4 border-b border-neutral-700 flex justify-between items-center bg-neutral-800/50 rounded-t-xl">
    <h2 className="text-white font-bold text-lg flex items-center gap-2">
      {icon}
      {title}
    </h2>
    <button
      onClick={onClose}
      className="text-neutral-400 hover:text-white transition-colors"
      aria-label="Cerrar panel de entorno"
    >
      <X size={20} />
    </button>
  </div>
);

/**
 * Título de sección
 */
const SectionTitle: React.FC<SectionTitleProps> = ({ title, icon }) => (
  <h3 className="text-neutral-400 text-xs uppercase font-bold tracking-wider flex items-center gap-2">
    {icon}
    {title}
  </h3>
);

/**
 * Control de slider con label y valor
 */
const SliderControl: React.FC<SliderControlProps> = ({
  label,
  value,
  min,
  max,
  unit = '',
  onChange,
  step = 1,
}) => {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(Number(e.target.value));
    },
    [onChange]
  );

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-white">{label}</span>
        <span className="text-neutral-400 font-mono">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
        className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-colors"
        aria-label={label}
      />
    </div>
  );
};

/**
 * Muestra individual de color
 */
const ColorSwatch: React.FC<ColorSwatchProps> = ({
  color,
  isSelected,
  onClick,
}) => (
  <button
    onClick={onClick}
    className={`
      relative h-10 rounded-lg border-2 transition-all duration-200 flex items-center justify-center
      ${
        isSelected
          ? 'border-blue-500 scale-105 shadow-lg shadow-blue-500/20'
          : 'border-transparent hover:border-white/20 hover:scale-105'
      }
    `}
    style={{ backgroundColor: color.value }}
    title={color.name}
    aria-label={`Seleccionar color ${color.name}`}
    aria-pressed={isSelected}
  >
    {color.icon}
  </button>
);

/**
 * Selector de colores con grid
 */
const ColorPicker: React.FC<ColorPickerProps> = ({
  colors,
  selectedColor,
  onColorSelect,
}) => {
  const handleColorClick = useCallback(
    (colorValue: string) => {
      onColorSelect(colorValue);
    },
    [onColorSelect]
  );

  return (
    <div className="grid grid-cols-3 gap-2">
      {colors.map((color) => (
        <ColorSwatch
          key={color.value}
          color={color}
          isSelected={selectedColor === color.value}
          onClick={() => handleColorClick(color.value)}
        />
      ))}
    </div>
  );
};

/**
 * Separador visual
 */
const Divider: React.FC = () => (
  <div className="h-px bg-neutral-700/50" aria-hidden="true" />
);

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export const EnvironmentPanel: React.FC = () => {
  // ==========================================================================
  // HOOKS Y ESTADO
  // ==========================================================================

  const {
    envPanelVisible,
    toggleEnvPanel,
    sunPosition,
    setSunPosition,
    backgroundColor,
    setBackgroundColor,
  } = useEditorStore();

  // ==========================================================================
  // CALLBACKS
  // ==========================================================================

  const handleAzimuthChange = useCallback(
    (value: number) => {
      setSunPosition(value, sunPosition.elevation);
    },
    [sunPosition.elevation, setSunPosition]
  );

  const handleElevationChange = useCallback(
    (value: number) => {
      setSunPosition(sunPosition.azimuth, value);
    },
    [sunPosition.azimuth, setSunPosition]
  );

  const handleColorSelect = useCallback(
    (color: string) => {
      setBackgroundColor(color);
    },
    [setBackgroundColor]
  );

  const handleClose = useCallback(() => {
    toggleEnvPanel();
  }, [toggleEnvPanel]);

  // ==========================================================================
  // MEMOIZACIÓN
  // ==========================================================================

  const colors = useMemo(() => COLOR_PRESETS, []);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  if (!envPanelVisible) return null;

  return (
    <div
      className={`
        absolute ${PANEL_CONFIG.position}
        bg-neutral-900/95 backdrop-blur-md
        border border-neutral-700
        rounded-xl shadow-2xl
        ${PANEL_CONFIG.width}
        flex flex-col ${PANEL_CONFIG.zIndex}
        animate-in fade-in slide-in-from-right-5 duration-200
      `}
      role="complementary"
      aria-label="Panel de configuración de entorno"
    >
      {/* Header */}
      <PanelHeader
        title={LABELS.PANEL_TITLE}
        icon={<Sun size={20} className="text-yellow-500" />}
        onClose={handleClose}
      />

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Solar Controls */}
        <section className="space-y-4" aria-labelledby="solar-controls-title">
          <SectionTitle title={LABELS.SOLAR_LIGHTING} />

          <SliderControl
            label={LABELS.ROTATION}
            value={sunPosition.azimuth}
            min={SUN_RANGES.AZIMUTH.min}
            max={SUN_RANGES.AZIMUTH.max}
            step={SUN_RANGES.AZIMUTH.step}
            unit={LABELS.DEGREE_SYMBOL}
            onChange={handleAzimuthChange}
          />

          <SliderControl
            label={LABELS.HEIGHT}
            value={sunPosition.elevation}
            min={SUN_RANGES.ELEVATION.min}
            max={SUN_RANGES.ELEVATION.max}
            step={SUN_RANGES.ELEVATION.step}
            unit={LABELS.DEGREE_SYMBOL}
            onChange={handleElevationChange}
          />
        </section>

        <Divider />

        {/* Background Colors */}
        <section className="space-y-3" aria-labelledby="background-title">
          <SectionTitle
            title={LABELS.BACKGROUND}
            icon={<MountainSnow size={14} />}
          />

          <ColorPicker
            colors={colors}
            selectedColor={backgroundColor}
            onColorSelect={handleColorSelect}
          />
        </section>
      </div>
    </div>
  );
};

// ============================================================================
// EXPORTS ADICIONALES
// ============================================================================

export {
  PanelHeader,
  SliderControl,
  ColorPicker,
  ColorSwatch,
  SectionTitle,
  Divider,
};
export type { ColorOption, SunPosition, SliderControlProps, ColorPickerProps };

// --- END OF FILE ---