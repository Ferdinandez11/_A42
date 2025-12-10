// ============================================================================
// APP ROOT
// Main application component with routing configuration
// Refactored: Sprint 5.5 - Components extracted to App/ folder
// ============================================================================

import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Layouts
import { EmployeeLayout } from "@/App/layouts/EmployeeLayout";
import { ClientPortalLayout } from "@/App/layouts/ClientPortalLayout";

// Pages
import { LoginPage } from "@/App/pages/LoginPage";
import { ViewerPage } from "@/App/pages/ViewerPage";

// CRM Pages
import { CrmDashboard } from "./features/crm/pages/CrmDashboard";
import { ClientDashboard } from "./features/crm/pages/ClientDashboard";
import { ProfilePage } from "./features/crm/pages/ProfilePage";
import { BudgetDetailPage } from "./features/crm/pages/BudgetDetailPage";
import { AdminOrderDetailPage } from "./features/crm/pages/AdminOrderDetailPage";
import { AdminClientDetailPage } from "./features/crm/pages/AdminClientDetailPage";
import { AdminCalendarPage } from "./features/crm/pages/AdminCalendarPage";

/**
 * App Root Component
 * Main routing configuration for the application
 */
const App: React.FC = () => {
  return (
    <BrowserRouter>
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
          <Route path="order/:id" element={<BudgetDetailPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;