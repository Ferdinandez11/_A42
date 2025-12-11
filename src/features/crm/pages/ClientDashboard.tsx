// --- START OF FILE src/pages/client/ClientDashboard.tsx ---
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FolderOpen,
  FileText,
  Package,
  Archive,
  Plus,
  Edit,
  ShoppingCart,
  Trash2,
  Eye,
  RotateCcw,
  Image as ImageIcon,
} from 'lucide-react';

import { supabase } from '@/core/lib/supabase';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

// ✅ IMPORTS DEL SISTEMA DE ERRORES
import { useErrorHandler } from '@/core/hooks/useErrorHandler';
import { AppError, ErrorType, ErrorSeverity } from '@/core/lib/errorHandler';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

type TabType = 'projects' | 'budgets' | 'orders' | 'archived';

interface Project {
  id: string;
  name: string;
  thumbnail_url?: string;
  user_id: string;
  updated_at: string;
  orders?: Order[];
}

interface Order {
  id: string;
  order_ref: string;
  status: string;
  total_price: number;
  created_at: string;
  estimated_delivery_date?: string;
  is_archived: boolean;
  user_id: string;
  project_id?: string;
  projects?: {
    name: string;
  };
}

interface ModalState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  isDestructive: boolean;
}

interface DashboardHeaderProps {
  onCreateBudget: () => void;
  onNewProject: () => void;
}

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

interface ProjectCardProps {
  project: Project;
  onEdit: (projectId: string) => void;
  onRequestQuote: (project: Project) => void;
  onDelete: (projectId: string) => void;
}

interface OrderTableProps {
  orders: Order[];
  activeTab: TabType;
  onViewOrder: (orderId: string) => void;
  onReactivate: (order: Order) => void;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const TAB_CONFIG = [
  { id: 'projects' as TabType, label: 'Mis Proyectos', icon: FolderOpen },
  { id: 'budgets' as TabType, label: 'Mis Presupuestos', icon: FileText },
  { id: 'orders' as TabType, label: 'Mis Pedidos', icon: Package },
  { id: 'archived' as TabType, label: 'Archivados', icon: Archive },
] as const;

const ORDER_STATUS_CONFIG: Record<
  string,
  { color: string; label: string; bgColor: string }
> = {
  pendiente: {
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    label: 'Pendiente',
  },
  presupuestado: {
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    label: 'Presupuestado',
  },
  pedido: {
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    label: 'Pedido',
  },
  fabricacion: {
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    label: 'Fabricación',
  },
  entregado_parcial: {
    color: 'text-yellow-300',
    bgColor: 'bg-yellow-500/10',
    label: 'Entregado Parcial',
  },
  entregado: {
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    label: 'Entregado',
  },
  completado: {
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    label: 'Completado',
  },
  rechazado: {
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    label: 'Rechazado',
  },
  cancelado: {
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/10',
    label: 'Cancelado',
  },
};

const MESSAGES = {
  NO_PROJECTS: 'No tienes proyectos pendientes.',
  NO_DATA: 'No hay datos en esta sección.',
  LOADING: 'Cargando datos...',
  DELETE_PROJECT_TITLE: 'Borrar Proyecto',
  DELETE_PROJECT_MESSAGE: '¿Estás seguro? Esta acción no se puede deshacer.',
  REQUEST_QUOTE_TITLE: 'Solicitar Presupuesto',
  REQUEST_QUOTE_MESSAGE: (name: string) => `¿Quieres enviar "${name}" a revisión?`,
  REACTIVATE_TITLE: 'Reactivar Presupuesto',
  REACTIVATE_MESSAGE: 'El presupuesto volverá a la lista de "Mis Presupuestos".',
} as const;

// ============================================================================
// COMPONENTES
// ============================================================================

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
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

const TabNavigation: React.FC<TabNavigationProps> = ({
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

const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onEdit,
  onRequestQuote,
  onDelete,
}) => (
  <div className="bg-neutral-900 border border-neutral-700 rounded-xl hover:border-blue-500 transition-all duration-300 flex flex-col">
    <div
      className="h-40 bg-neutral-800 flex items-center justify-center text-6xl text-neutral-600 bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: project.thumbnail_url
          ? `url(${project.thumbnail_url})`
          : 'none',
      }}
    >
      {!project.thumbnail_url && <ImageIcon size={48} />}
    </div>
    <div className="p-4 flex-1 flex flex-col">
      <h4 className="text-white font-bold mb-4 flex-1">
        {project.name || 'Sin Nombre'}
      </h4>
      <div className="flex gap-2">
        <button
          onClick={() => onEdit(project.id)}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <Edit size={16} />
          Editar
        </button>
        <button
          onClick={() => onRequestQuote(project)}
          className="flex-1 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <ShoppingCart size={16} />
          Pedir
        </button>
        <button
          onClick={() => onDelete(project.id)}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center justify-center transition-colors"
          title="Eliminar proyecto"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  </div>
);

const OrderStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const config = useMemo(
    () =>
      ORDER_STATUS_CONFIG[status] || {
        color: 'text-neutral-400',
        bgColor: 'bg-neutral-500/10',
        label: status,
      },
    [status]
  );

  return (
    <span
      className={`${config.color} ${config.bgColor} px-3 py-1 rounded-full text-xs font-bold uppercase`}
    >
      {config.label}
    </span>
  );
};

const OrderTable: React.FC<OrderTableProps> = ({
  orders,
  activeTab,
  onViewOrder,
  onReactivate,
}) => {
  const isOrdersTab = useMemo(() => activeTab === 'orders', [activeTab]);
  const isArchivedTab = useMemo(() => activeTab === 'archived', [activeTab]);

  return (
    <div className="bg-neutral-900 rounded-xl border border-neutral-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-neutral-800">
            <tr>
              <th className="text-left text-neutral-400 text-sm font-medium px-6 py-4">
                Ref
              </th>
              <th className="text-left text-neutral-400 text-sm font-medium px-6 py-4">
                Proyecto
              </th>
              <th className="text-left text-neutral-400 text-sm font-medium px-6 py-4">
                {isOrdersTab ? 'F. Inicio Pedido' : 'F. Solicitud'}
              </th>
              <th className="text-left text-neutral-400 text-sm font-medium px-6 py-4">
                F. Entrega Est.
              </th>
              <th className="text-left text-neutral-400 text-sm font-medium px-6 py-4">
                Estado
              </th>
              <th className="text-left text-neutral-400 text-sm font-medium px-6 py-4">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-700">
            {orders.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-12 text-center text-neutral-500"
                >
                  {MESSAGES.NO_DATA}
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr
                  key={order.id}
                  className="hover:bg-neutral-800 transition-colors"
                >
                  <td className="px-6 py-4">
                    <span className="text-white font-bold">
                      {order.order_ref}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-neutral-300">
                    {order.projects?.name || '---'}
                  </td>
                  <td className="px-6 py-4 text-neutral-300 text-sm">
                    {new Date(order.created_at).toLocaleDateString('es-ES')}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {order.estimated_delivery_date ? (
                      <span className="text-neutral-300">
                        {new Date(
                          order.estimated_delivery_date
                        ).toLocaleDateString('es-ES')}
                      </span>
                    ) : (
                      <span className="text-neutral-600">--</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className="px-6 py-4">
                    {isArchivedTab ? (
                      <button
                        onClick={() => onReactivate(order)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                      >
                        <RotateCcw size={14} />
                        Reactivar
                      </button>
                    ) : (
                      <button
                        onClick={() => onViewOrder(order.id)}
                        className="bg-neutral-700 hover:bg-neutral-600 text-white px-4 py-2 rounded-lg text-sm font-medium border border-neutral-600 flex items-center gap-2 transition-colors"
                      >
                        <Eye size={14} />
                        Ver Ficha
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

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
  const [searchParams, setSearchParams] = useSearchParams();

  // ✅ AÑADIR ERROR HANDLER
  const { handleError, showSuccess, showLoading, dismissToast } = useErrorHandler({
    context: 'ClientDashboard'
  });

  const initialTab = (searchParams.get('tab') as TabType) || 'projects';
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [projects, setProjects] = useState<Project[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    isDestructive: false,
  });

  // ==========================================================================
  // EFECTOS
  // ==========================================================================

  useEffect(() => {
    setSearchParams({ tab: activeTab });
  }, [activeTab, setSearchParams]);

const fetchData = useCallback(async () => {
  console.log('🔍 [FETCH] fetchData iniciado');
  console.log('🔍 [FETCH] activeTab:', activeTab);
  
  const loadingToast = showLoading('Cargando datos...');
  
  try {
    console.log('🔍 [FETCH] Obteniendo usuario...');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    console.log('🔍 [FETCH] Usuario obtenido:', user?.id);
    console.log('🔍 [FETCH] Error de usuario:', userError);
    
    if (userError) throw userError;
    
    if (!user) {
      console.log('⚠️ [FETCH] No hay usuario, redirigiendo...');
      throw new AppError(
      ErrorType.AUTH,  // ✅ tipo primero
      'No hay sesión activa',
        { 
          severity: ErrorSeverity.MEDIUM 
        }
      );
    }
    
    console.log('✅ [FETCH] Usuario autenticado:', user.id);
    setUserId(user.id);

    if (activeTab === 'projects') {
      console.log('🔍 [FETCH] Consultando PROJECTS...');
      
      const { data, error } = await supabase
        .from('projects')
        .select('*, orders(id)')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
      
      console.log('📦 [FETCH] Projects data recibida:', data);
      console.log('📦 [FETCH] Projects count:', data?.length);
      console.log('❌ [FETCH] Projects error:', error);
      
      if (error) throw error;
      
      console.log('✅ [FETCH] Seteando projects...');
      setProjects(data || []);
      console.log('✅ [FETCH] Projects seteados');
      
    } else {
      console.log('🔍 [FETCH] Consultando ORDERS para tab:', activeTab);
      
      let query = supabase
        .from('orders')
        .select('*, projects(name)')
        .order('created_at', { ascending: false });

      if (activeTab === 'budgets') {
        query = query
          .eq('is_archived', false)
          .in('status', ['pendiente', 'presupuestado', 'rechazado']);
      } else if (activeTab === 'orders') {
        query = query
          .eq('is_archived', false)
          .in('status', [
            'pedido',
            'fabricacion',
            'entregado_parcial',
            'entregado',
            'completado',
          ]);
      } else if (activeTab === 'archived') {
        query = query.eq('is_archived', true);
      }

      const { data, error } = await query;
      
      console.log('📦 [FETCH] Orders data recibida:', data);
      console.log('📦 [FETCH] Orders count:', data?.length);
      console.log('❌ [FETCH] Orders error:', error);
      
      if (error) throw error;
      
      console.log('✅ [FETCH] Seteando orders...');
      setOrders(data || []);
      console.log('✅ [FETCH] Orders seteados');
    }

    console.log('🏁 [FETCH] dismissToast...');
    dismissToast(loadingToast);
    console.log('🏁 [FETCH] Toast dismissed');
    
  } catch (error) {
    console.error('💥 [FETCH] Error capturado:', error);
    dismissToast(loadingToast);
    handleError(error);
    
    // Si es error de auth, redirigir a login
    if (error instanceof AppError && error.type === ErrorType.AUTH) {
      console.log('🔐 [FETCH] Error de auth, redirigiendo a login');
      navigate('/login');
    }
  } finally {
    console.log('🏁 [FETCH] Finally - setLoading(false)');
    setLoading(false);
    console.log('🏁 [FETCH] fetchData finalizado');
  }
}, [activeTab, navigate, handleError, showLoading, dismissToast]);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

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

  const handleEditProject = useCallback(
    (projectId: string) => {
      window.location.href = `/?project_id=${projectId}`;
    },
    []
  );

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
          const loadingToast = showLoading('Eliminando proyecto...');
          
          try {
            const { error } = await supabase
              .from('projects')
              .delete()
              .eq('id', id);
            
            if (error) throw error;
            
            dismissToast(loadingToast);
            showSuccess('✅ Proyecto eliminado');
            setProjects((p) => p.filter((x) => x.id !== id));
            setModal({ ...modal, isOpen: false });
          } catch (error) {
            dismissToast(loadingToast);
            handleError(error);
            setModal({ ...modal, isOpen: false });
          }
        },
      });
    },
    [modal, handleError, showSuccess, showLoading, dismissToast]
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
          const loadingToast = showLoading('Reactivando presupuesto...');
          
          try {
            const { error } = await supabase
              .from('orders')
              .update({
                is_archived: false,
                status: 'pendiente',
                created_at: new Date().toISOString(),
              })
              .eq('id', order.id);
            
            if (error) throw error;
            
            dismissToast(loadingToast);
            showSuccess('✅ Presupuesto reactivado');
            setActiveTab('budgets');
            setModal({ ...modal, isOpen: false });
          } catch (error) {
            dismissToast(loadingToast);
            handleError(error);
            setModal({ ...modal, isOpen: false });
          }
        },
      });
    },
    [modal, handleError, showSuccess, showLoading, dismissToast]
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

// --- END OF FILE ---