// --- START OF FILE src/pages/admin/AdminClientDetailPage.tsx ---
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Package, Save, ExternalLink } from 'lucide-react';

import { supabase } from '../../../lib/supabase';

// ✅ IMPORTS DEL SISTEMA DE ERRORES
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { AppError, ErrorType, ErrorSeverity } from '@/lib/errorHandler';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

interface ClientProfile {
  id: string;
  email: string;
  company_name?: string;
  full_name?: string;
  phone?: string;
  cif?: string;
  shipping_address?: string;
  billing_address?: string;
  discount_rate?: number;
}

interface Order {
  id: string;
  order_ref: string;
  status: string;
  created_at: string;
  user_id: string;
  projects?: {
    name: string;
  };
}

interface ProfileFormProps {
  profile: ClientProfile;
  onChange: (updates: Partial<ClientProfile>) => void;
  onSave: () => void;
  isSaving?: boolean;
}

interface OrderHistoryProps {
  orders: Order[];
  onViewOrder: (orderId: string) => void;
}

interface OrderCardProps {
  order: Order;
  onView: () => void;
}

interface DiscountSectionProps {
  value: number;
  onChange: (value: number) => void;
}

interface FormFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'email' | 'tel' | 'number';
  placeholder?: string;
  required?: boolean;
}

interface TextAreaFieldProps extends Omit<FormFieldProps, 'type'> {
  rows?: number;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const MESSAGES = {
  LOADING: 'Cargando ficha...',
  NOT_FOUND: 'Cliente no encontrado.',
  BACK_TO_LIST: 'Volver al Listado',
  NO_ORDERS: 'Sin pedidos.',
  CLIENT_CARD_TITLE: 'Ficha Cliente:',
} as const;

const SECTION_TITLES = {
  COMPANY_DATA: 'Datos de Empresa & Facturación',
  ORDER_HISTORY: 'Historial de Pedidos',
  DISCOUNT_LABEL: 'Descuento Comercial Fijo (%)',
  DISCOUNT_HELP: 'Este descuento se aplicará automáticamente al calcular presupuestos.',
} as const;

const FIELD_LABELS = {
  COMPANY_NAME: 'Nombre Empresa',
  CIF: 'CIF / NIF',
  CONTACT_PERSON: 'Persona de Contacto',
  PHONE: 'Teléfono',
  EMAIL: 'Email Principal (CRM)',
  BILLING_ADDRESS: 'Dirección de Facturación',
  SHIPPING_ADDRESS: 'Dirección de Envío',
} as const;

const ORDER_STATUS_CONFIG: Record<string, { bg: string; label: string }> = {
  pedido: { bg: 'bg-blue-500', label: 'PEDIDO' },
  enviado: { bg: 'bg-green-500', label: 'ENVIADO' },
  completado: { bg: 'bg-gray-500', label: 'COMPLETADO' },
} as const;

// ============================================================================
// COMPONENTES DE FORMULARIO
// ============================================================================

const FormField: React.FC<FormFieldProps> = ({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required = false,
}) => (
  <div>
    <label className="block text-neutral-400 mb-2 text-sm font-medium">
      {label}
      {required && <span className="text-red-400 ml-1">*</span>}
    </label>
    <input
      type={type}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className="w-full bg-neutral-800 border border-neutral-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
    />
  </div>
);

const TextAreaField: React.FC<TextAreaFieldProps> = ({
  label,
  value,
  onChange,
  rows = 3,
  placeholder,
  required = false,
}) => (
  <div>
    <label className="block text-neutral-400 mb-2 text-sm font-medium">
      {label}
      {required && <span className="text-red-400 ml-1">*</span>}
    </label>
    <textarea
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      required={required}
      className="w-full bg-neutral-800 border border-neutral-700 text-white px-4 py-2 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
    />
  </div>
);

const DiscountSection: React.FC<DiscountSectionProps> = ({ value, onChange }) => {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = parseFloat(e.target.value) || 0;
      onChange(newValue);
    },
    [onChange]
  );

  return (
    <div className="bg-orange-500/10 p-4 rounded-lg border border-orange-500 mb-6">
      <label className="block text-orange-500 font-bold mb-2 text-sm">
        {SECTION_TITLES.DISCOUNT_LABEL}
      </label>
      <input
        type="number"
        value={value || 0}
        onChange={handleChange}
        min="0"
        max="100"
        step="0.1"
        className="bg-neutral-800 border border-orange-500 text-white px-4 py-2 rounded-lg text-xl font-bold w-32 focus:outline-none focus:ring-2 focus:ring-orange-500"
      />
      <p className="text-neutral-500 text-xs mt-2">
        {SECTION_TITLES.DISCOUNT_HELP}
      </p>
    </div>
  );
};

// ============================================================================
// COMPONENTES DE PERFIL
// ============================================================================

const ProfileForm: React.FC<ProfileFormProps> = ({
  profile,
  onChange,
  onSave,
  isSaving = false,
}) => {
  const handleFieldChange = useCallback(
    (field: keyof ClientProfile) => (value: string | number) => {
      onChange({ [field]: value });
    },
    [onChange]
  );

  return (
    <div className="bg-neutral-900 rounded-xl border border-neutral-700 p-6">
      <h3 className="text-white text-lg font-bold border-b border-neutral-700 pb-4 mb-6 flex items-center gap-2">
        <Building2 size={20} />
        {SECTION_TITLES.COMPANY_DATA}
      </h3>

      {/* Discount Section */}
      <DiscountSection
        value={profile.discount_rate || 0}
        onChange={handleFieldChange('discount_rate')}
      />

      {/* Company Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <FormField
          label={FIELD_LABELS.COMPANY_NAME}
          value={profile.company_name || ''}
          onChange={handleFieldChange('company_name')}
        />
        <FormField
          label={FIELD_LABELS.CIF}
          value={profile.cif || ''}
          onChange={handleFieldChange('cif')}
        />
      </div>

      {/* Contact Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <FormField
          label={FIELD_LABELS.CONTACT_PERSON}
          value={profile.full_name || ''}
          onChange={handleFieldChange('full_name')}
        />
        <FormField
          label={FIELD_LABELS.PHONE}
          value={profile.phone || ''}
          onChange={handleFieldChange('phone')}
          type="tel"
        />
      </div>

      {/* Email */}
      <div className="mb-4">
        <FormField
          label={FIELD_LABELS.EMAIL}
          value={profile.email || ''}
          onChange={handleFieldChange('email')}
          type="email"
          required
        />
      </div>

      {/* Addresses */}
      <div className="mb-4">
        <TextAreaField
          label={FIELD_LABELS.BILLING_ADDRESS}
          value={profile.billing_address || ''}
          onChange={handleFieldChange('billing_address')}
          rows={3}
        />
      </div>

      <div className="mb-6">
        <TextAreaField
          label={FIELD_LABELS.SHIPPING_ADDRESS}
          value={profile.shipping_address || ''}
          onChange={handleFieldChange('shipping_address')}
          rows={3}
        />
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={onSave}
          disabled={isSaving}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save size={20} />
          {isSaving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// COMPONENTES DE PEDIDOS
// ============================================================================

const OrderCard: React.FC<OrderCardProps> = ({ order, onView }) => {
  const statusConfig = useMemo(
    () => ORDER_STATUS_CONFIG[order.status] || { bg: 'bg-gray-600', label: order.status.toUpperCase() },
    [order.status]
  );

  const formattedDate = useMemo(
    () => new Date(order.created_at).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }),
    [order.created_at]
  );

  return (
    <div className="bg-neutral-800 p-4 rounded-lg border border-neutral-700 hover:border-blue-500 transition-colors">
      <div className="flex justify-between items-start mb-2">
        <span className="text-white font-bold">{order.order_ref}</span>
        <span className="text-xs text-neutral-400">{formattedDate}</span>
      </div>

      {order.projects?.name && (
        <div className="text-sm text-neutral-500 mb-3">
          {order.projects.name}
        </div>
      )}

      <div className="flex justify-between items-center">
        <span className={`text-xs px-2 py-1 rounded ${statusConfig.bg} text-white font-medium`}>
          {statusConfig.label}
        </span>
        <button
          onClick={onView}
          className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1 transition-colors"
        >
          Ver
          <ExternalLink size={14} />
        </button>
      </div>
    </div>
  );
};

const OrderHistory: React.FC<OrderHistoryProps> = ({ orders, onViewOrder }) => {
  const handleViewOrder = useCallback(
    (orderId: string) => () => {
      onViewOrder(orderId);
    },
    [onViewOrder]
  );

  return (
    <div className="bg-neutral-900 rounded-xl border border-neutral-700 p-6">
      <h3 className="text-white text-lg font-bold border-b border-neutral-700 pb-4 mb-6 flex items-center gap-2">
        <Package size={20} />
        {SECTION_TITLES.ORDER_HISTORY} ({orders.length})
      </h3>

      <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto custom-scrollbar">
        {orders.length === 0 ? (
          <p className="text-neutral-500 text-center py-8">{MESSAGES.NO_ORDERS}</p>
        ) : (
          orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onView={handleViewOrder(order.id)}
            />
          ))
        )}
      </div>
    </div>
  );
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export const AdminClientDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // ✅ AÑADIR ERROR HANDLER
  const { handleError, showSuccess, showLoading, dismissToast } = useErrorHandler({
    context: 'AdminClientDetailPage'
  });

  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [clientOrders, setClientOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ==========================================================================
  // CARGA DE DATOS
  // ==========================================================================

  const loadClientData = useCallback(async () => {
    if (!id) return;

    const loadingToast = showLoading('Cargando ficha del cliente...');
    setLoading(true);

    try {
      // Cargar perfil
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (profileError) throw profileError;
      
      if (!profileData) {
        throw new AppError(
          ErrorType.NOT_FOUND,
          'Client profile not found',
          { 
            userMessage: 'Cliente no encontrado',
            severity: ErrorSeverity.MEDIUM 
          }
        );
      }
      
      setProfile(profileData);

      // Cargar pedidos
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*, projects(name)')
        .eq('user_id', id)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;
      setClientOrders(ordersData || []);

      dismissToast(loadingToast);
    } catch (error) {
      dismissToast(loadingToast);
      handleError(error);
    } finally {
      setLoading(false);
    }
  }, [id, handleError, showLoading, dismissToast]);

  useEffect(() => {
    loadClientData();
  }, [loadClientData]);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleProfileChange = useCallback((updates: Partial<ClientProfile>) => {
    setProfile((prev) => (prev ? { ...prev, ...updates } : null));
  }, []);

  const handleSave = useCallback(async () => {
    if (!profile || !id) return;

    const loadingToast = showLoading('Guardando cambios...');
    setSaving(true);

    try {
      const discountValue = parseFloat(String(profile.discount_rate)) || 0;

      const { error } = await supabase
        .from('profiles')
        .update({
          company_name: profile.company_name,
          full_name: profile.full_name,
          email: profile.email,
          phone: profile.phone,
          cif: profile.cif,
          shipping_address: profile.shipping_address,
          billing_address: profile.billing_address,
          discount_rate: discountValue,
        })
        .eq('id', id);

      if (error) throw error;

      dismissToast(loadingToast);
      showSuccess('✅ Cliente actualizado correctamente');
    } catch (error) {
      dismissToast(loadingToast);
      handleError(error);
    } finally {
      setSaving(false);
    }
  }, [profile, id, handleError, showSuccess, showLoading, dismissToast]);

  const handleViewOrder = useCallback(
    (orderId: string) => {
      navigate(`/admin/order/${orderId}`);
    },
    [navigate]
  );

  const handleBackToList = useCallback(() => {
    navigate('/admin/crm');
  }, [navigate]);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-white text-lg">{MESSAGES.LOADING}</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-neutral-400 text-lg">{MESSAGES.NOT_FOUND}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={handleBackToList}
          className="text-neutral-400 hover:text-white flex items-center gap-2 transition-colors"
        >
          <ArrowLeft size={20} />
          {MESSAGES.BACK_TO_LIST}
        </button>
        <h2 className="text-2xl font-bold text-white">
          {MESSAGES.CLIENT_CARD_TITLE}{' '}
          <span className="text-blue-500">{profile.email}</span>
        </h2>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Form - 2/3 width */}
        <div className="lg:col-span-2">
          <ProfileForm
            profile={profile}
            onChange={handleProfileChange}
            onSave={handleSave}
            isSaving={saving}
          />
        </div>

        {/* Order History - 1/3 width */}
        <div>
          <OrderHistory orders={clientOrders} onViewOrder={handleViewOrder} />
        </div>
      </div>
    </div>
  );
};

// --- END OF FILE ---