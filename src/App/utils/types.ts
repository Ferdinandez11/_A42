// ============================================================================
// SHARED TYPES
// Extracted from App.tsx (Sprint 5.5 Refactoring)
// ============================================================================

import type { User } from "@supabase/supabase-js";

export type UserRole = "admin" | "employee" | "client";

export interface ExtendedUser extends User {
  role?: UserRole;
}

export interface Profile {
  role: UserRole;
  is_approved: boolean;
}

export type AuthStep = "selection" | "form";
export type TargetRole = "client" | "employee";