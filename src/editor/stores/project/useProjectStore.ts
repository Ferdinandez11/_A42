import { create } from "zustand";
import { supabase } from "@/core/lib/supabase";
import type { User } from "@supabase/supabase-js";

// ✅ IMPORTS DEL SISTEMA DE ERRORES
import { handleError, AppError, ErrorType, ErrorSeverity } from '@/core/lib/errorHandler';
import { logDebug, logInfo, logWarn, logError } from '@/core/lib/logger';

import type { SceneItem, FenceConfig } from "@/domain/types/editor";
import type { SupabaseProjectWithData } from "@/domain/types/supabase";
import { validateProjectData, safeValidateProjectData } from "@/domain/types/editor.schema";
import { useSceneStore } from "@/editor/stores/scene/useSceneStore";
import { useEditorStore } from "@/editor/stores/editor/useEditorStore";

/**
 * Project store state
 */
interface ProjectState {
  user: User | null;
  currentProjectId: string | null;
  currentProjectName: string | null;
  currentProjectShareToken: string | null;
  isReadOnlyMode: boolean;

  setUser: (user: User | null) => void;
  setProjectInfo: (id: string | null, name: string | null, shareToken?: string | null) => void;
  resetProject: () => void;
  loadProjectFromURL: (projectId: string, forceReadOnly?: boolean) => Promise<void>;
  loadSharedProjectFromURL: (projectId: string, token: string) => Promise<void>;
}

/**
 * Zustand store for project management
 * Manages project metadata, loading, and read-only state
 */
export const useProjectStore = create<ProjectState>((set) => ({
  user: null,
  currentProjectId: null,
  currentProjectName: null,
  currentProjectShareToken: null,
  isReadOnlyMode: false,

  /**
   * Sets the current user
   */
  setUser: (user) => set({ user }),

  /**
   * Sets project information (ID, name, and optional share token)
   */
  setProjectInfo: (id, name, shareToken = null) =>
    set({
      currentProjectId: id,
      currentProjectName: name,
      currentProjectShareToken: shareToken,
      isReadOnlyMode: false,
    }),

  /**
   * Resets the project to create a new one
   */
  resetProject: () => {
    try {
      useSceneStore.getState().resetScene();

      set({
        currentProjectId: null,
        currentProjectName: null,
        currentProjectShareToken: null,
        isReadOnlyMode: false,
      });
    } catch (error) {
      handleError(error, 'useProjectStore.resetProject');
    }
  },

  /**
   * Loads a project from the database by ID
   * @param projectId - The project ID to load
   * @param forceReadOnly - Force read-only mode (from URL parameter mode=readonly)
   */
  loadProjectFromURL: async (projectId: string, forceReadOnly?: boolean) => {
    try {
      // Check if project has associated orders (presupuestos/pedidos)
      // If it has, the project must be frozen (read-only mode)
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("id")
        .eq("project_id", projectId);

      if (ordersError) throw ordersError;

      const hasAssociatedOrders = (ordersData?.length ?? 0) > 0;
      const shouldBeReadOnly = Boolean(forceReadOnly) || hasAssociatedOrders;

      const { data: project, error } = await supabase
        .from("projects")
        .select("id, name, data, share_token")
        .eq("id", projectId)
        .single();

      if (error) throw error;

      if (!project) {
        throw new AppError(
          ErrorType.NOT_FOUND,
          'Project not found',
          { 
            userMessage: 'Proyecto no encontrado',
            severity: ErrorSeverity.MEDIUM
          }
        );
      }

      // Validate project data using Zod schema
      let validatedData;
      try {
        validatedData = validateProjectData(project.data);
      } catch (validationError) {
        logWarn("Invalid project data format, using defaults", { 
          context: 'useProjectStore.loadProjectFromURL', 
          meta: { projectId, error: validationError } 
        });
        // Use safe validation as fallback
        validatedData = safeValidateProjectData(project.data) || validateProjectData({});
      }

      // Extract validated items
      const items: SceneItem[] = validatedData.items || [];

      // Extract validated fence configuration
      const fenceConfig: FenceConfig = validatedData.fenceConfig || {
        presetId: "wood",
        colors: { post: 0, slatA: 0 },
      };

      // Calculate total price
      const totalPrice = items.reduce((sum, item) => sum + (item.price || 0), 0);

      // Update scene store
      useSceneStore.setState({
        items,
        fenceConfig,
        totalPrice,
      });

      // Update editor store
      useEditorStore.setState({
        cameraType: validatedData.camera || "perspective",
      });

      // Update project store
      // Project is read-only if: forced by URL parameter OR has associated orders (presupuestos)
      const projectData = project as SupabaseProjectWithData;
      set({
        currentProjectId: project.id,
        currentProjectName: project.name,
        currentProjectShareToken: projectData.share_token ? String(projectData.share_token) : null,
        isReadOnlyMode: shouldBeReadOnly,
      });
    } catch (error) {
      // Re-throw for component to handle with useErrorHandler
      throw handleError(error, 'useProjectStore.loadProjectFromURL');
    }
  },

  /**
   * Loads a shared project (public/QR) using a share token.
   * Requires an RPC on Supabase: get_shared_project(project_id, token)
   * Always forces read-only mode.
   */
  loadSharedProjectFromURL: async (projectId: string, token: string) => {
    try {
      // Validate inputs
      if (!projectId || !token) {
        throw new AppError(ErrorType.VALIDATION, "Missing project ID or token", {
          userMessage: "Enlace inválido o expirado",
          severity: ErrorSeverity.MEDIUM,
        });
      }

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(projectId) || !uuidRegex.test(token)) {
        throw new AppError(ErrorType.VALIDATION, "Invalid UUID format", {
          userMessage: "Enlace inválido o expirado",
          severity: ErrorSeverity.MEDIUM,
        });
      }

      logDebug("Calling RPC with", { context: 'useProjectStore.loadSharedProjectFromURL', meta: { projectId, token } });

      // Call RPC - Supabase RPC with RETURNS TABLE returns an array
      // Pass as UUID type (Supabase will handle conversion)
      const { data: project, error } = await supabase.rpc("get_shared_project", {
        project_id: projectId,
        token: token,
      });

      logDebug("RPC response", { context: 'useProjectStore.loadSharedProjectFromURL', meta: { project, error } });

      if (error) {
        logError("RPC error", error, { context: 'useProjectStore.loadSharedProjectFromURL', meta: { projectId, token } });
        throw new AppError(ErrorType.NOT_FOUND, `RPC error: ${error.message}`, {
          userMessage: "Enlace inválido o expirado",
          severity: ErrorSeverity.MEDIUM,
          metadata: { originalError: error, projectId, token },
        });
      }

      // RPC with RETURNS TABLE always returns an array (even if empty)
      // If no rows match, it returns []
      if (!project || (Array.isArray(project) && project.length === 0)) {
        logWarn("No project found", { context: 'useProjectStore.loadSharedProjectFromURL', meta: { projectId, token, project } });
        throw new AppError(ErrorType.NOT_FOUND, "Shared project not found", {
          userMessage: "Enlace inválido o expirado. Verifica que el proyecto tenga el compartir habilitado.",
          severity: ErrorSeverity.MEDIUM,
          metadata: { projectId, token },
        });
      }

      // RPC returns array, get first element
      const projectData = Array.isArray(project) ? project[0] : project;

      if (!projectData || !projectData.id) {
        logWarn("Invalid project data", { context: 'useProjectStore.loadSharedProjectFromURL', meta: { projectData } });
        throw new AppError(ErrorType.NOT_FOUND, "Shared project data invalid", {
          userMessage: "Enlace inválido o expirado",
          severity: ErrorSeverity.MEDIUM,
        });
      }

      // Validate project data using Zod schema
      let validatedData;
      try {
        validatedData = validateProjectData(projectData.data);
      } catch (validationError) {
        logWarn("Invalid shared project data format, using defaults", { 
          context: 'useProjectStore.loadSharedProjectFromURL', 
          meta: { projectId, token, error: validationError } 
        });
        // Use safe validation as fallback
        validatedData = safeValidateProjectData(projectData.data) || validateProjectData({});
      }

      // Extract validated items
      const items: SceneItem[] = validatedData.items || [];
      const fenceConfig: FenceConfig = validatedData.fenceConfig || {
        presetId: "wood",
        colors: { post: 0, slatA: 0 },
      };
      const totalPrice = items.reduce((sum, item) => sum + (item.price || 0), 0);

      useSceneStore.setState({
        items,
        fenceConfig,
        totalPrice,
      });

      useEditorStore.setState({
        cameraType: validatedData.camera || "perspective",
      });

      set({
        currentProjectId: projectData.id ?? projectId,
        currentProjectName: projectData.name ?? null,
        currentProjectShareToken: token,
        isReadOnlyMode: true,
      });
    } catch (error) {
      throw handleError(error, "useProjectStore.loadSharedProjectFromURL");
    }
  },
}));