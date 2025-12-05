import { create } from "zustand";

export interface UserProfile {
  id: string;
  email: string | null;
  full_name?: string | null;
  company_name?: string | null;
  phone?: string | null;
  role?: string | null;          // 'admin' | 'client' | ...
  discount_rate?: number | null; // para calculadora de precios
  cif?: string | null;
}

interface UserState {
  user: UserProfile | null;

  // === ACTIONS ===
  setUser: (user: UserProfile | null) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,

  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
}));
