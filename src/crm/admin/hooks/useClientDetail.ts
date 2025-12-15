// ============================================================================
// USE CLIENT DETAIL - Hook for managing client detail page data and actions
// ============================================================================

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/core/lib/supabase';
import { useErrorHandler } from '@/core/hooks/useErrorHandler';
import { AppError, ErrorType, ErrorSeverity } from '@/core/lib/errorHandler';

export interface ClientProfile {
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

export interface ClientOrder {
  id: string;
  order_ref: string;
  status: string;
  created_at: string;
  user_id: string;
  projects?: {
    name: string;
  };
}

interface UseClientDetailReturn {
  profile: ClientProfile | null;
  orders: ClientOrder[];
  loading: boolean;
  saving: boolean;
  loadClientData: () => Promise<void>;
  updateProfile: (updates: Partial<ClientProfile>) => void;
  saveProfile: () => Promise<void>;
}

/**
 * Hook for managing client detail page data and actions
 */
export const useClientDetail = (clientId: string | undefined): UseClientDetailReturn => {
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [orders, setOrders] = useState<ClientOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { handleError, showSuccess, showLoading, dismissToast } = useErrorHandler({
    context: 'useClientDetail',
  });

  const loadClientData = useCallback(async () => {
    if (!clientId) return;

    const loadingToast = showLoading('Cargando ficha del cliente...');
    setLoading(true);

    try {
      // Load profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', clientId)
        .single();

      if (profileError) throw profileError;

      if (!profileData) {
        throw new AppError(ErrorType.NOT_FOUND, 'Client profile not found', {
          userMessage: 'Cliente no encontrado',
          severity: ErrorSeverity.MEDIUM,
        });
      }

      setProfile(profileData);

      // Load orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*, projects(name)')
        .eq('user_id', clientId)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;
      setOrders(ordersData || []);

      dismissToast(loadingToast);
    } catch (error) {
      dismissToast(loadingToast);
      handleError(error);
    } finally {
      setLoading(false);
    }
  }, [clientId, handleError, showLoading, dismissToast]);

  useEffect(() => {
    loadClientData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const updateProfile = useCallback((updates: Partial<ClientProfile>) => {
    setProfile((prev) => (prev ? { ...prev, ...updates } : null));
  }, []);

  const saveProfile = useCallback(async () => {
    if (!profile || !clientId) return;

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
        .eq('id', clientId);

      if (error) throw error;

      dismissToast(loadingToast);
      showSuccess('✅ Cliente actualizado correctamente');
    } catch (error) {
      dismissToast(loadingToast);
      handleError(error);
      throw error;
    } finally {
      setSaving(false);
    }
  }, [profile, clientId, handleError, showSuccess, showLoading, dismissToast]);

  return {
    profile,
    orders,
    loading,
    saving,
    loadClientData,
    updateProfile,
    saveProfile,
  };
};
