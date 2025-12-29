// --- START OF FILE src/hooks/useSceneTools.ts ---
import { useCallback } from 'react';
import { useEngine } from '@/editor/context/EngineContext';
import { useErrorHandler } from '@/core/hooks/useErrorHandler';
import { AppError, ErrorType, ErrorSeverity } from '@/core/lib/errorHandler';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

interface ToolOperationResult {
  success: boolean;
  error?: string;
}

interface CADSegmentParams {
  length: number;
  indexToMove: number;
  indexAnchor: number;
}

interface SceneToolsActions {
  activateWalkMode: () => ToolOperationResult;
  deactivateWalkMode: () => ToolOperationResult;
  toggleWalkMode: () => ToolOperationResult;
  isWalkModeActive: () => boolean;
  setCadSegment: (params: CADSegmentParams) => ToolOperationResult;
  setCadAngle: (angle: number) => ToolOperationResult;
  swapCadSelection: () => ToolOperationResult;
}


// ============================================================================
// CONSTANTES
// ============================================================================

const ERROR_MESSAGES = {
  ENGINE_UNAVAILABLE: 'Engine no disponible',
  WALK_MANAGER_UNAVAILABLE: 'WalkManager no disponible',
  TOOLS_MANAGER_UNAVAILABLE: 'ToolsManager no disponible',
  INVALID_SEGMENT_PARAMS: 'Parámetros de segmento inválidos',
  INVALID_ANGLE: 'Ángulo inválido',
} as const;

// ============================================================================
// HOOK useSceneTools
// ============================================================================

export const useSceneTools = (): SceneToolsActions => {
  const engine = useEngine();
  const { handleError } = useErrorHandler({ context: 'useSceneTools' });

  // ==========================================================================
  // HELPERS PRIVADOS
  // ==========================================================================

  const ensureEngine = (): boolean => {
    if (!engine) {
      handleError(
        new AppError(ErrorType.ENGINE, ERROR_MESSAGES.ENGINE_UNAVAILABLE, {
          severity: ErrorSeverity.MEDIUM,
          userMessage: 'El motor 3D no está disponible',
        }),
        { showToast: false }
      );
      return false;
    }
    return true;
  };

  const ensureWalkManager = (): boolean => {
    if (!ensureEngine()) return false;
    if (!engine!.walkManager) {
      handleError(
        new AppError(ErrorType.ENGINE, ERROR_MESSAGES.WALK_MANAGER_UNAVAILABLE, {
          severity: ErrorSeverity.MEDIUM,
          userMessage: 'El modo paseo no está disponible',
        }),
        { showToast: false }
      );
      return false;
    }
    return true;
  };

  const ensureToolsManager = (): boolean => {
    if (!ensureEngine()) return false;
    if (!engine!.toolsManager) {
      handleError(
        new AppError(ErrorType.ENGINE, ERROR_MESSAGES.TOOLS_MANAGER_UNAVAILABLE, {
          severity: ErrorSeverity.MEDIUM,
          userMessage: 'Las herramientas no están disponibles',
        }),
        { showToast: false }
      );
      return false;
    }
    return true;
  };

  const createErrorResult = (error: string): ToolOperationResult => {
    return { success: false, error };
  };

  const createSuccessResult = (): ToolOperationResult => {
    return { success: true };
  };

  // ==========================================================================
  // MODO PASEO (WALK MODE)
  // ==========================================================================

  /**
   * Activa el modo paseo (primera persona)
   */
  const activateWalkMode = useCallback((): ToolOperationResult => {
    if (!ensureWalkManager()) {
      return createErrorResult(ERROR_MESSAGES.WALK_MANAGER_UNAVAILABLE);
    }

    try {
      engine!.walkManager.enable();
      return createSuccessResult();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      handleError(
        new AppError(ErrorType.ENGINE, 'Error al activar modo paseo', {
          severity: ErrorSeverity.MEDIUM,
          userMessage: 'No se pudo activar el modo paseo',
          metadata: { originalError: errorMessage },
        }),
        { showToast: false }
      );
      return createErrorResult(errorMessage);
    }
  }, [engine]);

  /**
   * Desactiva el modo paseo
   */
  const deactivateWalkMode = useCallback((): ToolOperationResult => {
    if (!ensureWalkManager()) {
      return createErrorResult(ERROR_MESSAGES.WALK_MANAGER_UNAVAILABLE);
    }

    try {
      engine!.walkManager.disable();
      return createSuccessResult();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      handleError(
        new AppError(ErrorType.ENGINE, 'Error al desactivar modo paseo', {
          severity: ErrorSeverity.MEDIUM,
          userMessage: 'No se pudo desactivar el modo paseo',
          metadata: { originalError: errorMessage },
        }),
        { showToast: false }
      );
      return createErrorResult(errorMessage);
    }
  }, [engine]);

  /**
   * Alterna el estado del modo paseo
   */
  const toggleWalkMode = useCallback((): ToolOperationResult => {
    if (!ensureWalkManager()) {
      return createErrorResult(ERROR_MESSAGES.WALK_MANAGER_UNAVAILABLE);
    }

    try {
      const isActive = engine!.walkManager.isEnabled;
      if (isActive) {
        engine!.walkManager.disable();
      } else {
        engine!.walkManager.enable();
      }
      return createSuccessResult();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      handleError(
        new AppError(ErrorType.ENGINE, 'Error al alternar modo paseo', {
          severity: ErrorSeverity.MEDIUM,
          userMessage: 'No se pudo alternar el modo paseo',
          metadata: { originalError: errorMessage },
        }),
        { showToast: false }
      );
      return createErrorResult(errorMessage);
    }
  }, [engine]);

  /**
   * Verifica si el modo paseo está activo
   */
  const isWalkModeActive = useCallback((): boolean => {
    if (!ensureWalkManager()) return false;
    return engine!.walkManager.isEnabled;
  }, [engine]);

  // ==========================================================================
  // HERRAMIENTAS CAD
  // ==========================================================================

  /**
   * Establece la longitud de un segmento CAD
   */
  const setCadSegment = useCallback(
    (params: CADSegmentParams): ToolOperationResult => {
      if (!ensureToolsManager()) {
        return createErrorResult(ERROR_MESSAGES.TOOLS_MANAGER_UNAVAILABLE);
      }

      // Validar parámetros
      const { length, indexToMove, indexAnchor } = params;
      
      if (
        typeof length !== 'number' ||
        typeof indexToMove !== 'number' ||
        typeof indexAnchor !== 'number' ||
        length <= 0 ||
        indexToMove < 0 ||
        indexAnchor < 0 ||
        indexToMove === indexAnchor
      ) {
        handleError(
          new AppError(ErrorType.VALIDATION, ERROR_MESSAGES.INVALID_SEGMENT_PARAMS, {
            severity: ErrorSeverity.LOW,
            userMessage: 'Parámetros de segmento inválidos',
            metadata: { params },
          }),
          { showToast: false }
        );
        return createErrorResult(ERROR_MESSAGES.INVALID_SEGMENT_PARAMS);
      }

      try {
        engine!.toolsManager.setSegmentLength(length, indexToMove, indexAnchor);
        return createSuccessResult();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        handleError(
          new AppError(ErrorType.ENGINE, 'Error al establecer segmento CAD', {
            severity: ErrorSeverity.MEDIUM,
            userMessage: 'No se pudo establecer el segmento',
            metadata: { originalError: errorMessage },
          }),
          { showToast: false }
        );
        return createErrorResult(errorMessage);
      }
    },
    [engine, handleError]
  );

  /**
   * Establece el ángulo de un vértice CAD
   */
  const setCadAngle = useCallback(
    (angle: number): ToolOperationResult => {
      if (!ensureToolsManager()) {
        return createErrorResult(ERROR_MESSAGES.TOOLS_MANAGER_UNAVAILABLE);
      }

      // Validar ángulo
      if (typeof angle !== 'number' || !isFinite(angle)) {
        handleError(
          new AppError(ErrorType.VALIDATION, ERROR_MESSAGES.INVALID_ANGLE, {
            severity: ErrorSeverity.LOW,
            userMessage: 'Ángulo inválido',
            metadata: { angle },
          }),
          { showToast: false }
        );
        return createErrorResult(ERROR_MESSAGES.INVALID_ANGLE);
      }

      try {
        engine!.toolsManager.setVertexAngle(angle);
        return createSuccessResult();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        handleError(
          new AppError(ErrorType.ENGINE, 'Error al establecer ángulo CAD', {
            severity: ErrorSeverity.MEDIUM,
            userMessage: 'No se pudo establecer el ángulo',
            metadata: { originalError: errorMessage },
          }),
          { showToast: false }
        );
        return createErrorResult(errorMessage);
      }
    },
    [engine, handleError]
  );

  /**
   * Intercambia el orden de selección en CAD
   */
  const swapCadSelection = useCallback((): ToolOperationResult => {
    if (!ensureToolsManager()) {
      return createErrorResult(ERROR_MESSAGES.TOOLS_MANAGER_UNAVAILABLE);
    }

    try {
      engine!.toolsManager.swapSelectionOrder();
      return createSuccessResult();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      handleError(
        new AppError(ErrorType.ENGINE, 'Error al intercambiar selección CAD', {
          severity: ErrorSeverity.MEDIUM,
          userMessage: 'No se pudo intercambiar la selección',
          metadata: { originalError: errorMessage },
        }),
        { showToast: false }
      );
      return createErrorResult(errorMessage);
    }
  }, [engine]);

  // ==========================================================================
  // RETORNO DEL HOOK
  // ==========================================================================

  return {
    // Walk Mode
    activateWalkMode,
    deactivateWalkMode,
    toggleWalkMode,
    isWalkModeActive,

    // CAD Tools
    setCadSegment,
    setCadAngle,
    swapCadSelection,
  };
};

// ============================================================================
// UTILIDADES ADICIONALES
// ============================================================================

/**
 * Hook simplificado para modo paseo únicamente
 */
export const useWalkMode = () => {
  const {
    activateWalkMode,
    deactivateWalkMode,
    toggleWalkMode,
    isWalkModeActive,
  } = useSceneTools();

  return {
    activate: activateWalkMode,
    deactivate: deactivateWalkMode,
    toggle: toggleWalkMode,
    isActive: isWalkModeActive,
  };
};

/**
 * Hook simplificado para herramientas CAD únicamente
 */
export const useCADTools = () => {
  const { setCadSegment, setCadAngle, swapCadSelection } = useSceneTools();

  return {
    setSegment: setCadSegment,
    setAngle: setCadAngle,
    swapSelection: swapCadSelection,
  };
};

/**
 * Helper para crear parámetros de segmento CAD de forma segura
 */
export const createCADSegmentParams = (
  length: number,
  indexToMove: number,
  indexAnchor: number
): CADSegmentParams => {
  return {
    length,
    indexToMove,
    indexAnchor,
  };
};

// --- END OF FILE ---