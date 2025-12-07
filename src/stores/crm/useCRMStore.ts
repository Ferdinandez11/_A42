import { create } from "zustand";

/**
 * Client information
 */
interface Client {
  id: string;
  name: string;
  phone?: string;
  email?: string;
}

/**
 * CRM store state
 */
interface CRMState {
  clients: Client[];
  selectedClient: Client | null;

  setClients: (clients: Client[]) => void;
  selectClient: (client: Client | null) => void;
}

/**
 * Zustand store for CRM (Customer Relationship Management)
 * Manages client list and selection
 */
export const useCRMStore = create<CRMState>((set) => ({
  clients: [],
  selectedClient: null,

  setClients: (clients) => set({ clients }),
  selectClient: (client) => set({ selectedClient: client }),
}));