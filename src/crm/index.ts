// ============================================================================
// CRM MODULE - PUBLIC API
// Exports admin and client portal components and utilities
// ============================================================================

// Admin Pages
export { default as AdminDashboard } from '@/crm/admin/pages/AdminDashboard'
export { default as AdminClientDetailPage } from './admin/pages/AdminClientDetailPage'
export { default as AdminOrderDetailPage } from './admin/pages/AdminOrderDetailPage'

// Admin Components
export { default as BudgetDetailPage } from './admin/components/BudgetDetailPage'
export { default as ClientsPage } from './admin/components/ClientsPage'
export { default as OrdersPage } from './admin/components/OrdersPage'
export { default as UsersPage } from './admin/components/UsersPage'
export { default as Sidebar } from './admin/components/Sidebar'

// Client Pages
export { default as ClientDashboard } from './client/pages/ClientDashboard'

// Client Components
export { default as BudgetTable } from './client/components/BudgetTable'
export { default as Header } from './client/components/Header'

// Store
export { useCRMStore } from './stores/useCRMStore'

// Utilities (if exported from pages/)
export * from './pages/actions'
export * from './pages/constants'
export * from './pages/types'
export * from './pages/utils'