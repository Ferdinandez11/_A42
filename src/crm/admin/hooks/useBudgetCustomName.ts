// ============================================================================
// USE BUDGET CUSTOM NAME - Hook for managing custom budget name
// ============================================================================

import { useState, useCallback } from 'react';
import { supabase } from '@/core/lib/supabase';
import { useErrorHandler } from '@/core/hooks/useErrorHandler';

interface UseBudgetCustomNameReturn {
  customName: string;
  setCustomName: (name: string) => void;
  saveName: (orderId: string) => Promise<void>;
}

/**
 * Hook for managing custom name of a budget/order
 */
export const useBudgetCustomName = (
  initialName: string = ''
): UseBudgetCustomNameReturn => {
  const [customName, setCustomName] = useState(initialName);
  const { handleError, showSuccess, showLoading, dismissToast } = useErrorHandler({
    context: 'useBudgetCustomName',
  });

  const saveName = useCallback(
    async (orderId: string) => {
      const loadingToast = showLoading('Guardando nombre...');

      try {
        const { error } = await supabase
          .from('orders')
          .update({ custom_name: customName })
          .eq('id', orderId);

        if (error) throw error;

        dismissToast(loadingToast);
        showSuccess('✅ Nombre guardado correctamente');
      } catch (error) {
        dismissToast(loadingToast);
        handleError(error);
        throw error;
      }
    },
    [customName, handleError, showSuccess, showLoading, dismissToast]
  );

  return {
    customName,
    setCustomName,
    saveName,
  };
};

