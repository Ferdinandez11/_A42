import { create } from "zustand";

interface ProjectState {
  // Identificación
  projectId: string | null;
  projectName: string;

  // Metadata opcional
  thumbnailUrl?: string | null;
  totalPrice?: number | null;

  // Modo de acceso
  isReadOnly: boolean;

  // === ACTIONS ===
  setProjectInfo: (id: string | null, name: string) => void;
  setProjectName: (name: string) => void;
  setThumbnail: (url: string | null) => void;
  setTotalPrice: (price: number) => void;

  setReadOnly: (state: boolean) => void;

  clearProject: () => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  // === DEFAULT STATE ===
  projectId: null,
  projectName: "",
  thumbnailUrl: null,
  totalPrice: null,
  isReadOnly: false,

  // === ACTIONS ===
  setProjectInfo: (id, name) =>
    set({
      projectId: id,
      projectName: name,
    }),

  setProjectName: (name) => set({ projectName: name }),

  setThumbnail: (url) => set({ thumbnailUrl: url }),

  setTotalPrice: (price) => set({ totalPrice: price }),

  setReadOnly: (state) => set({ isReadOnly: state }),

  clearProject: () =>
    set({
      projectId: null,
      projectName: "",
      thumbnailUrl: null,
      totalPrice: null,
      isReadOnly: false,
    }),
}));
