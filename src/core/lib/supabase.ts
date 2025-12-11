import { createClient, SupabaseClient } from '@supabase/supabase-js';

// 🎨 Types
interface SupabaseConfig {
  url: string;
  key: string;
}

// 🎨 Constants
const ENV_KEYS = {
  URL: 'VITE_SUPABASE_URL',
  KEY: 'VITE_SUPABASE_KEY',
} as const;

const ERROR_MESSAGES = {
  MISSING_ENV: 'Faltan las variables de entorno de Supabase en .env',
  MISSING_URL: `Variable de entorno ${ENV_KEYS.URL} no está definida`,
  MISSING_KEY: `Variable de entorno ${ENV_KEYS.KEY} no está definida`,
} as const;

// 🎨 Helper Functions
/**
 * Validates and retrieves Supabase configuration from environment variables
 * @throws {Error} If required environment variables are missing
 * @returns {SupabaseConfig} The validated configuration object
 */
const getSupabaseConfig = (): SupabaseConfig => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_KEY;

  // Validate both variables exist
  if (!url || !key) {
    throw new Error(ERROR_MESSAGES.MISSING_ENV);
  }

  // Validate URL format (optional but recommended)
  if (!url.startsWith('https://')) {
    console.warn('Warning: Supabase URL should start with https://');
  }

  return { url, key };
};

/**
 * Creates and configures the Supabase client instance
 * @param {SupabaseConfig} config - The Supabase configuration
 * @returns {SupabaseClient} The configured Supabase client
 */
const createSupabaseClient = (config: SupabaseConfig): SupabaseClient => {
  return createClient(config.url, config.key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
};

// 🎨 Initialize and Export
let supabaseInstance: SupabaseClient;

try {
  const config = getSupabaseConfig();
  supabaseInstance = createSupabaseClient(config);
} catch (error) {
  // Log error for debugging but allow the module to load
  console.error('Failed to initialize Supabase client:', error);
  throw error;
}

/**
 * Supabase client instance
 * Configured with automatic session management and token refresh
 */
export const supabase = supabaseInstance;

/**
 * Export types for use in other modules
 */
export type { SupabaseClient } from '@supabase/supabase-js';