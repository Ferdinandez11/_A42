// ClientDashboard.tsx
// ✅ Refactorizado - Usa hooks y componentes extraídos
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderOpen } from 'lucide-react';
import { supabase } from '@/core/lib/supabase';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useErrorHandler } from '@/core/hooks/useErrorHandler';
import { AppError, ErrorType, ErrorSeverity } from '@/core/lib/errorHandler';

// Hooks
import { useProjects, Project } from '@/crm/hooks/useProjects';
import { useOrders, Order, TabType } from '@/crm/hooks/useOrders';
import { useDashboardTabs } from '@/crm/hooks/useDashboardTabs';

// Componentes
import { DashboardHeader } from '../components/DashboardHeader';
import { TabNavigation } from '../components/TabNavigation';
import { ProjectCard } from '../components/ProjectCard';
import { OrderTable } from '../components/OrderTable';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

interface ModalState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  isDestructive: boolean;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const MESSAGES = {
  NO_PROJECTS: 'No tienes proyectos pendientes.',
  LOADING: 'Cargando datos...',
  DELETE_PROJECT_TITLE: 'Borrar Proyecto',
  DELETE_PROJECT_MESSAGE: '¿Estás seguro? Esta acción no se puede deshacer.',
  REQUEST_QUOTE_TITLE: 'Solicitar Presupuesto',
  REQUEST_QUOTE_MESSAGE: (name: string) => `¿Quieres enviar "${name}" a revisión?`,
  REACTIVATE_TITLE: 'Reactivar Presupuesto',
  REACTIVATE_MESSAGE: 'El presupuesto volverá a la lista de "Mis Presupuestos".',
} as const;

// ============================================================================
// COMPONENTES AUXILIARES
// ============================================================================

const LoadingState: React.FC = () => (
  <div className="flex items-center justify-center py-12">
    <p className="text-neutral-500 text-lg">{MESSAGES.LOADING}</p>
  </div>
);

const EmptyProjectsState: React.FC = () => (
  <div className="text-center py-12">
    <FolderOpen size={64} className="mx-auto mb-4 text-neutral-600" />
    <p className="text-neutral-500 text-lg">{MESSAGES.NO_PROJECTS}</p>
  </div>
);

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export const ClientDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { handleError, showSuccess, showLoading, dismissToast } = useErrorHandler({
    context: 'ClientDashboard',
  });

  // Hooks
  const { activeTab, setActiveTab } = useDashboardTabs();
  const { projects, loading: projectsLoading, fetchProjects, deleteProject } = useProjects();
  const { orders, loading: ordersLoading, fetchOrders, reactivateOrder } = useOrders();

  const [userId, setUserId] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    isDestructive: false,
  });

  const loading = projectsLoading || ordersLoading;

  // ==========================================================================
  // EFECTOS
  // ==========================================================================

  useEffect(() => {
    const loadUserAndData = async () => {
      try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    
    if (!user) {
          throw new AppError(ErrorType.AUTH, 'No hay sesión activa', {
            severity: ErrorSeverity.MEDIUM,
          });
    }
    
    setUserId(user.id);

    if (activeTab === 'projects') {
          await fetchProjects(user.id);
    } else {
          await fetchOrders(activeTab);
      }
  } catch (error) {
    handleError(error);
    if (error instanceof AppError && error.type === ErrorType.AUTH) {
      navigate('/login');
    }
  }
    };

    loadUserAndData();
  }, [activeTab, fetchProjects, fetchOrders, handleError, navigate]);

  // =========================================================================
  // HANDLERS
  // =========================================================================

  const handleCreateManualBudget = useCallback(async () => {
    const loadingToast = showLoading('Creando presupuesto...');
    
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      
      const ref = 'MAN-' + Math.floor(10000 + Math.random() * 90000);

      const { data, error } = await supabase
        .from('orders')
        .insert([
          {
            user_id: user?.id,
            order_ref: ref,
            status: 'pendiente',
            total_price: 0,
            is_archived: false,
            created_at: new Date().toISOString(),
          },
        ])
        .select();

      if (error) throw error;
      
      dismissToast(loadingToast);
      showSuccess('✅ Presupuesto creado correctamente');
      
      if (data) navigate(`/portal/order/${data[0].id}`);
    } catch (error) {
      dismissToast(loadingToast);
      handleError(error);
    }
  }, [navigate, handleError, showSuccess, showLoading, dismissToast]);

  const handleNewProject = useCallback(() => {
    window.location.href = '/';
  }, []);

  const handleEditProject = useCallback((projectId: string) => {
      window.location.href = `/?project_id=${projectId}`;
  }, []);

  const handleRequestQuote = useCallback(
    (project: Project) => {
      setModal({
        isOpen: true,
        title: MESSAGES.REQUEST_QUOTE_TITLE,
        message: MESSAGES.REQUEST_QUOTE_MESSAGE(project.name),
        isDestructive: false,
        onConfirm: async () => {
          const loadingToast = showLoading('Creando solicitud de presupuesto...');
          
          try {
            const estimatedDate = new Date();
            estimatedDate.setHours(estimatedDate.getHours() + 48);
            const ref = 'SOL-' + Math.floor(10000 + Math.random() * 90000);
            
            const { data, error } = await supabase
              .from('orders')
              .insert([
                {
                  user_id: userId,
                  project_id: project.id,
                  order_ref: ref,
                  total_price: 0,
                  status: 'pendiente',
                  estimated_delivery_date: estimatedDate.toISOString(),
                },
              ])
              .select();

            if (error) throw error;
            
            dismissToast(loadingToast);
            showSuccess('✅ Solicitud de presupuesto enviada');

            if (data) {
              navigate(`/portal/order/${data[0].id}`);
            }
            setModal({ ...modal, isOpen: false });
          } catch (error) {
            dismissToast(loadingToast);
            handleError(error);
            setModal({ ...modal, isOpen: false });
          }
        },
      });
    },
    [userId, navigate, modal, handleError, showSuccess, showLoading, dismissToast]
  );

  const handleDeleteProject = useCallback(
    (id: string) => {
      setModal({
        isOpen: true,
        title: MESSAGES.DELETE_PROJECT_TITLE,
        message: MESSAGES.DELETE_PROJECT_MESSAGE,
        isDestructive: true,
        onConfirm: async () => {
          try {
            await deleteProject(id);
            setModal({ ...modal, isOpen: false });
          } catch (error) {
            setModal({ ...modal, isOpen: false });
          }
        },
      });
    },
    [modal, deleteProject]
  );

  const handleViewOrder = useCallback(
    (orderId: string) => {
      navigate(`/portal/order/${orderId}`);
    },
    [navigate]
  );

  const handleReactivate = useCallback(
    (order: Order) => {
      setModal({
        isOpen: true,
        title: MESSAGES.REACTIVATE_TITLE,
        message: MESSAGES.REACTIVATE_MESSAGE,
        isDestructive: false,
        onConfirm: async () => {
          try {
            await reactivateOrder(order);
            setActiveTab('budgets');
            setModal({ ...modal, isOpen: false });
          } catch (error) {
            setModal({ ...modal, isOpen: false });
          }
        },
      });
    },
    [modal, reactivateOrder, setActiveTab]
  );

  const closeModal = useCallback(() => {
    setModal({ ...modal, isOpen: false });
  }, [modal]);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 p-6">
      <ConfirmModal {...modal} onCancel={closeModal} />

      <div className="max-w-7xl mx-auto">
        <DashboardHeader
          onCreateBudget={handleCreateManualBudget}
          onNewProject={handleNewProject}
        />

        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

        {loading ? (
          <LoadingState />
        ) : (
          <>
            {activeTab === 'projects' && (
              <>
                {projects.length === 0 ? (
                  <EmptyProjectsState />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {projects.map((project) => (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        onEdit={handleEditProject}
                        onRequestQuote={handleRequestQuote}
                        onDelete={handleDeleteProject}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {activeTab !== 'projects' && (
              <OrderTable
                orders={orders}
                activeTab={activeTab}
                onViewOrder={handleViewOrder}
                onReactivate={handleReactivate}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};
