// CrmDashboard.tsx
// ✅ Refactorizado - Usa hooks y componentes extraídos
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useErrorHandler } from '@/core/hooks/useErrorHandler';

// Hooks
import { useAdminOrders, DashboardTab, OrderStatus } from '@/crm/hooks/useAdminOrders';
import { useClients, NewClientData } from '@/crm/hooks/useClients';

// Componentes
import { CrmTabButton } from '../components/CrmTabButton';
import { AlertIndicator } from '../components/AlertIndicator';
import { PriceCell } from '../components/PriceCell';
import { StatusSelect } from '../components/StatusSelect';
import { CreateClientModal } from '../components/CreateClientModal';

// Utils
import { calculateEstimatedDelivery } from '../utils/orderUtils';

// ============================================================================
// CONSTANTS
// ============================================================================

const EMPTY_CLIENT_DATA: NewClientData = {
  email: '',
  company_name: '',
  full_name: '',
  phone: '',
  discount_rate: 0,
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export const CrmDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<DashboardTab>('budgets');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newClientData, setNewClientData] = useState<NewClientData>(EMPTY_CLIENT_DATA);

  // Hooks
  const { orders, loading: ordersLoading, fetchOrders, updateOrderStatus, deleteOrder } =
    useAdminOrders();
  const {
    clients,
    loading: clientsLoading,
    fetchClients,
    approveClient,
    createClient,
    deleteClient,
  } = useClients();
  const { handleError } = useErrorHandler({ context: 'CrmDashboard' });

  const loading = ordersLoading || clientsLoading;

  // ==========================================================================
  // EFECTOS
  // ==========================================================================

  useEffect(() => {
    if (activeTab === 'clients') {
      fetchClients();
    } else {
      fetchOrders(activeTab);
    }
  }, [activeTab, fetchClients, fetchOrders]);

  // =========================================================================
  // HANDLERS
  // =========================================================================

  const handleApproveClient = async (clientId: string): Promise<void> => {
    try {
      await approveClient(clientId);
  } catch (error) {
      // Error ya manejado en el hook
  }
};

const handleCreateClient = async (): Promise<void> => {
  try {
      await createClient(newClientData);
    setShowCreateModal(false);
    setNewClientData(EMPTY_CLIENT_DATA);
  } catch (error) {
      // Error ya manejado en el hook
  }
};

const handleDeleteClient = async (id: string): Promise<void> => {
  if (!confirm('¿Borrar cliente?')) return;
  try {
      await deleteClient(id);
  } catch (error) {
      // Error ya manejado en el hook
  }
};

const handleDeleteOrder = async (id: string): Promise<void> => {
  if (!confirm('¿Borrar registro?')) return;
    try {
      await deleteOrder(id);
  } catch (error) {
      // Error ya manejado en el hook
  }
};

  const handleStatusUpdate = async (
    id: string,
    newStatus: OrderStatus
  ): Promise<void> => {
  if (!confirm(`¿Cambiar estado a "${newStatus.toUpperCase()}"?`)) return;

  try {
    const deliveryDate = calculateEstimatedDelivery(newStatus);
      await updateOrderStatus(id, newStatus, deliveryDate || undefined);
    } catch (error) {
      // Error ya manejado en el hook
    }
  };

  const handleRefresh = () => {
    if (activeTab === 'clients') {
      fetchClients();
    } else {
      fetchOrders(activeTab);
  }
};

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="text-neutral-200 p-5 font-sans">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 border-b border-neutral-800 pb-4">
        <div>
          <h2 className="text-white text-2xl font-bold m-0">Panel de Control 🟢</h2>
          <small className="text-neutral-500">Vista Administrador</small>
        </div>
        
        <div className="flex gap-2">
          <CrmTabButton
            active={activeTab === 'clients'}
            onClick={() => setActiveTab('clients')}
          >
            👥 Clientes
          </CrmTabButton>
          
          <CrmTabButton
            active={activeTab === 'budgets'}
            onClick={() => setActiveTab('budgets')}
          >
            📄 Presupuestos
          </CrmTabButton>
          
          <CrmTabButton
            active={activeTab === 'orders'}
            onClick={() => setActiveTab('orders')}
          >
            📦 Pedidos
          </CrmTabButton>
          
          <CrmTabButton active={false} onClick={handleRefresh} variant="success">
            🔄
          </CrmTabButton>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <p className="text-center py-8">Cargando...</p>
      ) : (
        <>
          {/* Orders/Budgets Table */}
          {(activeTab === 'budgets' || activeTab === 'orders') && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm bg-neutral-900 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-neutral-800 border-b border-neutral-700">
                    <th className="text-left p-3 text-neutral-500">Aviso</th>
                    <th className="text-left p-3 text-neutral-500">REF</th>
                    <th className="text-left p-3 text-neutral-500">Cliente</th>
                    <th className="text-left p-3 text-neutral-500">Estado</th>
                    <th className="text-left p-3 text-neutral-500">F. Solicitud</th>
                    <th className="text-left p-3 text-neutral-500">F. Entrega Est.</th>
                    <th className="text-left p-3 text-neutral-500 border-l border-neutral-700">
                      Total / Oferta
                    </th>
                    <th className="text-left p-3 text-neutral-500">Acciones</th>
                  </tr>
                </thead>
                
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-b border-neutral-800">
                      <td className="p-3 text-center align-middle">
                        <AlertIndicator order={order} />
                      </td>
                      
                      <td className="p-3 align-middle">
                        <strong>{order.order_ref}</strong>
                        {order.custom_name && (
                          <div className="text-xs text-neutral-500">
                            {order.custom_name}
                          </div>
                        )}
                      </td>
                      
                      <td className="p-3 align-middle text-blue-400">
                        {order.profiles ? (
                          order.profiles.company_name || order.profiles.email
                        ) : (
                          <span className="text-neutral-600">Eliminado</span>
                        )}
                      </td>
                      
                      <td className="p-3 align-middle">
                        <StatusSelect
                          value={order.status}
                          onChange={(status) => handleStatusUpdate(order.id, status)}
                          isBudget={activeTab === 'budgets'}
                        />
                      </td>
                      
                      <td className="p-3 align-middle">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                      
                      <td className="p-3 align-middle">
                        {order.estimated_delivery_date ? (
                          <span
                            className={
                              activeTab === 'orders' ? 'text-orange-500' : 'text-neutral-400'
                            }
                          >
                            {new Date(
                              order.estimated_delivery_date
                            ).toLocaleDateString()}
                          </span>
                        ) : (
                          '--'
                        )}
                      </td>
                      
                      <td className="p-3 align-middle">
                        <PriceCell
                          price={order.total_price || 0}
                          discountRate={order.profiles?.discount_rate || 0}
                        />
                      </td>
                      
                      <td className="p-3 align-middle">
                        <button
                          onClick={() => navigate(`/admin/order/${order.id}`)}
                          className="bg-neutral-800 text-white border border-neutral-600 px-3 py-1 rounded mr-2 hover:bg-neutral-700 transition-colors"
                        >
                          👁️
                        </button>
                        <button
                          onClick={() => handleDeleteOrder(order.id)}
                          className="text-neutral-600 hover:text-red-500 transition-colors"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                  
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-neutral-600">
                        Sin datos.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Clients Table */}
          {activeTab === 'clients' && (
            <div>
              <div className="mb-4 text-right">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg font-bold transition-colors"
                >
                  + Nuevo Cliente
                </button>
              </div>

              <table className="w-full border-collapse text-sm bg-neutral-900 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-neutral-800 border-b border-neutral-700">
                    <th className="text-left p-3 text-neutral-500">Estado</th>
                    <th className="text-left p-3 text-neutral-500">Empresa</th>
                    <th className="text-left p-3 text-neutral-500">Email</th>
                    <th className="text-left p-3 text-neutral-500">Dto.</th>
                    <th className="text-left p-3 text-neutral-500">Acciones</th>
                  </tr>
                </thead>
                
                <tbody>
                  {clients.map((client) => (
                    <tr key={client.id} className="border-b border-neutral-800">
                      <td className="p-3 align-middle">
                        {client.is_approved ? (
                          <span title="Activo">✅</span>
                        ) : (
                          <button
                            onClick={() => handleApproveClient(client.id)}
                            className="bg-orange-500 hover:bg-orange-400 text-white px-2 py-1 rounded text-xs transition-colors"
                          >
                            Aprobar
                          </button>
                        )}
                      </td>
                      
                      <td className="p-3 align-middle font-bold">
                        {client.company_name || '---'}
                      </td>
                      
                      <td className="p-3 align-middle">{client.email}</td>
                      
                      <td className="p-3 align-middle text-green-500 font-bold">
                        {client.discount_rate}%
                      </td>
                      
                      <td className="p-3 align-middle">
                        <button
                          onClick={() => navigate(`/admin/client/${client.id}`)}
                          className="bg-neutral-800 text-white border border-neutral-600 px-3 py-1 rounded mr-2 hover:bg-neutral-700 transition-colors"
                        >
                          Ficha
                        </button>
                        <button
                          onClick={() => handleDeleteClient(client.id)}
                          className="text-red-500 hover:text-red-400 transition-colors"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Create Client Modal */}
      <CreateClientModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setNewClientData(EMPTY_CLIENT_DATA);
        }}
        onSubmit={handleCreateClient}
        data={newClientData}
        onChange={setNewClientData}
      />
    </div>
  );
};
