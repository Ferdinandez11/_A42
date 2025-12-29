// ============================================================================
// SUPABASE RESPONSE TYPES
// TypeScript interfaces for Supabase database responses
// ============================================================================

/**
 * Project data structure stored in Supabase
 * This is a generic type - the actual ProjectData type is defined in editor.ts
 */
export type SupabaseProjectData = {
  items: unknown[];
  fenceConfig: unknown;
  camera: string;
};

/**
 * Base project structure from Supabase projects table
 */
export interface SupabaseProject {
  id: string;
  name: string;
  user_id: string;
  data: SupabaseProjectData | null;
  thumbnail_url: string | null;
  total_price: number | null;
  share_token: string | null;
  share_enabled: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Project response when selecting specific fields (id, name, share_token)
 * Used in create/update operations
 */
export interface SupabaseProjectWithShareToken {
  id: string;
  name: string;
  share_token: string | null;
}

/**
 * Project response when selecting id, name, data, share_token
 * Used when loading a project
 */
export interface SupabaseProjectWithData extends SupabaseProjectWithShareToken {
  data: SupabaseProjectData | null;
}

/**
 * Project response from RPC get_shared_project
 */
export interface SupabaseSharedProject {
  id: string;
  name: string;
  data: SupabaseProjectData | null;
  share_token: string;
}

/**
 * Supabase error structure
 */
export interface SupabaseError {
  code?: string;
  message: string;
  details?: string;
  hint?: string;
}

