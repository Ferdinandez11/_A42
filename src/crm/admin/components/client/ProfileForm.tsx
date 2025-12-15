// ============================================================================
// PROFILE FORM - Form component for editing client profile
// ============================================================================

import { useCallback } from 'react';
import { Building2, Save } from 'lucide-react';
import type { ClientProfile } from '../../hooks/useClientDetail';
import { FormField } from './FormField';
import { TextAreaField } from './TextAreaField';
import { DiscountSection } from './DiscountSection';

interface ProfileFormProps {
  profile: ClientProfile;
  onChange: (updates: Partial<ClientProfile>) => void;
  onSave: () => void;
  isSaving?: boolean;
}

const SECTION_TITLES = {
  COMPANY_DATA: 'Datos de Empresa & Facturación',
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

export const ProfileForm: React.FC<ProfileFormProps> = ({
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
