// ============================================================================
// AUTH HELPERS
// Extracted from App.tsx (Sprint 5.5 Refactoring)
// ============================================================================

import { supabase } from "@/core/lib/supabase";
import { useAuthStore } from "@/core/stores/auth/useAuthStore";

export const performLogout = async (): Promise<void> => {
  await supabase.auth.signOut();
  useAuthStore.getState().setUser(null);
  useAuthStore.getState().setSession(null);
  localStorage.clear();
  window.location.href = "/";
};