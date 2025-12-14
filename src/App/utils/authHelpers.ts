// ============================================================================
// AUTH HELPERS
// Extracted from App.tsx (Sprint 5.5 Refactoring)
// ============================================================================

import { supabase } from "@/core/lib/supabase";
import { useAuthStore } from "@/core/stores/auth/useAuthStore";
import { handleError } from "@/core/lib/errorHandler";

/**
 * Performs user logout and clears all auth state
 * @throws {AppError} If logout fails
 */
export const performLogout = async (): Promise<void> => {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) throw error;
    
    useAuthStore.getState().setUser(null);
    useAuthStore.getState().setSession(null);
    localStorage.clear();
    window.location.href = "/";
  } catch (error) {
    // Even if logout fails, clear local state
    useAuthStore.getState().setUser(null);
    useAuthStore.getState().setSession(null);
    localStorage.clear();
    
    // Log error but don't block navigation
    handleError(error, 'authHelpers.performLogout');
    
    // Navigate anyway
    window.location.href = "/";
  }
};