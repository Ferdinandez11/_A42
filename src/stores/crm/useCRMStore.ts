import { create } from "zustand";

export interface Client {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  company?: string | null;
  notes?: string | null;
}

interface CRMState {
  clients: Client[];
  selectedClient: Client | null;

  // === ACTIONS ===
  setClients: (clients: Client[]) => void;
  addClient: (client: Client) => void;
  updateClient: (id: string, partial: Partial<Client>) => void;
  removeClient: (id: string) => void;

  selectClient: (client: Client | null) => void;
  clearSelection: () => void;
}

export const useCRMStore = create<CRMState>((set) => ({
  clients: [],
  selectedClient: null,

  // Reemplaza todos los clientes (carga inicial)
  setClients: (clients) => set({ clients }),

  // Agregar cliente
  addClient: (client) =>
    set((s) => ({
      clients: [...s.clients, client],
    })),

  // Actualizar parcial
  updateClient: (id, partial) =>
    set((s) => ({
      clients: s.clients.map((c) =>
        c.id === id ? { ...c, ...partial } : c
      ),
    })),

  // Eliminar
  removeClient: (id) =>
    set((s) => ({
      clients: s.clients.filter((c) => c.id !== id),
    })),

  // Seleccionar cliente
  selectClient: (client) => set({ selectedClient: client }),
  clearSelection: () => set({ selectedClient: null }),
}));
