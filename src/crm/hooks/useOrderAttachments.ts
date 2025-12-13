// useOrderAttachments.ts
// ✅ Hook para gestión de archivos adjuntos del pedido
import { useState, useCallback } from 'react';
import { supabase } from '@/core/lib/supabase';
import { useErrorHandler } from '@/core/hooks/useErrorHandler';

export interface Attachment {
  id: string;
  order_id: string;
  file_name: string;
  file_url: string;
  uploader_id: string;
  created_at: string;
}

interface UseOrderAttachmentsReturn {
  attachments: Attachment[];
  uploading: boolean;
  loading: boolean;
  fetchAttachments: (orderId: string) => Promise<void>;
  uploadFile: (orderId: string, file: File) => Promise<void>;
  deleteAttachment: (attachmentId: string) => Promise<void>;
}

/**
 * Hook para gestionar archivos adjuntos de un pedido
 */
export const useOrderAttachments = (): UseOrderAttachmentsReturn => {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const { handleError, showSuccess, showLoading, dismissToast } = useErrorHandler({
    context: 'useOrderAttachments',
  });

  const fetchAttachments = useCallback(
    async (orderId: string) => {
      setLoading(true);

      try {
        const { data, error } = await supabase
          .from('order_attachments')
          .select('*')
          .eq('order_id', orderId);

        if (error) throw error;

        setAttachments(data || []);
      } catch (error) {
        handleError(error);
      } finally {
        setLoading(false);
      }
    },
    [handleError]
  );

  const uploadFile = useCallback(
    async (orderId: string, file: File) => {
      const loadingToast = showLoading('Subiendo archivo...');
      setUploading(true);

      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${orderId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('attachments')
          .getPublicUrl(filePath);

        const { data: { user } } = await supabase.auth.getUser();
        const { error: insertError } = await supabase
          .from('order_attachments')
          .insert([
            {
              order_id: orderId,
              file_name: file.name,
              file_url: publicUrl,
              uploader_id: user?.id,
            },
          ]);

        if (insertError) throw insertError;

        dismissToast(loadingToast);
        showSuccess(`✅ ${file.name} subido correctamente`);
        await fetchAttachments(orderId);
      } catch (error) {
        dismissToast(loadingToast);
        handleError(error);
        throw error;
      } finally {
        setUploading(false);
      }
    },
    [handleError, showSuccess, showLoading, dismissToast, fetchAttachments]
  );

  const deleteAttachment = useCallback(
    async (attachmentId: string) => {
      const loadingToast = showLoading('Eliminando archivo...');

      try {
        const { error } = await supabase
          .from('order_attachments')
          .delete()
          .eq('id', attachmentId);

        if (error) throw error;

        setAttachments((prev) => prev.filter((att) => att.id !== attachmentId));
        dismissToast(loadingToast);
        showSuccess('✅ Archivo eliminado');
      } catch (error) {
        dismissToast(loadingToast);
        handleError(error);
        throw error;
      }
    },
    [handleError, showSuccess, showLoading, dismissToast]
  );

  return {
    attachments,
    uploading,
    loading,
    fetchAttachments,
    uploadFile,
    deleteAttachment,
  };
};

