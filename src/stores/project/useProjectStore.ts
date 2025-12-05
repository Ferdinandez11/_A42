// --- FILE: src/stores/project/useProjectStore.ts ---
import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { useSceneStore } from "@/stores/scene/useSceneStore";

interface ProjectState {
  // Identificación
  projectId: string | null;
  projectName: string;

  // Metadata
  thumbnailUrl: string | null;
  totalPrice: number | null;

  // Modo acceso
  isReadOnly: boolean;
  isReadOnlyMode: boolean; // alias UI

  // === ACCIONES ===
  setProjectInfo: (id: string | null, name: string) => void;
  setProjectName: (name: string) => void;
  setThumbnail: (url: string | null) => void;
  setTotalPrice: (price: number) => void;

  setReadOnly: (state: boolean) => void;

  clearProject: () => void;

  // ⭐ Nuevas (para que App.tsx y QRModal funcionen)
  loadProjectFromURL: (projectId: string) => Promise<void>;
  resetProject: () => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  // Estado inicial
  projectId: null,
  projectName: "",
  thumbnailUrl: null,
  totalPrice: null,
  isReadOnly: false,
  isReadOnlyMode: false,

  // ----------------------------------------------------
  // SETTERS
  // ----------------------------------------------------
  setProjectInfo: (id, name) =>
    set({ projectId: id, projectName: name }),

  setProjectName: (name) => set({ projectName: name }),

  setThumbnail: (url) => set({ thumbnailUrl: url }),

  setTotalPrice: (price) => set({ totalPrice: price }),

  setReadOnly: (state) =>
    set({
      isReadOnly: state,
      isReadOnlyMode: state, // mantener compatibilidad UI
    }),

  // ----------------------------------------------------
  // BORRAR TODO
  // ----------------------------------------------------
  clearProject: () =>
    set({
      projectId: null,
      projectName: "",
      thumbnailUrl: null,
      totalPrice: null,
      isReadOnly: false,
      isReadOnlyMode: false,
    }),

  // ----------------------------------------------------
  // CARGAR PROYECTO DESDE URL (?project_id=xxxx)
  // ----------------------------------------------------
  loadProjectFromURL: async (projectId: string) => {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (error || !data) {
      console.error("❌ Error loading project:", error);
      return;
    }

    // Cargar escena
    useSceneStore.getState().setItems(data.data?.items ?? []);

    // Guardar info proyecto
    set({
      projectId,
      projectName: data.name,
      thumbnailUrl: data.thumbnail_url ?? null,
      totalPrice: data.total_price ?? null,
      isReadOnly: true,
      isReadOnlyMode: true,
    });
  },

  // ----------------------------------------------------
  // RESET (usado cuando haces: ?project_id=x&mode=clone)
  // ----------------------------------------------------
  resetProject: () => {
    useSceneStore.getState().clearScene();
    set({
      projectId: null,
      projectName: "Nuevo Proyecto",
      thumbnailUrl: null,
      totalPrice: null,
      isReadOnly: false,
      isReadOnlyMode: false,
    });
  },
}));
