// --- START OF FILE src/hooks/useSceneTools.ts ---
import { useCallback } from 'react';
import { useEngine } from '@/editor/context/EngineContext';

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

  // ==========================================================================
  // HELPERS PRIVADOS
  // ==========================================================================

  const ensureEngine = (): boolean => {
    if (!engine) {
      console.error('[useSceneTools]', ERROR_MESSAGES.ENGINE_UNAVAILABLE);
      return false;
    }
    return true;
  };

  const ensureWalkManager = (): boolean => {
    if (!ensureEngine()) return false;
    if (!engine!.walkManager) {
      console.error('[useSceneTools]', ERROR_MESSAGES.WALK_MANAGER_UNAVAILABLE);
      return false;
    }
    return true;
  };

  const ensureToolsManager = (): boolean => {
    if (!ensureEngine()) return false;
    if (!engine!.toolsManager) {
      console.error('[useSceneTools]', ERROR_MESSAGES.TOOLS_MANAGER_UNAVAILABLE);
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
      console.error('[useSceneTools] Error al activar walk mode:', error);
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
      console.error('[useSceneTools] Error al desactivar walk mode:', error);
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
      console.error('[useSceneTools] Error al alternar walk mode:', error);
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
        console.error('[useSceneTools] Parámetros inválidos:', params);
        return createErrorResult(ERROR_MESSAGES.INVALID_SEGMENT_PARAMS);
      }

      try {
        engine!.toolsManager.setSegmentLength(length, indexToMove, indexAnchor);
        return createSuccessResult();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        console.error('[useSceneTools] Error al establecer segmento CAD:', error);
        return createErrorResult(errorMessage);
      }
    },
    [engine]
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
        console.error('[useSceneTools] Ángulo inválido:', angle);
        return createErrorResult(ERROR_MESSAGES.INVALID_ANGLE);
      }

      try {
        engine!.toolsManager.setVertexAngle(angle);
        return createSuccessResult();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        console.error('[useSceneTools] Error al establecer ángulo CAD:', error);
        return createErrorResult(errorMessage);
      }
    },
    [engine]
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
      console.error('[useSceneTools] Error al intercambiar selección CAD:', error);
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