// ============================================================================
// CORE MODULE - PUBLIC API
// Exports infrastructure, shared utilities, and global state
// ============================================================================

// Library utilities
export { supabase } from './lib/supabase'
export { ErrorHandler } from './lib/errorHandler'

// Hooks
export { useErrorHandler } from './hooks/useErrorHandler'

// Services
export { catalogService } from './services/catalogService'

// Stores
export { useAuthStore } from './stores/auth/useAuthStore'
export { useUIStore } from './stores/ui/useUIStore'
export { useUserStore } from './stores/user/useUserStore'

// Main App component (for re-exports if needed)
export { default as App } from './App'

// Types re-export from domain for convenience
export type {
  ProductDefinition,
  CatalogProduct,
  PlaceableProduct,
  ProductBase,
  ProductType,
  ProductLine,
  ProductCategory,
  ExtendedProduct,
  ProductFilter,
  CatalogStructure,
  ProductSortBy,
  CatalogStats,
} from '@/domain/types/catalog'

export type {
  EditorMode,
  Tool,
  ViewMode,
} from '@/domain/types/editor'