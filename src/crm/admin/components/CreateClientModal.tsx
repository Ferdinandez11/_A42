// CreateClientModal.tsx
// ✅ Componente extraído de CrmDashboard
// ✅ Optimizado - Validación Zod
import React, { useState } from 'react';
import type { NewClientData } from '@/crm/hooks/useClients';
import { CreateClientSchema, getFormErrors } from '@/core/lib/formSchemas';

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
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const handleSubmit = () => {
    // Validar con Zod
    const validation = CreateClientSchema.safeParse(data);
    
    if (!validation.success) {
      setErrors(getFormErrors(validation.error));
      return;
    }

    setErrors({});
    onSubmit(validation.data);
  };

  const handleFieldChange = (field: keyof NewClientData, value: string | number) => {
    onChange({ ...data, [field]: value });
    // Limpiar error del campo cuando el usuario empieza a escribir
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999]">
      <div className="bg-neutral-900 p-8 rounded-xl w-[400px] border border-neutral-700">
        <h3 className="text-white text-xl font-bold mb-6">Dar de Alta Cliente</h3>

        <div className="space-y-4">
          <div>
            <input
              type="email"
              placeholder="Email (Obligatorio)"
              className={`w-full px-4 py-2 bg-neutral-800 border text-white rounded-lg ${
                errors.email 
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                  : 'border-neutral-700 focus:border-blue-500 focus:ring-blue-500'
              } focus:outline-none focus:ring-1`}
              value={data.email}
              onChange={(e) => handleFieldChange('email', e.target.value)}
            />
            {errors.email && (
              <p className="text-red-400 text-sm mt-1">{errors.email}</p>
            )}
          </div>

          <div>
            <input
              type="text"
              placeholder="Nombre Empresa"
              className={`w-full px-4 py-2 bg-neutral-800 border text-white rounded-lg ${
                errors.company_name 
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                  : 'border-neutral-700 focus:border-blue-500 focus:ring-blue-500'
              } focus:outline-none focus:ring-1`}
              value={data.company_name}
              onChange={(e) => handleFieldChange('company_name', e.target.value)}
            />
            {errors.company_name && (
              <p className="text-red-400 text-sm mt-1">{errors.company_name}</p>
            )}
          </div>

          <div>
            <input
              type="text"
              placeholder="Contacto"
              className={`w-full px-4 py-2 bg-neutral-800 border text-white rounded-lg ${
                errors.full_name 
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                  : 'border-neutral-700 focus:border-blue-500 focus:ring-blue-500'
              } focus:outline-none focus:ring-1`}
              value={data.full_name}
              onChange={(e) => handleFieldChange('full_name', e.target.value)}
            />
            {errors.full_name && (
              <p className="text-red-400 text-sm mt-1">{errors.full_name}</p>
            )}
          </div>

          <div>
            <input
              type="text"
              placeholder="Teléfono"
              className={`w-full px-4 py-2 bg-neutral-800 border text-white rounded-lg ${
                errors.phone 
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                  : 'border-neutral-700 focus:border-blue-500 focus:ring-blue-500'
              } focus:outline-none focus:ring-1`}
              value={data.phone}
              onChange={(e) => handleFieldChange('phone', e.target.value)}
            />
            {errors.phone && (
              <p className="text-red-400 text-sm mt-1">{errors.phone}</p>
            )}
          </div>

          <div>
            <input
              type="number"
              placeholder="Descuento %"
              min="0"
              max="100"
              className={`w-full px-4 py-2 bg-neutral-800 border text-white rounded-lg ${
                errors.discount_rate 
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                  : 'border-neutral-700 focus:border-blue-500 focus:ring-blue-500'
              } focus:outline-none focus:ring-1`}
              value={data.discount_rate}
              onChange={(e) =>
                handleFieldChange('discount_rate', parseFloat(e.target.value) || 0)
              }
            />
            {errors.discount_rate && (
              <p className="text-red-400 text-sm mt-1">{errors.discount_rate}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-neutral-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-colors"
          >
            Crear
          </button>
        </div>
      </div>
    </div>
  );
};

