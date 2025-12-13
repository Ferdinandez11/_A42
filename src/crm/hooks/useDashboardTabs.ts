// useDashboardTabs.ts
// ✅ Hook para gestión de tabs del dashboard
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

export type TabType = 'projects' | 'budgets' | 'orders' | 'archived';

interface UseDashboardTabsReturn {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

/**
 * Hook para gestionar el estado de tabs del dashboard
 * Sincroniza el tab activo con la URL query params
 */
export const useDashboardTabs = (): UseDashboardTabsReturn => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as TabType) || 'projects';
  const [activeTab, setActiveTabState] = useState<TabType>(initialTab);

  // Sincronizar con URL
  useEffect(() => {
    setSearchParams({ tab: activeTab });
  }, [activeTab, setSearchParams]);

  const setActiveTab = useCallback((tab: TabType) => {
    setActiveTabState(tab);
  }, []);

  return {
    activeTab,
    setActiveTab,
  };
};

