// --- START OF FILE src/hooks/useEditorMedia.ts ---
import { useState, useCallback } from 'react';
import { useEngine } from '@/editor/context/EngineContext';

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

  // ==========================================================================
  // HELPERS PRIVADOS
  // ==========================================================================

  const ensureEngine = (): boolean => {
    if (!engine) {
      console.error('[useEditorMedia] Engine no disponible');
      return false;
    }
    return true;
  };

  const handleError = (operation: string, error: unknown): MediaOperationResult => {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error(`[useEditorMedia] Error en ${operation}:`, errorMessage);
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
      console.error('[useEditorMedia] Error al alternar grabación:', error);
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