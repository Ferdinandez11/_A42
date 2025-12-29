// BudgetAttachmentsCard.tsx
import { useState, useEffect } from 'react';
import { supabase } from '@/core/lib/supabase';
import { logError } from '@/core/lib/logger';
import type { Attachment } from '@/crm/pages/budgetTypes';

interface BudgetAttachmentsCardProps {
  attachments: Attachment[];
  uploading: boolean;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDeleteAttachment: (attId: string) => void;
}

export const BudgetAttachmentsCard = ({
  attachments,
  uploading,
  onFileUpload,
  onDeleteAttachment,
}: BudgetAttachmentsCardProps) => {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUserId(user.id);
          // Obtener el rol del usuario
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
          if (profile) {
            setUserRole(profile.role);
          }
        }
      } catch (error) {
        logError('Error loading user', error, { context: 'BudgetAttachmentsCard' });
      }
    };
    loadUser();
  }, []);

  // Determinar si un archivo es un PDF de presupuesto generado automáticamente
  const isBudgetPDF = (fileName: string): boolean => {
    return fileName.includes('Presupuesto_') && fileName.endsWith('.pdf');
  };

  // El cliente no puede eliminar PDFs de presupuestos
  const canDelete = (att: Attachment): boolean => {
    if (userRole === 'admin' || userRole === 'employee') {
      return true; // Admin/empleado puede eliminar todo
    }
    if (userRole === 'client') {
      return !isBudgetPDF(att.file_name); // Cliente NO puede eliminar PDFs de presupuestos
    }
    return false;
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5 flex flex-col mb-5">
      <div className="flex justify-between items-center border-b border-zinc-800 pb-2.5 mb-0">
        <h3 className="m-0 text-white">📎 Archivos y Planos</h3>
        <label className="bg-zinc-800 text-white py-1 px-2.5 rounded cursor-pointer text-xs border border-zinc-700 hover:bg-zinc-700 transition-colors">
          {uploading ? '...' : '+ Adjuntar'}
          <input 
            type="file" 
            onChange={onFileUpload} 
            className="hidden" 
            disabled={uploading} 
          />
        </label>
      </div>
      
      {attachments.length === 0 ? (
        <p className="text-zinc-600 text-xs mt-2.5">Sin archivos.</p>
      ) : (
        <ul className="list-none p-0 m-0 mt-2.5">
          {attachments.map(att => {
            const canDeleteFile = canDelete(att);
            const isPDF = isBudgetPDF(att.file_name);
            
            return (
              <li 
                key={att.id}
                className="bg-zinc-950 p-2 mb-1 rounded"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <a 
                      href={att.file_url} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-blue-500 no-underline text-xs hover:text-blue-400 transition-colors block"
                    >
                      {att.file_name}
                    </a>
                    {att.created_at && (
                      <span className="text-[10px] text-zinc-500 block mt-1">
                        📅 {formatDate(att.created_at)}
                      </span>
                    )}
                  </div>
                  {canDeleteFile && (
                    <button 
                      onClick={() => onDeleteAttachment(att.id)}
                      className="border-none bg-transparent text-red-600 cursor-pointer hover:text-red-500 transition-colors ml-2"
                      title="Eliminar archivo"
                    >
                      🗑️
                    </button>
                  )}
                  {!canDeleteFile && isPDF && (
                    <span className="text-[10px] text-zinc-500 ml-2" title="Este PDF no se puede eliminar">
                      🔒
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};