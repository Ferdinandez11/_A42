// --- START OF FILE src/hooks/useProjectActions.ts ---
import { useState, useCallback } from 'react';
import { supabase } from '@/core/lib/supabase';
import { useEditorStore } from '@/editor/stores/editor/useEditorStore';
import { useSceneStore } from '@/editor/stores/scene/useSceneStore';
import { useProjectStore } from '@/editor/stores/project/useProjectStore';
import { useEngine } from '@/editor/context/EngineContext';
import { useErrorHandler } from '@/core/hooks/useErrorHandler';
import { AppError, ErrorType, ErrorSeverity } from '@/core/lib/errorHandler';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

interface ProjectData {
  items: any[];
  fenceConfig: any;
  camera: string;
}

interface SaveProjectResult {
  success: boolean;
  projectId?: string;
  projectName?: string;
  error?: string;
}

interface ImportGLBResult {
  success: boolean;
  fileName?: string;
  error?: string;
}

interface ProjectActionsReturn {
  saveProject: () => Promise<SaveProjectResult>;
  importGLB: (event: React.ChangeEvent<HTMLInputElement>) => Promise<ImportGLBResult>;
  isSaving: boolean;
}

interface SaveOperation {
  mode: 'create' | 'update';
  name: string;
  projectId?: string;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const THUMBNAIL_CONFIG = {
  format: 'image/jpeg',
  quality: 0.5,
} as const;

const DEFAULT_PROJECT_NAME = 'Mi Parque Nuevo';
const COPY_SUFFIX = ' (Copia)';

const MESSAGES = {
  READ_ONLY: '⚠️ Modo de Solo Lectura. No puedes sobrescribir este proyecto.',
  LOGIN_REQUIRED: '🔒 Inicia sesión para guardar tu proyecto.',
  ENGINE_UNAVAILABLE: 'Engine no disponible',
  OVERWRITE_CONFIRM: (name: string) => `¿Sobreescribir proyecto "${name}"?`,
  UPDATE_SUCCESS: '✅ Proyecto actualizado correctamente.',
  CREATE_SUCCESS: '💾 Proyecto guardado correctamente.',
  SAVE_ERROR: (error: string) => `❌ Error al guardar: ${error}`,
  IMPORT_ERROR: (error: string) => `❌ Error al importar: ${error}`,
  PROMPT_NAME: 'Nombre del Proyecto:',
  PROMPT_SAVE_AS: 'Guardar como nuevo:',
} as const;

// ============================================================================
// HOOK useProjectActions
// ============================================================================

export const useProjectActions = (): ProjectActionsReturn => {
  const engine = useEngine();
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const { handleError, showSuccess, showError } = useErrorHandler({
    context: 'useProjectActions',
  });

  // Stores
  const { requestInput, cameraType } = useEditorStore();
  const { items, fenceConfig, totalPrice, addItem } = useSceneStore();
  const {
    user,
    currentProjectId,
    currentProjectName,
    isReadOnlyMode,
    setProjectInfo,
  } = useProjectStore();

  // ==========================================================================
  // VALIDACIONES
  // ==========================================================================

  const validateSavePermissions = (): { valid: boolean; error?: string } => {
    // En modo solo lectura, permitimos guardar pero siempre como nuevo proyecto
    // (no bloqueamos, solo indicamos que no se puede sobrescribir)
    if (!user) {
      return { valid: false, error: MESSAGES.LOGIN_REQUIRED };
    }

    if (!engine) {
      return { valid: false, error: MESSAGES.ENGINE_UNAVAILABLE };
    }

    return { valid: true };
  };

  // ==========================================================================
  // GENERACIÓN DE DATOS
  // ==========================================================================

  const generateThumbnail = (): string => {
    if (!engine) throw new Error(MESSAGES.ENGINE_UNAVAILABLE);

    engine.renderer.render(engine.scene, engine.activeCamera);
    return engine.renderer.domElement.toDataURL(
      THUMBNAIL_CONFIG.format,
      THUMBNAIL_CONFIG.quality
    );
  };

  const prepareProjectData = (): ProjectData => {
    return {
      items,
      fenceConfig,
      camera: cameraType,
    };
  };

  // ==========================================================================
  // LÓGICA DE GUARDADO
  // ==========================================================================

  const determineSaveOperation = async (): Promise<SaveOperation | null> => {
    // Si está en modo solo lectura, siempre crear nuevo proyecto (no sobrescribir)
    if (isReadOnlyMode && currentProjectName) {
      const newName = await requestInput(
        MESSAGES.PROMPT_SAVE_AS,
        currentProjectName + COPY_SUFFIX
      );
      if (!newName) return null;

      return {
        mode: 'create',
        name: newName,
      };
    }

    // Proyecto existente (no en modo solo lectura)
    if (currentProjectId && currentProjectName) {
      const shouldOverwrite = confirm(
        MESSAGES.OVERWRITE_CONFIRM(currentProjectName)
      );

      if (shouldOverwrite) {
        return {
          mode: 'update',
          name: currentProjectName,
          projectId: currentProjectId,
        };
      } else {
        const newName = await requestInput(
          MESSAGES.PROMPT_SAVE_AS,
          currentProjectName + COPY_SUFFIX
        );
        if (!newName) return null;

        return {
          mode: 'create',
          name: newName,
        };
      }
    }

    // Proyecto nuevo
    const newName = await requestInput(
      MESSAGES.PROMPT_NAME,
      DEFAULT_PROJECT_NAME
    );
    if (!newName) return null;

    return {
      mode: 'create',
      name: newName,
    };
  };

  const createNewProject = async (
    name: string,
    projectData: ProjectData,
    thumbnailBase64: string
  ): Promise<SaveProjectResult> => {
    if (!user) {
      return { success: false, error: MESSAGES.LOGIN_REQUIRED };
    }

    const { data, error } = await supabase
      .from('projects')
      .insert([
        {
          user_id: user.id,
          name,
          data: projectData,
          thumbnail_url: thumbnailBase64,
          total_price: totalPrice,
          // Enabled share-by-QR by default (requires DB columns: share_enabled/share_token)
          share_enabled: true,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    if (data) {
      setProjectInfo(
        data.id,
        data.name,
        (data as any).share_token ? String((data as any).share_token) : null
      );
    }

    return {
      success: true,
      projectId: data?.id,
      projectName: data?.name,
    };
  };

  const updateExistingProject = async (
    projectId: string,
    name: string,
    projectData: ProjectData,
    thumbnailBase64: string
  ): Promise<SaveProjectResult> => {
    const { error } = await supabase
      .from('projects')
      .update({
        name,
        data: projectData,
        thumbnail_url: thumbnailBase64,
        total_price: totalPrice,
        updated_at: new Date(),
      })
      .eq('id', projectId);

    if (error) throw error;

    return {
      success: true,
      projectId,
      projectName: name,
    };
  };

  // ==========================================================================
  // MÉTODO PRINCIPAL: GUARDAR PROYECTO
  // ==========================================================================

  const saveProject = useCallback(async (): Promise<SaveProjectResult> => {
    // En modo solo lectura no se permite guardar (ni como copia) según contrato de tests
    if (isReadOnlyMode) {
      showError(MESSAGES.READ_ONLY);
      return { success: false, error: MESSAGES.READ_ONLY };
    }

    // Validar permisos
    const validation = validateSavePermissions();
    if (!validation.valid) {
      showError(validation.error || 'Error de validación');
      return { success: false, error: validation.error };
    }

    // Determinar operación (crear o actualizar)
    const operation = await determineSaveOperation();
    if (!operation) {
      return { success: false, error: 'Operación cancelada' };
    }

    setIsSaving(true);

    try {
      // Generar thumbnail y datos
      const thumbnailBase64 = generateThumbnail();
      const projectData = prepareProjectData();

      let result: SaveProjectResult;

      // Ejecutar operación
      if (operation.mode === 'update' && operation.projectId) {
        result = await updateExistingProject(
          operation.projectId,
          operation.name,
          projectData,
          thumbnailBase64
        );
        showSuccess(MESSAGES.UPDATE_SUCCESS);
      } else {
        result = await createNewProject(
          operation.name,
          projectData,
          thumbnailBase64
        );
        showSuccess(MESSAGES.CREATE_SUCCESS);
      }

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      handleError(
        new AppError(ErrorType.INTERNAL, 'Error al guardar proyecto', {
          severity: ErrorSeverity.HIGH,
          userMessage: MESSAGES.SAVE_ERROR(errorMessage),
          metadata: { originalError: error },
        })
      );

      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsSaving(false);
    }
  }, [
    user,
    engine,
    currentProjectId,
    currentProjectName,
    isReadOnlyMode,
    items,
    fenceConfig,
    totalPrice,
    cameraType,
    requestInput,
    setProjectInfo,
    handleError,
    showSuccess,
    showError,
  ]);

  // ==========================================================================
  // MÉTODO: IMPORTAR GLB
  // ==========================================================================

  const importGLB = useCallback(
    async (
      event: React.ChangeEvent<HTMLInputElement>
    ): Promise<ImportGLBResult> => {
      const file = event.target.files?.[0];
      if (!file) {
        return { success: false, error: 'No se seleccionó ningún archivo' };
      }

      try {
        // Crear URL del objeto
        const url = URL.createObjectURL(file);
        const fileName = file.name.replace(/\.(glb|gltf)$/i, '');

        // Crear item modelo
        const newItem = {
          uuid: crypto.randomUUID(),
          productId: 'custom_upload',
          name: fileName,
          price: 0,
          type: 'model',
          modelUrl: url,
          position: [0, 0, 0] as [number, number, number],
          rotation: [0, 0, 0] as [number, number, number],
          scale: [1, 1, 1] as [number, number, number],
        };

        addItem(newItem as any);

        // Limpiar input para permitir importar el mismo archivo nuevamente
        event.target.value = '';

        return {
          success: true,
          fileName,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Error desconocido';
        handleError(
          new AppError(ErrorType.INTERNAL, 'Error al importar GLB', {
            severity: ErrorSeverity.MEDIUM,
            userMessage: MESSAGES.IMPORT_ERROR(errorMessage),
            metadata: { originalError: error },
          })
        );

        return {
          success: false,
          error: errorMessage,
        };
      }
    },
    [addItem]
  );

  // ==========================================================================
  // RETORNO DEL HOOK
  // ==========================================================================

  return {
    saveProject,
    importGLB,
    isSaving,
  };
};

// ============================================================================
// UTILIDADES ADICIONALES
// ============================================================================

/**
 * Hook para validar si el usuario puede guardar proyectos
 */
export const useCanSaveProject = (): boolean => {
  const { user, isReadOnlyMode } = useProjectStore();
  return !isReadOnlyMode && !!user;
};

/**
 * Hook para obtener información del proyecto actual
 */
export const useCurrentProjectInfo = () => {
  const { currentProjectId, currentProjectName, isReadOnlyMode } =
    useProjectStore();

  return {
    projectId: currentProjectId,
    projectName: currentProjectName,
    isReadOnly: isReadOnlyMode,
    hasProject: !!currentProjectId,
  };
};

// --- END OF FILE ---