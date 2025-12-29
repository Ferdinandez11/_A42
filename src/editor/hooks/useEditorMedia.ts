// --- START OF FILE src/hooks/useEditorMedia.ts ---
import { useState, useCallback } from 'react';
import { useEngine } from '@/editor/context/EngineContext';
import { useErrorHandler } from '@/core/hooks/useErrorHandler';
import { AppError, ErrorType, ErrorSeverity } from '@/core/lib/errorHandler';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

interface MediaOperationResult {
  success: boolean;
  error?: string;
}

interface EditorMediaActions {
  takePhoto: () => Promise<MediaOperationResult>;
  start360Video: () => Promise<MediaOperationResult>;
  toggleRecording: () => void;
  exportGLB: () => Promise<MediaOperationResult>;
  exportDXF: () => Promise<MediaOperationResult>;
  generatePDF: () => Promise<MediaOperationResult>;
}

interface EditorMediaState {
  isRecording: boolean;
}

interface UseEditorMediaReturn extends EditorMediaActions, EditorMediaState {}

// ============================================================================
// HOOK useEditorMedia
// ============================================================================

export const useEditorMedia = (): UseEditorMediaReturn => {
  const engine = useEngine();
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const { handleError: handleErrorHook } = useErrorHandler({
    context: 'useEditorMedia',
  });

  // ==========================================================================
  // HELPERS PRIVADOS
  // ==========================================================================

  const ensureEngine = (): boolean => {
    if (!engine) {
      handleErrorHook(
        new AppError(ErrorType.ENGINE, 'Engine no disponible', {
          severity: ErrorSeverity.MEDIUM,
          userMessage: 'El motor 3D no está disponible',
        }),
        { showToast: false }
      );
      return false;
    }
    return true;
  };

  const handleError = (operation: string, error: unknown): MediaOperationResult => {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    handleErrorHook(
      new AppError(ErrorType.ENGINE, `Error en ${operation}`, {
        severity: ErrorSeverity.MEDIUM,
        userMessage: `Error al ${operation}`,
        metadata: { operation, originalError: error },
      }),
      { showToast: false }
    );
    return {
      success: false,
      error: errorMessage,
    };
  };

  // ==========================================================================
  // CAPTURA DE MEDIOS
  // ==========================================================================

  /**
   * Captura una foto de la escena actual
   */
  const takePhoto = useCallback(async (): Promise<MediaOperationResult> => {
    if (!ensureEngine()) {
      return { success: false, error: 'Engine no disponible' };
    }

    try {
      await engine!.recorderManager.takeScreenshot();
      return { success: true };
    } catch (error) {
      return handleError('takePhoto', error);
    }
  }, [engine]);

  /**
   * Inicia una animación de video 360°
   */
  const start360Video = useCallback(async (): Promise<MediaOperationResult> => {
    if (!ensureEngine()) {
      return { success: false, error: 'Engine no disponible' };
    }

    try {
      await engine!.recorderManager.startOrbitAnimation();
      return { success: true };
    } catch (error) {
      return handleError('start360Video', error);
    }
  }, [engine]);

  /**
   * Alterna el estado de grabación de video
   */
  const toggleRecording = useCallback((): void => {
    if (!ensureEngine()) return;

    const manager = engine!.recorderManager;

    try {
      if (isRecording) {
        manager.stopRecording();
        setIsRecording(false);
      } else {
        manager.startRecording();
        setIsRecording(true);
      }
    } catch (error) {
      handleErrorHook(
        new AppError(ErrorType.ENGINE, 'Error al alternar grabación', {
          severity: ErrorSeverity.MEDIUM,
          userMessage: 'No se pudo alternar la grabación',
          metadata: { originalError: error },
        })
      );
      // Resetear estado en caso de error
      setIsRecording(false);
    }
  }, [engine, isRecording]);

  // ==========================================================================
  // EXPORTACIÓN DE ARCHIVOS
  // ==========================================================================

  /**
   * Exporta la escena como archivo GLB
   */
  const exportGLB = useCallback(async (): Promise<MediaOperationResult> => {
    if (!ensureEngine()) {
      return { success: false, error: 'Engine no disponible' };
    }

    try {
      await engine!.exportManager.exportGLB();
      return { success: true };
    } catch (error) {
      return handleError('exportGLB', error);
    }
  }, [engine]);

  /**
   * Exporta la escena como archivo DXF
   */
  const exportDXF = useCallback(async (): Promise<MediaOperationResult> => {
    if (!ensureEngine()) {
      return { success: false, error: 'Engine no disponible' };
    }

    try {
      await engine!.exportManager.exportDXF();
      return { success: true };
    } catch (error) {
      return handleError('exportDXF', error);
    }
  }, [engine]);

  /**
   * Genera un documento PDF de la escena
   */
  const generatePDF = useCallback(async (): Promise<MediaOperationResult> => {
    if (!ensureEngine()) {
      return { success: false, error: 'Engine no disponible' };
    }

    try {
      await engine!.pdfManager.generatePDF();
      return { success: true };
    } catch (error) {
      return handleError('generatePDF', error);
    }
  }, [engine]);

  // ==========================================================================
  // RETORNO DEL HOOK
  // ==========================================================================

  return {
    // Estado
    isRecording,

    // Acciones de captura
    takePhoto,
    start360Video,
    toggleRecording,

    // Acciones de exportación
    exportGLB,
    exportDXF,
    generatePDF,
  };
};

// ============================================================================
// UTILIDADES ADICIONALES (OPCIONAL)
// ============================================================================

/**
 * Hook simplificado para operaciones de captura únicamente
 */
export const useMediaCapture = () => {
  const { takePhoto, start360Video, toggleRecording, isRecording } = useEditorMedia();
  
  return {
    takePhoto,
    start360Video,
    toggleRecording,
    isRecording,
  };
};

/**
 * Hook simplificado para operaciones de exportación únicamente
 */
export const useMediaExport = () => {
  const { exportGLB, exportDXF, generatePDF } = useEditorMedia();
  
  return {
    exportGLB,
    exportDXF,
    generatePDF,
  };
};

// --- END OF FILE ---