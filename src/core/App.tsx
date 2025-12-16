// ============================================================================
// APP ROOT
// Main application component with routing configuration
// Refactored: Sprint 5.5 - Components extracted to App/ folder
// ============================================================================

import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Layouts (cargados de forma normal, son ligeros)
import { EmployeeLayout } from "@/App/layouts/EmployeeLayout";
import { ClientPortalLayout } from "@/App/layouts/ClientPortalLayout";

// Pages ligeras (cargadas de forma normal)
import { LoginPage } from "@/App/pages/LoginPage";

// ============================================================================
// LAZY LOADING: Rutas pesadas (Editor 3D, CRM, Admin)
// ============================================================================

// ViewerPage contiene Editor3D (Three.js, WebGL) - muy pesado
const ViewerPage = lazy(() => import("@/App/pages/ViewerPage").then(module => ({ default: module.ViewerPage })));

// CRM Admin Pages (carga de datos, tablas complejas)
const CrmDashboard = lazy(() => import("@/crm/admin/pages/CrmDashboard").then(module => ({ default: module.CrmDashboard })));
const AdminOrderDetailPage = lazy(() => import("@/crm/admin/pages/AdminOrderDetailPage").then(module => ({ default: module.AdminOrderDetailPage })));
const AdminClientDetailPage = lazy(() => import("@/crm/admin/pages/AdminClientDetailPage").then(module => ({ default: module.AdminClientDetailPage })));
const AdminCalendarPage = lazy(() => import("@/crm/admin/pages/AdminCalendarPage").then(module => ({ default: module.AdminCalendarPage })));
const BudgetDetailPage = lazy(() => import("@/crm/admin/components/BudgetDetailPage").then(module => ({ default: module.BudgetDetailPage })));

// CRM Client Pages
const ClientDashboard = lazy(() => import("@/crm/client/pages/ClientDashboard").then(module => ({ default: module.ClientDashboard })));
const ProfilePage = lazy(() => import("@/crm/client/pages/ProfilePage").then(module => ({ default: module.ProfilePage })));
const ClientCalendarPage = lazy(() => import("@/crm/client/pages/ClientCalendarPage").then(module => ({ default: module.ClientCalendarPage })));

// ============================================================================
// COMPONENTE DE LOADING
// ============================================================================

const LoadingFallback: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen bg-neutral-950">
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p className="text-neutral-400 text-sm">Cargando...</p>
    </div>
  </div>
);

/**
 * App Root Component
 * Main routing configuration for the application
 * 
 * Performance: Rutas pesadas cargadas con lazy loading para mejorar
 * el tiempo de carga inicial de la aplicación.
 */
const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<ViewerPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Employee/Admin Routes */}
          <Route path="/admin" element={<EmployeeLayout />}>
            <Route index element={<CrmDashboard />} />
            <Route path="crm" element={<CrmDashboard />} />
            <Route path="order/:id" element={<AdminOrderDetailPage />} />
            <Route path="client/:id" element={<AdminClientDetailPage />} />
            <Route path="calendar" element={<AdminCalendarPage />} />
          </Route>

          {/* Client Portal Routes */}
          <Route path="/portal" element={<ClientPortalLayout />}>
            <Route index element={<ClientDashboard />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="calendar" element={<ClientCalendarPage />} />
            <Route path="order/:id" element={<BudgetDetailPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default App;