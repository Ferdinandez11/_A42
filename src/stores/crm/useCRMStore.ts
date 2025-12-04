import { create } from 'zustand';

interface Client {
  id: string;
  name: string;
  phone?: string;
  email?: string;
}

interface CRMState {
  clients: Client[];
  selectedClient: Client | null;

  setClients: (clients: Client[]) => void;
  selectClient: (client: Client | null) => void;
}

export const useCRMStore = create<CRMState>((set) => ({
  clients: [],
  selectedClient: null,

  setClients: (clients) => set({ clients }),
  selectClient: (client) => set({ selectedClient: client }),
}));
