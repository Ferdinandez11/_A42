// useOrderObservations.ts
// ✅ Hook para gestión de observaciones del pedido
import { useState, useCallback } from 'react';
import { supabase } from '@/core/lib/supabase';
import { useErrorHandler } from '@/core/hooks/useErrorHandler';
import { AppError, ErrorType, ErrorSeverity } from '@/core/lib/errorHandler';

export interface Observation {
  id: string;
  order_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: {
    full_name: string;
    role: string;
  };
}

interface UseOrderObservationsReturn {
  observations: Observation[];
  loading: boolean;
  fetchObservations: (orderId: string) => Promise<void>;
  addObservation: (orderId: string, content: string) => Promise<void>;
}

/**
 * Hook para gestionar observaciones de un pedido
 */
export const useOrderObservations = (): UseOrderObservationsReturn => {
  const [observations, setObservations] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(false);
  const { handleError, showSuccess, showLoading, dismissToast } = useErrorHandler({
    context: 'useOrderObservations',
  });

  const fetchObservations = useCallback(
    async (orderId: string) => {
      setLoading(true);

      try {
        const { data, error } = await supabase
          .from('order_observations')
          .select('*, profiles(full_name, role)')
          .eq('order_id', orderId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        setObservations(data || []);
      } catch (error) {
        handleError(error);
      } finally {
        setLoading(false);
      }
    },
    [handleError]
  );

  const addObservation = useCallback(
    async (orderId: string, content: string) => {
      if (!content.trim()) {
        handleError(
          new AppError(ErrorType.VALIDATION, 'Empty observation', {
            userMessage: 'La observación no puede estar vacía',
            severity: ErrorSeverity.LOW,
          })
        );
        return;
      }

      const loadingToast = showLoading('Añadiendo observación...');

      try {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from('order_observations').insert([
          {
            order_id: orderId,
            user_id: user?.id,
            content: content.trim(),
          },
        ]);

        if (error) throw error;

        dismissToast(loadingToast);
        showSuccess('✅ Observación añadida');
        await fetchObservations(orderId);
      } catch (error) {
        dismissToast(loadingToast);
        handleError(error);
        throw error;
      }
    },
    [handleError, showSuccess, showLoading, dismissToast, fetchObservations]
  );

  return {
    observations,
    loading,
    fetchObservations,
    addObservation,
  };
};

