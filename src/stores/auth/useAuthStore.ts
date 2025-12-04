import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

interface AuthState {
  user: any | null;
  session: any | null;
  loading: boolean;

  setUser: (user: any) => void;
  setSession: (session: any) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: false,

  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),

  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null });
  },
}));
