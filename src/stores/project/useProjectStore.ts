import { create } from "zustand";
import { supabase } from "@/lib/supabase";

import type { SceneItem, FenceConfig } from "@/types/editor";
import { useSceneStore } from "@/stores/scene/useSceneStore";
import { useEditorStore } from "@/stores/editor/useEditorStore";

interface ProjectState {
  user: any | null;

  currentProjectId: string | null;
  currentProjectName: string | null;
  isReadOnlyMode: boolean;

  setUser: (user: any | null) => void;

  setProjectInfo: (id: string | null, name: string | null) => void;
  resetProject: () => void;

  loadProjectFromURL: (projectId: string) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set) => ({
  user: null,

  currentProjectId: null,
  currentProjectName: null,
  isReadOnlyMode: false,

  // -------------------------------------
  // USER
  // -------------------------------------
  setUser: (user) => set({ user }),

  // -------------------------------------
  // SET PROJECT INFO (ID + NAME)
  // -------------------------------------
  setProjectInfo: (id, name) =>
    set({
      currentProjectId: id,
      currentProjectName: name,
      isReadOnlyMode: false,
    }),

  // -------------------------------------
  // RESET PROJECT (NUEVO PROYECTO)
  // -------------------------------------
  resetProject: () => {
    useSceneStore.getState().resetScene(); // limpiamos escena

    set({
      currentProjectId: null,
      currentProjectName: null,
      isReadOnlyMode: false,
    });
  },

  // -------------------------------------
  // LOAD PROJECT
  // -------------------------------------
  loadProjectFromURL: async (projectId: string) => {
    const { data: project, error } = await supabase
      .from("projects")
      .select("id, name, data")
      .eq("id", projectId)
      .single();

    if (error || !project) {
      console.error("❌ Error al cargar proyecto:", error?.message);
      return;
    }

    const scene = project.data || {};

    // Items
    const items: SceneItem[] = Array.isArray(scene.items)
      ? scene.items
      : [];

    // Fence config
    const fence: FenceConfig =
      scene.fenceConfig || {
        presetId: "wood",
        colors: { post: 0, slatA: 0 },
      };

    // Price calc
    const totalPrice = items.reduce(
      (sum, i) => sum + (i.price || 0),
      0
    );

    // --- UPDATE SCENE STORE ---
    useSceneStore.setState({
      items,
      fenceConfig: fence,
      totalPrice,
    });

    // --- UPDATE EDITOR STORE ---
    useEditorStore.setState({
      cameraType: scene.camera || "perspective",
    });

    // --- UPDATE PROJECT STORE ---
    set({
      currentProjectId: project.id,
      currentProjectName: project.name,
      isReadOnlyMode: true,
    });
  },
}));
