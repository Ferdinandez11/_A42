// ProjectCard.tsx
// ✅ Componente extraído de ClientDashboard
// ✅ Optimizado - React.memo
import React, { useCallback } from 'react';
import { Edit, ShoppingCart, Trash2, Image as ImageIcon } from 'lucide-react';

export interface Project {
  id: string;
  name: string;
  thumbnail_url?: string;
  user_id: string;
  updated_at: string;
  orders?: Array<{ id: string }>;
}

interface ProjectCardProps {
  project: Project;
  onEdit: (projectId: string) => void;
  onRequestQuote: (project: Project) => void;
  onDelete: (projectId: string) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = React.memo(({
  project,
  onEdit,
  onRequestQuote,
  onDelete,
}) => {
  const handleEdit = useCallback(() => {
    onEdit(project.id);
  }, [project.id, onEdit]);

  const handleRequestQuote = useCallback(() => {
    onRequestQuote(project);
  }, [project, onRequestQuote]);

  const handleDelete = useCallback(() => {
    onDelete(project.id);
  }, [project.id, onDelete]);

  return (
  <div className="bg-neutral-900 border border-neutral-700 rounded-xl hover:border-blue-500 transition-all duration-300 flex flex-col">
    <div
      className={`h-40 bg-neutral-800 flex items-center justify-center text-6xl text-neutral-600 ${
        project.thumbnail_url ? 'bg-cover bg-center bg-no-repeat' : ''
      }`}
      style={
        project.thumbnail_url
          ? ({ backgroundImage: `url(${project.thumbnail_url})` } as React.CSSProperties)
          : undefined
      }
    >
      {!project.thumbnail_url && <ImageIcon size={48} />}
    </div>
    <div className="p-4 flex-1 flex flex-col">
      <h4 className="text-white font-bold mb-4 flex-1">
        {project.name || 'Sin Nombre'}
      </h4>
      <div className="grid grid-cols-3 gap-2 w-full">
        <button
          onClick={handleEdit}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <Edit size={16} />
          Editar
        </button>
        <button
          onClick={handleRequestQuote}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <ShoppingCart size={16} />
          Pedir
        </button>
        <button
          onClick={handleDelete}
          className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
          title="Eliminar proyecto"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.project.id === nextProps.project.id &&
    prevProps.project.name === nextProps.project.name &&
    prevProps.project.thumbnail_url === nextProps.project.thumbnail_url &&
    prevProps.onEdit === nextProps.onEdit &&
    prevProps.onRequestQuote === nextProps.onRequestQuote &&
    prevProps.onDelete === nextProps.onDelete
  );
});

ProjectCard.displayName = 'ProjectCard';

