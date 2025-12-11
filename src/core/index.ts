// ============================================================================
// CORE MODULE - PUBLIC API
// Exports infrastructure, shared utilities, and global state
// ============================================================================

// Library utilities
export { supabase } from './lib/supabase'
// ErrorHandler se exporta como clase, no como named export
export { errorHandler } from './lib/errorHandler'

// Hooks
export { useErrorHandler } from './hooks/useErrorHandler'

// Services - catalogService puede tener export default o named
// Ajustar según cómo esté exportado en el archivo
export * from './services/catalogService'

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
  // Tool y ViewMode no existen en editor.ts, comentarlos
  // Tool,
  // ViewMode,
} from '@/domain/types/editor'