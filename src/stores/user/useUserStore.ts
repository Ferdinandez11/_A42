import { create } from "zustand";
import type { User } from "@supabase/supabase-js";

/**
 * User store state
 */
interface UserState {
  user: User | null;
  setUser: (user: User | null) => void;
}

/**
 * Zustand store for user state
 * Simple store for managing current user information
 */
export const useUserStore = create<UserState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));