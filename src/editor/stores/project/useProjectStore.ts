import { create } from "zustand";
import { supabase } from "@/core/lib/supabase";
import type { User } from "@supabase/supabase-js";

// ✅ IMPORTS DEL SISTEMA DE ERRORES
import { handleError, AppError, ErrorType, ErrorSeverity } from '@/core/lib/errorHandler';

import type { SceneItem, FenceConfig } from "@/domain/types/editor";
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
  setProjectInfo: (
    id: string | null,
    name: string | null,
    shareToken?: string | null
  ) => void;
  resetProject: () => void;
  loadProjectFromURL: (projectId: string) => Promise<void>;
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
   * Sets project information (ID and name)
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
        .select("id, name, data")
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

      const sceneData = project.data || {};

      // Extract items
      const items: SceneItem[] = Array.isArray(sceneData.items)
        ? sceneData.items
        : [];

      // Extract fence configuration
      const fenceConfig: FenceConfig = sceneData.fenceConfig || {
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
        cameraType: sceneData.camera || "perspective",
      });

      // Update project store
      // Project is read-only if: forced by URL parameter OR has associated orders (presupuestos)
      set({
        currentProjectId: project.id,
        currentProjectName: project.name,
        currentProjectShareToken:
          (project as any).share_token ? String((project as any).share_token) : null,
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
      const { data: project, error } = await supabase.rpc("get_shared_project", {
        project_id: projectId,
        token,
      });

      if (error) throw error;

      if (!project) {
        throw new AppError(ErrorType.NOT_FOUND, "Shared project not found", {
          userMessage: "Enlace inválido o expirado",
          severity: ErrorSeverity.MEDIUM,
        });
      }

      const sceneData = (project as any).data || {};

      const items: SceneItem[] = Array.isArray(sceneData.items) ? sceneData.items : [];
      const fenceConfig: FenceConfig = sceneData.fenceConfig || {
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
        cameraType: sceneData.camera || "perspective",
      });

      set({
        currentProjectId: (project as any).id ?? projectId,
        currentProjectName: (project as any).name ?? null,
        currentProjectShareToken: token,
        isReadOnlyMode: true,
      });
    } catch (error) {
      throw handleError(error, "useProjectStore.loadSharedProjectFromURL");
    }
  },
}));