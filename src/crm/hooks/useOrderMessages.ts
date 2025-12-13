// useOrderMessages.ts
// ✅ Hook para gestión de mensajes del pedido
import { useState, useCallback } from 'react';
import { supabase } from '@/core/lib/supabase';
import { useErrorHandler } from '@/core/hooks/useErrorHandler';

export interface OrderMessage {
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

interface UseOrderMessagesReturn {
  messages: OrderMessage[];
  loading: boolean;
  fetchMessages: (orderId: string) => Promise<void>;
  sendMessage: (orderId: string, content: string) => Promise<void>;
}

/**
 * Hook para gestionar mensajes de un pedido
 */
export const useOrderMessages = (): UseOrderMessagesReturn => {
  const [messages, setMessages] = useState<OrderMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const { handleError, showSuccess, showLoading, dismissToast } = useErrorHandler({
    context: 'useOrderMessages',
  });

  const fetchMessages = useCallback(
    async (orderId: string) => {
      setLoading(true);

      try {
        const { data, error } = await supabase
          .from('order_messages')
          .select('*, profiles(full_name, role)')
          .eq('order_id', orderId)
          .order('created_at', { ascending: true });

        if (error) throw error;

        setMessages(data || []);
      } catch (error) {
        handleError(error);
      } finally {
        setLoading(false);
      }
    },
    [handleError]
  );

  const sendMessage = useCallback(
    async (orderId: string, content: string) => {
      if (!content.trim()) return;

      const loadingToast = showLoading('Enviando mensaje...');

      try {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from('order_messages').insert([
          {
            order_id: orderId,
            user_id: user?.id,
            content: content.trim(),
          },
        ]);

        if (error) throw error;

        dismissToast(loadingToast);
        showSuccess('✅ Mensaje enviado');
        await fetchMessages(orderId);
      } catch (error) {
        dismissToast(loadingToast);
        handleError(error);
        throw error;
      }
    },
    [handleError, showSuccess, showLoading, dismissToast, fetchMessages]
  );

  return {
    messages,
    loading,
    fetchMessages,
    sendMessage,
  };
};

