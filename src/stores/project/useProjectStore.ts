import { create } from "zustand";
import { supabase } from "@/lib/supabase";

import type { SceneItem, FenceConfig } from "@/types/editor";
import { useEditorStore } from "@/stores/editor/useEditorStore";

interface ProjectState {
  currentProjectId: string | null;
  currentProjectName: string | null;
  isReadOnlyMode: boolean;

  items: SceneItem[];
  totalPrice: number;

  setProjectInfo: (id: string | null, name: string | null) => void;
  resetProject: () => void;

  loadProjectFromURL: (projectId: string) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set) => ({
  currentProjectId: null,
  currentProjectName: null,
  isReadOnlyMode: false,

  items: [],
  totalPrice: 0,

  // -----------------------------------------
  // SET PROJECT INFO (ID + NAME)
  // -----------------------------------------
  setProjectInfo: (id, name) =>
    set({
      currentProjectId: id,
      currentProjectName: name,
      isReadOnlyMode: false,
    }),

  // -----------------------------------------
  // RESET (NUEVO PROYECTO)
  // -----------------------------------------
  resetProject: () =>
    set({
      currentProjectId: null,
      currentProjectName: null,
      items: [],
      totalPrice: 0,
      isReadOnlyMode: false,
    }),

  // -----------------------------------------
  // LOAD PROJECT
  // -----------------------------------------
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

    // --- UPDATE EDITOR STORE ---
    useEditorStore.setState({
      items,
      fenceConfig: fence,
      cameraType: scene.camera || "perspective",
    });

    // --- UPDATE PROJECT STORE ---
    set({
      currentProjectId: project.id,
      currentProjectName: project.name,
      items,
      totalPrice,
      isReadOnlyMode: true,
    });
  },
}));
