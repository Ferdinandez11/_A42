// useClients.ts
// ✅ Hook para gestión de clientes en el panel admin
import { useState, useCallback } from 'react';
import { supabase } from '@/core/lib/supabase';
import { useErrorHandler } from '@/core/hooks/useErrorHandler';
import { AppError, ErrorType, ErrorSeverity } from '@/core/lib/errorHandler';

export interface ClientProfile {
  id: string;
  email: string;
  company_name?: string;
  discount_rate?: number;
  is_approved?: boolean;
  created_at?: string;
}

export interface NewClientData {
  email: string;
  company_name: string;
  full_name: string;
  phone: string;
  discount_rate: number;
}

interface UseClientsReturn {
  clients: ClientProfile[];
  loading: boolean;
  fetchClients: () => Promise<void>;
  approveClient: (clientId: string) => Promise<void>;
  createClient: (data: NewClientData) => Promise<void>;
  deleteClient: (clientId: string) => Promise<void>;
}

/**
 * Hook para gestionar clientes en el panel administrativo
 */
export const useClients = (): UseClientsReturn => {
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const { handleError, showSuccess, showLoading, dismissToast } = useErrorHandler({
    context: 'useClients',
  });

  const fetchClients = useCallback(async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setClients(data || []);
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  const approveClient = useCallback(
    async (clientId: string) => {
      const loadingToast = showLoading('Aprobando cliente...');

      try {
        const { error } = await supabase
          .from('profiles')
          .update({ is_approved: true })
          .eq('id', clientId);

        if (error) throw error;

        setClients((prev) =>
          prev.map((client) =>
            client.id === clientId ? { ...client, is_approved: true } : client
          )
        );

        dismissToast(loadingToast);
        showSuccess('✅ Cliente aprobado correctamente');
      } catch (error) {
        dismissToast(loadingToast);
        handleError(error);
        throw error;
      }
    },
    [handleError, showSuccess, showLoading, dismissToast]
  );

  const createClient = useCallback(
    async (data: NewClientData) => {
      if (!data.email) {
        handleError(
          new AppError(ErrorType.VALIDATION, 'Email required', {
            userMessage: 'El email es obligatorio',
            severity: ErrorSeverity.LOW,
          })
        );
        return;
      }

      const loadingToast = showLoading('Creando cliente...');

      try {
        const { error } = await supabase.from('pre_clients').insert([data]);

        if (error) throw error;

        dismissToast(loadingToast);
        showSuccess(`✅ Cliente ${data.email} creado correctamente`);
        await fetchClients();
      } catch (error) {
        dismissToast(loadingToast);
        handleError(error);
        throw error;
      }
    },
    [handleError, showSuccess, showLoading, dismissToast, fetchClients]
  );

  const deleteClient = useCallback(
    async (clientId: string) => {
      const loadingToast = showLoading('Eliminando cliente...');

      try {
        const { error } = await supabase.from('profiles').delete().eq('id', clientId);

        if (error) throw error;

        setClients((prev) => prev.filter((client) => client.id !== clientId));
        dismissToast(loadingToast);
        showSuccess('✅ Cliente eliminado');
      } catch (error) {
        dismissToast(loadingToast);
        handleError(error);
        throw error;
      }
    },
    [handleError, showSuccess, showLoading, dismissToast]
  );

  return {
    clients,
    loading,
    fetchClients,
    approveClient,
    createClient,
    deleteClient,
  };
};

