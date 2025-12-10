// ============================================================================
// AUTH HELPERS
// Extracted from App.tsx (Sprint 5.5 Refactoring)
// ============================================================================

import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth/useAuthStore";

export const performLogout = async (): Promise<void> => {
  await supabase.auth.signOut();
  useAuthStore.getState().setUser(null);
  useAuthStore.getState().setSession(null);
  localStorage.clear();
  window.location.href = "/";
};