import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

import type { SceneItem, FenceConfig } from "@/types/editor";
import { useSceneStore } from "@/stores/scene/useSceneStore";
import { useEditorStore } from "@/stores/editor/useEditorStore";

/**
 * Project store state
 */
interface ProjectState {
  user: User | null;
  currentProjectId: string | null;
  currentProjectName: string | null;
  isReadOnlyMode: boolean;

  setUser: (user: User | null) => void;
  setProjectInfo: (id: string | null, name: string | null) => void;
  resetProject: () => void;
  loadProjectFromURL: (projectId: string) => Promise<void>;
}

/**
 * Zustand store for project management
 * Manages project metadata, loading, and read-only state
 */
export const useProjectStore = create<ProjectState>((set) => ({
  user: null,
  currentProjectId: null,
  currentProjectName: null,
  isReadOnlyMode: false,

  /**
   * Sets the current user
   */
  setUser: (user) => set({ user }),

  /**
   * Sets project information (ID and name)
   */
  setProjectInfo: (id, name) =>
    set({
      currentProjectId: id,
      currentProjectName: name,
      isReadOnlyMode: false,
    }),

  /**
   * Resets the project to create a new one
   */
  resetProject: () => {
    useSceneStore.getState().resetScene();

    set({
      currentProjectId: null,
      currentProjectName: null,
      isReadOnlyMode: false,
    });
  },

  /**
   * Loads a project from the database by ID
   * @param projectId - The project ID to load
   */
  loadProjectFromURL: async (projectId: string) => {
    const { data: project, error } = await supabase
      .from("projects")
      .select("id, name, data")
      .eq("id", projectId)
      .single();

    if (error || !project) {
      console.error("❌ Error loading project:", error?.message);
      return;
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
    set({
      currentProjectId: project.id,
      currentProjectName: project.name,
      isReadOnlyMode: true,
    });
  },
}));