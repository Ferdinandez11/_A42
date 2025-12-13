// DashboardHeader.tsx
// ✅ Componente extraído de ClientDashboard
import React from 'react';
import { FileText, Plus } from 'lucide-react';

interface DashboardHeaderProps {
  onCreateBudget: () => void;
  onNewProject: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  onCreateBudget,
  onNewProject,
}) => (
  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 pb-6 border-b border-neutral-700">
    <h2 className="text-3xl font-bold text-white">Mi Espacio Personal</h2>
    <div className="flex flex-wrap gap-3">
      <button
        onClick={onCreateBudget}
        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-colors"
      >
        <FileText size={20} />
        Crear Presupuesto Manual
      </button>
      <button
        onClick={onNewProject}
        className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-colors"
      >
        <Plus size={20} />
        Nuevo Proyecto 3D
      </button>
    </div>
  </div>
);

