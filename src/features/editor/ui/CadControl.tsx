// --- START OF FILE src/features/editor/ui/CadControl.tsx ---
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { ArrowLeftRight, Ruler, Move } from 'lucide-react';

import { useCADStore } from '@/stores/cad/useCADStore';
import { useSceneTools } from '../hooks/useSceneTools';
import { createCADSegmentParams } from '../hooks/useSceneTools';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

type CADMode = 'ANGLE' | 'DISTANCE';

interface CADModeConfig {
  mode: CADMode;
  label: string;
  icon: React.ReactNode;
  unit: string;
  borderColor: string;
  buttonColor: string;
  precision: number;
  minValue: number;
  maxValue?: number;
}

interface InputControlProps {
  value: string;
  onChange: (value: string) => void;
  onApply: () => void;
  placeholder?: string;
  disabled?: boolean;
}

interface ModeHeaderProps {
  config: CADModeConfig;
  showSwapButton: boolean;
  onSwap: () => void;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const MODE_CONFIGS: Record<CADMode, Omit<CADModeConfig, 'mode'>> = {
  DISTANCE: {
    label: 'Distancia',
    icon: <Ruler size={14} />,
    unit: 'm',
    borderColor: 'border-blue-500',
    buttonColor: 'bg-blue-600 hover:bg-blue-500',
    precision: 3,
    minValue: 0.001,
    maxValue: 1000,
  },
  ANGLE: {
    label: 'Ángulo',
    icon: <Move size={14} />,
    unit: '°',
    borderColor: 'border-yellow-500',
    buttonColor: 'bg-yellow-600 hover:bg-yellow-500',
    precision: 1,
    minValue: 0,
    maxValue: 360,
  },
} as const;

const MESSAGES = {
  SWAP_DIRECTION: 'Cambiar dirección',
  APPLY_BUTTON: 'OK',
  INVALID_VALUE: 'Valor inválido',
  OUT_OF_RANGE: 'Valor fuera de rango',
} as const;

const MIN_VERTICES_REQUIRED = 2;

// ============================================================================
// COMPONENTES AUXILIARES
// ============================================================================

/**
 * Header del control con título, icono y botón de swap
 */
const ModeHeader: React.FC<ModeHeaderProps> = ({
  config,
  showSwapButton,
  onSwap,
}) => (
  <div className="flex justify-between items-center mb-2">
    <div className="flex items-center gap-2">
      <span className="text-white">{config.icon}</span>
      <span className="text-xs font-bold uppercase text-white">
        {config.label}
      </span>
    </div>

    {showSwapButton && (
      <button
        onClick={onSwap}
        className="p-1 hover:bg-white/10 rounded text-blue-400 transition-colors"
        title={MESSAGES.SWAP_DIRECTION}
        aria-label={MESSAGES.SWAP_DIRECTION}
      >
        <ArrowLeftRight size={14} />
      </button>
    )}
  </div>
);

/**
 * Control de input con botón de aplicar
 */
const InputControl: React.FC<InputControlProps> = ({
  value,
  onChange,
  onApply,
  placeholder = '0',
  disabled = false,
}) => {
  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        onApply();
      }
    },
    [onApply]
  );

  return (
    <div className="flex gap-2">
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 text-sm text-white font-mono focus:border-white/30 focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        step="any"
      />
      <button
        onClick={onApply}
        disabled={disabled}
        className="bg-blue-600 hover:bg-blue-500 px-3 rounded text-xs font-bold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[40px]"
        aria-label={MESSAGES.APPLY_BUTTON}
      >
        {MESSAGES.APPLY_BUTTON}
      </button>
    </div>
  );
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export const CadControl: React.FC = () => {
  // ==========================================================================
  // HOOKS Y ESTADO
  // ==========================================================================

  const { setCadSegment, setCadAngle, swapCadSelection } = useSceneTools();

  // Estado del CAD Store
  const selectedVertexIndices = useCADStore((s) => s.selectedVertices);
  const distance = useCADStore((s) => s.distance);
  const angle = useCADStore((s) => s.angle);

  // Estado local
  const [inputValue, setInputValue] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // ==========================================================================
  // CÁLCULOS Y MEMOIZACIÓN
  // ==========================================================================

  const mode: CADMode = useMemo(
    () => (selectedVertexIndices.length === 3 ? 'ANGLE' : 'DISTANCE'),
    [selectedVertexIndices.length]
  );

  const config: CADModeConfig = useMemo(
    () => ({
      mode,
      ...MODE_CONFIGS[mode],
    }),
    [mode]
  );

  const showControl = useMemo(
    () => selectedVertexIndices.length >= MIN_VERTICES_REQUIRED,
    [selectedVertexIndices.length]
  );

  const showSwapButton = useMemo(
    () => mode === 'DISTANCE' && selectedVertexIndices.length === 2,
    [mode, selectedVertexIndices.length]
  );

  // ==========================================================================
  // EFECTOS
  // ==========================================================================

  useEffect(() => {
    if (mode === 'ANGLE' && angle !== null) {
      setInputValue(angle.toFixed(config.precision));
    } else if (mode === 'DISTANCE' && distance !== null) {
      setInputValue(distance.toFixed(config.precision));
    }
    setError(null);
  }, [distance, angle, mode, config.precision]);

  // ==========================================================================
  // VALIDACIONES
  // ==========================================================================

  const validateValue = useCallback(
    (value: number): { valid: boolean; error?: string } => {
      if (isNaN(value)) {
        return { valid: false, error: MESSAGES.INVALID_VALUE };
      }

      if (value < config.minValue) {
        return {
          valid: false,
          error: `${MESSAGES.OUT_OF_RANGE} (min: ${config.minValue})`,
        };
      }

      if (config.maxValue !== undefined && value > config.maxValue) {
        return {
          valid: false,
          error: `${MESSAGES.OUT_OF_RANGE} (max: ${config.maxValue})`,
        };
      }

      return { valid: true };
    },
    [config.minValue, config.maxValue]
  );

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleApply = useCallback(() => {
    const value = parseFloat(inputValue);
    const validation = validateValue(value);

    if (!validation.valid) {
      setError(validation.error || MESSAGES.INVALID_VALUE);
      return;
    }

    setError(null);

    if (mode === 'DISTANCE') {
      const params = createCADSegmentParams(
        value,
        selectedVertexIndices[1],
        selectedVertexIndices[0]
      );
      const result = setCadSegment(params);

      if (!result.success) {
        setError(result.error || 'Error al aplicar distancia');
      }
    } else if (mode === 'ANGLE') {
      const result = setCadAngle(value);

      if (!result.success) {
        setError(result.error || 'Error al aplicar ángulo');
      }
    }
  }, [
    inputValue,
    mode,
    selectedVertexIndices,
    setCadSegment,
    setCadAngle,
    validateValue,
  ]);

  const handleSwap = useCallback(() => {
    const result = swapCadSelection();
    if (!result.success) {
      setError(result.error || 'Error al cambiar dirección');
    }
  }, [swapCadSelection]);

  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
    setError(null);
  }, []);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  if (!showControl) return null;

  return (
    <div
      className={`
        p-3 rounded-lg mb-3 border-l-4 shadow-lg bg-neutral-800
        ${config.borderColor}
        transition-all duration-200
      `}
      role="group"
      aria-label={`Control CAD - ${config.label}`}
    >
      {/* Header */}
      <ModeHeader
        config={config}
        showSwapButton={showSwapButton}
        onSwap={handleSwap}
      />

      {/* Input Control */}
      <InputControl
        value={inputValue}
        onChange={handleInputChange}
        onApply={handleApply}
        placeholder={`0${config.unit}`}
      />

      {/* Error Message */}
      {error && (
        <div className="mt-2 text-xs text-red-400 animate-in fade-in duration-200">
          {error}
        </div>
      )}

      {/* Info Display */}
      <div className="mt-2 text-xs text-neutral-400">
        {mode === 'DISTANCE' && (
          <span>
            Vértices: {selectedVertexIndices[0]} → {selectedVertexIndices[1]}
          </span>
        )}
        {mode === 'ANGLE' && (
          <span>
            Ref: {selectedVertexIndices[0]} | Pivot: {selectedVertexIndices[1]} | Mov: {selectedVertexIndices[2]}
          </span>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// EXPORTS ADICIONALES
// ============================================================================

export { ModeHeader, InputControl };
export type { CADMode, CADModeConfig };

// --- END OF FILE ---