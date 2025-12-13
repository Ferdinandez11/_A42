// TabNavigation.tsx
// ✅ Componente extraído de ClientDashboard
import React, { useMemo } from 'react';
import { FolderOpen, FileText, Package, Archive } from 'lucide-react';

export type TabType = 'projects' | 'budgets' | 'orders' | 'archived';

interface TabConfig {
  id: TabType;
  label: string;
  icon: React.ElementType;
}

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const TAB_CONFIG: TabConfig[] = [
  { id: 'projects', label: 'Mis Proyectos', icon: FolderOpen },
  { id: 'budgets', label: 'Mis Presupuestos', icon: FileText },
  { id: 'orders', label: 'Mis Pedidos', icon: Package },
  { id: 'archived', label: 'Archivados', icon: Archive },
] as const;

export const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  onTabChange,
}) => (
  <div className="flex flex-wrap gap-2 mb-6 border-b border-neutral-700">
    {TAB_CONFIG.map((tab) => {
      const Icon = tab.icon;
      const isActive = activeTab === tab.id;
      return (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`
            flex items-center gap-2 px-6 py-3 font-medium transition-all rounded-t-lg
            ${
              isActive
                ? 'bg-blue-600 text-white border-b-4 border-blue-400'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }
          `}
        >
          <Icon size={18} />
          {tab.label}
        </button>
      );
    })}
  </div>
);

