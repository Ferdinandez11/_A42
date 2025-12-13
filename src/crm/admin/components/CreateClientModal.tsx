// CreateClientModal.tsx
// ✅ Componente extraído de CrmDashboard
import React from 'react';
import type { NewClientData } from '@/crm/hooks/useClients';

interface CreateClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: NewClientData) => void;
  data: NewClientData;
  onChange: (data: NewClientData) => void;
}

export const CreateClientModal: React.FC<CreateClientModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  data,
  onChange,
}) => {
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
            onChange={(e) =>
              onChange({ ...data, discount_rate: parseFloat(e.target.value) || 0 })
            }
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

