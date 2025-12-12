import { create } from "zustand";
import { supabase } from "@/core/lib/supabase";
import type { User, Session } from "@supabase/supabase-js";
import { handleError } from '@/core/lib/errorHandler';

/**
 * Authentication store state
 */
interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;

  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  logout: () => Promise<void>;
  clearAuth: () => void;
}

/**
 * Zustand store for authentication state
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: false,

  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),

logout: async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    set({ user: null, session: null });
    localStorage.clear();
  } catch (error) {
    throw handleError(error, 'useAuthStore.logout');
  }
},

clearAuth: () => {
  // Reset de estado
  set({ user: null, session: null });

  // Los tests verifican que esto ocurra
  try {
    localStorage.clear();
  } catch (_) {}
},
}));