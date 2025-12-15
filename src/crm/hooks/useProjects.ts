// useProjects.ts
// ✅ Hook para gestión de proyectos del cliente
import { useState, useCallback } from 'react';
import { supabase } from '@/core/lib/supabase';
import { useErrorHandler } from '@/core/hooks/useErrorHandler';
import { AppError, ErrorType, ErrorSeverity } from '@/core/lib/errorHandler';

export interface Project {
  id: string;
  name: string;
  thumbnail_url?: string;
  user_id: string;
  updated_at: string;
  orders?: Array<{ id: string }>;
}

interface UseProjectsReturn {
  projects: Project[];
  loading: boolean;
  fetchProjects: (userId: string) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  refreshProjects: (userId: string) => Promise<void>;
}

/**
 * Hook para gestionar proyectos del cliente
 * Maneja fetching, eliminación y actualización de proyectos
 */
export const useProjects = (): UseProjectsReturn => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const { handleError, showSuccess, showLoading, dismissToast } = useErrorHandler({
    context: 'useProjects',
  });

  const fetchProjects = useCallback(
    async (userId: string) => {
      setLoading(true);
      const loadingToast = showLoading('Cargando proyectos...');

      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*, orders(id)')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false });

        if (error) throw error;

        setProjects(data || []);
        dismissToast(loadingToast);
      } catch (error) {
        dismissToast(loadingToast);
        handleError(error);
      } finally {
        setLoading(false);
      }
    },
    [handleError, showLoading, dismissToast]
  );

  const deleteProject = useCallback(
    async (projectId: string) => {
      const loadingToast = showLoading('Eliminando proyecto...');

      try {
        const { error } = await supabase
          .from('projects')
          .delete()
          .eq('id', projectId);

        if (error) {
          // 409/23503 = violación de FK (hay pedidos/presupuestos enlazados)
          if ((error as any).code === '23503' || String(error.message).includes('foreign key')) {
            handleError(
              new AppError(ErrorType.VALIDATION, 'No se puede eliminar el proyecto', {
                userMessage:
                  'No puedes borrar un proyecto que ya tiene presupuestos o pedidos asociados.',
                severity: ErrorSeverity.LOW,
              })
            );
          } else {
            handleError(error);
          }
          throw error;
        }

        setProjects((prev) => prev.filter((p) => p.id !== projectId));
        dismissToast(loadingToast);
        showSuccess('✅ Proyecto eliminado');
      } catch (error) {
        dismissToast(loadingToast);
        // El error ya fue manejado arriba si era de FK; aquí solo re-lanzamos
        throw error; // Re-throw para que el componente pueda manejar si lo necesita
      }
    },
    [handleError, showSuccess, showLoading, dismissToast]
  );

  const refreshProjects = useCallback(
    async (userId: string) => {
      await fetchProjects(userId);
    },
    [fetchProjects]
  );

  return {
    projects,
    loading,
    fetchProjects,
    deleteProject,
    refreshProjects,
  };
};

