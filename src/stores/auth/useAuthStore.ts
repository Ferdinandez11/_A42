import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;

  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;

  login: (email: string, password: string) => Promise<{ error: any }>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: false,

  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),

  // === LOGIN (opcional pero profesional) ===
  login: async (email, password) => {
    set({ loading: true });

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    set({
      loading: false,
      user: data?.user ?? null,
      session: data?.session ?? null,
    });

    return { error };
  },

  // === LOGOUT ===
  logout: async () => {
    await supabase.auth.signOut();
    set({
      user: null,
      session: null,
    });
  },
}));
