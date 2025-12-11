import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/core/lib/supabase';
import { useErrorHandler } from '@/core/hooks/useErrorHandler';
import { AppError, ErrorType, ErrorSeverity } from '@/core/lib/errorHandler';

// ============================================================================
// TYPES
// ============================================================================

type DashboardTab = 'clients' | 'budgets' | 'orders';

// Order status workflow
type OrderStatus =
  | 'borrador'
  | 'pendiente'
  | 'presupuestado'
  | 'pedido'
  | 'en_proceso'
  | 'enviado'
  | 'entregado'
  | 'rechazado';

// User profile (minimal definition)
interface Profile {
  id: string;
  email: string;
  company_name?: string;
  discount_rate?: number;
  is_approved?: boolean;
  created_at?: string;
}

// Order (minimal definition)
interface Order {
  id: string;
  order_ref: string;
  status: OrderStatus;
  total_price: number;
  created_at: string;
  estimated_delivery_date?: string;
  custom_name?: string;
  user_id: string;
  profiles?: Profile;
  projects?: { name: string };
  order_messages?: Array<{
    created_at: string;
    profiles?: { role: string };
  }>;
}

interface NewClientData {
  email: string;
  company_name: string;
  full_name: string;
  phone: string;
  discount_rate: number;
}

interface PriceDisplay {
  basePrice: number;
  finalPrice: number;
  discount: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const BUDGET_STATUSES: OrderStatus[] = ['pendiente', 'presupuestado', 'rechazado'];
const ORDER_STATUSES: OrderStatus[] = [
  'pedido',
  'en_proceso',
  'enviado',
  'entregado',
  'rechazado'
];

const EMPTY_CLIENT_DATA: NewClientData = {
  email: '',
  company_name: '',
  full_name: '',
  phone: '',
  discount_rate: 0,
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const formatMoney = (amount: number): string => {
  return amount.toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + ' €';
};

const calculatePriceDisplay = (
  finalPrice: number,
  discountRate: number
): PriceDisplay => {
  const basePrice = discountRate > 0 && finalPrice > 0
    ? finalPrice / (1 - discountRate / 100)
    : finalPrice;

  return {
    basePrice,
    finalPrice,
    discount: discountRate,
  };
};

const calculateEstimatedDelivery = (status: OrderStatus): string | null => {
  const now = new Date();
  
  if (status === 'pedido') {
    // 6 weeks for orders
    const deliveryDate = new Date(now.getTime() + (6 * 7 * 24 * 60 * 60 * 1000));
    return deliveryDate.toISOString();
  }
  
  if (status === 'presupuestado') {
    // 48 hours for quotes
    const deliveryDate = new Date(now.getTime() + (48 * 60 * 60 * 1000));
    return deliveryDate.toISOString();
  }
  
  return null;
};

// ============================================================================
// CUSTOM HOOKS
// ============================================================================

const useCrmData = (activeTab: DashboardTab) => {
  const [loading, setLoading] = useState(false);
  const [dataList, setDataList] = useState<Order[]>([]);
  const [clients, setClients] = useState<Profile[]>([]);
  
  // ✅ AÑADIR
  const { handleError } = useErrorHandler({ context: 'CrmDashboard.loadData' });

  const loadData = async () => {
    setLoading(true);
    
    try {
      if (activeTab === 'clients') {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setClients(data || []);
      } else {
        let query = supabase
          .from('orders')
          .select(`
            *,
            profiles(company_name, email, discount_rate),
            projects(name),
            order_messages(created_at, profiles(role))
          `)
          .order('created_at', { ascending: false });

        if (activeTab === 'budgets') {
          query = query.in('status', BUDGET_STATUSES);
        } else if (activeTab === 'orders') {
          query = query.in('status', ORDER_STATUSES);
        }

        const { data, error } = await query;
        if (error) throw error;
        
        setDataList(data || []);
      }
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  return { loading, dataList, clients, loadData };
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const TabButton: React.FC<{
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'default' | 'success';
}> = ({ active, onClick, children, variant = 'default' }) => (
  <button
    onClick={onClick}
    className={`
      px-5 py-2.5 rounded-lg font-bold transition-colors
      ${active 
        ? 'bg-orange-500 text-white' 
        : variant === 'success'
        ? 'bg-green-600 text-white'
        : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
      }
    `}
  >
    {children}
  </button>
);

const AlertIndicator: React.FC<{ order: Order }> = ({ order }) => {
  const messages = order.order_messages || [];
  const sortedMessages = [...messages].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  if (!sortedMessages[0]) return <span className="text-2xl">⚪</span>;

  const isClientMessage = sortedMessages[0].profiles?.role === 'client';
  
  return (
    <span 
      className="text-2xl" 
      title={isClientMessage ? 'Cliente escribió' : 'Respondido'}
    >
      {isClientMessage ? '🔴' : '🟢'}
    </span>
  );
};

const PriceCell: React.FC<{ price: number; discountRate: number }> = ({ 
  price, 
  discountRate 
}) => {
  const { basePrice, finalPrice, discount } = calculatePriceDisplay(price, discountRate);

  if (discount === 0) {
    return <span className="font-bold">{formatMoney(finalPrice)}</span>;
  }

  return (
    <div className="flex flex-col items-start">
      <span className="line-through text-neutral-600 text-xs">
        Base: {formatMoney(basePrice)}
      </span>
      <span className="text-white font-bold">
        {formatMoney(finalPrice)}
        <span className="text-orange-500 text-xs ml-1">({discount}%)</span>
      </span>
    </div>
  );
};

const StatusSelect: React.FC<{
  value: OrderStatus;
  onChange: (status: OrderStatus) => void;
  isBudget: boolean;
}> = ({ value, onChange, isBudget }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value as OrderStatus)}
    className="bg-neutral-900 text-white border border-neutral-700 px-2 py-1 rounded cursor-pointer max-w-[130px]"
  >
    {isBudget ? (
      <>
        <option value="pendiente">🟠 Pendiente</option>
        <option value="presupuestado">🟣 Presupuestado</option>
        <option value="rechazado">🔴 Rechazado</option>
        <option value="pedido">➡️ A PEDIDO</option>
      </>
    ) : (
      <>
        <option value="pedido">🔵 Pedido</option>
        <option value="en_proceso">🟠 Fabricación</option>
        <option value="enviado">🟢 Enviado</option>
        <option value="entregado">🏁 Completado</option>
      </>
    )}
  </select>
);

const CreateClientModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: NewClientData) => void;
  data: NewClientData;
  onChange: (data: NewClientData) => void;
}> = ({ isOpen, onClose, onSubmit, data, onChange }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999]">
      <div className="bg-neutral-900 p-8 rounded-xl w-[400px] border border-neutral-700">
        <h3 className="text-white text-xl font-bold mb-6">Dar de Alta Cliente</h3>
        
        <div className="space-y-4">
          <input
            type="email"
            placeholder="Email (Obligatorio)"
            className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 text-white rounded-lg"
            value={data.email}
            onChange={(e) => onChange({ ...data, email: e.target.value })}
          />
          
          <input
            type="text"
            placeholder="Nombre Empresa"
            className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 text-white rounded-lg"
            value={data.company_name}
            onChange={(e) => onChange({ ...data, company_name: e.target.value })}
          />
          
          <input
            type="text"
            placeholder="Contacto"
            className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 text-white rounded-lg"
            value={data.full_name}
            onChange={(e) => onChange({ ...data, full_name: e.target.value })}
          />
          
          <input
            type="text"
            placeholder="Teléfono"
            className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 text-white rounded-lg"
            value={data.phone}
            onChange={(e) => onChange({ ...data, phone: e.target.value })}
          />
          
          <input
            type="number"
            placeholder="Descuento %"
            className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 text-white rounded-lg"
            value={data.discount_rate}
            onChange={(e) => onChange({ ...data, discount_rate: parseFloat(e.target.value) })}
          />
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-neutral-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSubmit(data)}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-colors"
          >
            Crear
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const CrmDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<DashboardTab>('budgets');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newClientData, setNewClientData] = useState<NewClientData>(EMPTY_CLIENT_DATA);

  const { loading, dataList, clients, loadData } = useCrmData(activeTab);
  const { handleError, showSuccess, showLoading, dismissToast } = useErrorHandler({
    context: 'CrmDashboard'
  });
  // Handlers
const handleApproveClient = async (clientId: string): Promise<void> => {
  const loadingToast = showLoading('Aprobando cliente...');
  
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ is_approved: true })
      .eq('id', clientId);

    if (error) throw error;
    
    dismissToast(loadingToast);
    showSuccess('✅ Cliente aprobado correctamente');
    loadData();
  } catch (error) {
    dismissToast(loadingToast);
    handleError(error);
  }
};

const handleCreateClient = async (): Promise<void> => {
  if (!newClientData.email) {
    handleError(
      new AppError(
        ErrorType.VALIDATION,
        'Email required',
        { 
          userMessage: 'El email es obligatorio',
          severity: ErrorSeverity.LOW 
        }
      )
    );
    return;
  }

  const loadingToast = showLoading('Creando cliente...');

  try {
    const { error } = await supabase
      .from('pre_clients')
      .insert([newClientData]);

    if (error) throw error;
    
    dismissToast(loadingToast);
    showSuccess(`✅ Cliente ${newClientData.email} creado correctamente`);
    setShowCreateModal(false);
    setNewClientData(EMPTY_CLIENT_DATA);
    loadData();
  } catch (error) {
    dismissToast(loadingToast);
    handleError(error);
  }
};

const handleDeleteClient = async (id: string): Promise<void> => {
  if (!confirm('¿Borrar cliente?')) return;
  
  const loadingToast = showLoading('Eliminando cliente...');
  
  try {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    dismissToast(loadingToast);
    showSuccess('✅ Cliente eliminado');
    loadData();
  } catch (error) {
    dismissToast(loadingToast);
    handleError(error);
  }
};

const handleDeleteOrder = async (id: string): Promise<void> => {
  if (!confirm('¿Borrar registro?')) return;
  
  const loadingToast = showLoading('Eliminando...');
  
  try {
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    dismissToast(loadingToast);
    showSuccess('✅ Registro eliminado');
    loadData();
  } catch (error) {
    dismissToast(loadingToast);
    handleError(error);
  }
};

const handleStatusUpdate = async (id: string, newStatus: OrderStatus): Promise<void> => {
  if (!confirm(`¿Cambiar estado a "${newStatus.toUpperCase()}"?`)) return;

  const loadingToast = showLoading('Actualizando estado...');

  try {
    const updateData: Partial<Order> = { status: newStatus };
    const deliveryDate = calculateEstimatedDelivery(newStatus);
    
    if (deliveryDate) {
      updateData.estimated_delivery_date = deliveryDate;
    }

    const { error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', id);
    
    if (error) throw error;
    
    dismissToast(loadingToast);
    showSuccess('✅ Estado actualizado');
    loadData();
  } catch (error) {
    dismissToast(loadingToast);
    handleError(error);
  }
};

  return (
    <div className="text-neutral-200 p-5 font-sans">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 border-b border-neutral-800 pb-4">
        <div>
          <h2 className="text-white text-2xl font-bold m-0">Panel de Control 🟢</h2>
          <small className="text-neutral-500">Vista Administrador</small>
        </div>
        
        <div className="flex gap-2">
          <TabButton
            active={activeTab === 'clients'}
            onClick={() => setActiveTab('clients')}
          >
            👥 Clientes
          </TabButton>
          
          <TabButton
            active={activeTab === 'budgets'}
            onClick={() => setActiveTab('budgets')}
          >
            📄 Presupuestos
          </TabButton>
          
          <TabButton
            active={activeTab === 'orders'}
            onClick={() => setActiveTab('orders')}
          >
            📦 Pedidos
          </TabButton>
          
          <TabButton
            active={false}
            onClick={loadData}
            variant="success"
          >
            🔄
          </TabButton>
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
                    <th className="text-left p-3 text-neutral-500 border-l border-neutral-700">Total / Oferta</th>
                    <th className="text-left p-3 text-neutral-500">Acciones</th>
                  </tr>
                </thead>
                
                <tbody>
                  {dataList.map((order) => (
                    <tr key={order.id} className="border-b border-neutral-800">
                      <td className="p-3 text-center align-middle">
                        <AlertIndicator order={order} />
                      </td>
                      
                      <td className="p-3 align-middle">
                        <strong>{order.order_ref}</strong>
                        {order.custom_name && (
                          <div className="text-xs text-neutral-500">{order.custom_name}</div>
                        )}
                      </td>
                      
                      <td className="p-3 align-middle text-blue-400">
                        {order.profiles 
                          ? (order.profiles.company_name || order.profiles.email)
                          : <span className="text-neutral-600">Eliminado</span>
                        }
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
                          <span className={activeTab === 'orders' ? 'text-orange-500' : 'text-neutral-400'}>
                            {new Date(order.estimated_delivery_date).toLocaleDateString()}
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
                  
                  {dataList.length === 0 && (
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
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateClient}
        data={newClientData}
        onChange={setNewClientData}
      />
    </div>
  );
};