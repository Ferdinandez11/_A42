import { useEffect, useState } from 'react';
import { supabase } from '@/core/lib/supabase';

// ✅ IMPORTS DEL SISTEMA DE ERRORES
import { useErrorHandler } from '@/core/hooks/useErrorHandler';
import { AppError, ErrorType, ErrorSeverity } from '@/core/lib/errorHandler';
import { ProfileSchema, getFormErrors } from '@/core/lib/formSchemas';

// ============================================================================
// TYPES
// ============================================================================

interface Profile {
  id?: string;
  company_name?: string;
  full_name?: string;
  email?: string;
  cif?: string;
  phone?: string;
  shipping_address?: string;
  billing_address?: string;
  billing_email?: string;
  observations?: string;
}

interface FormFieldProps {
  label: string;
  type?: 'text' | 'email' | 'tel';
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
}

interface TextareaFieldProps {
  label: string;
  rows?: number;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const EMPTY_PROFILE: Profile = {
  company_name: '',
  full_name: '',
  email: '',
  cif: '',
  phone: '',
  shipping_address: '',
  billing_address: '',
  billing_email: '',
  observations: '',
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const SectionTitle: React.FC<{ icon: string; children: React.ReactNode }> = ({ 
  icon, 
  children 
}) => (
  <h4 className="text-orange-500 border-b border-neutral-800 pb-2 mb-5 mt-8 first:mt-0 flex items-center gap-2">
    <span>{icon}</span>
    <span>{children}</span>
  </h4>
);

interface FormFieldWithErrorProps extends FormFieldProps {
  error?: string;
}

const FormField: React.FC<FormFieldWithErrorProps> = ({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
}) => (
  <label className="block mb-4">
    <span className="block text-neutral-400 text-sm mb-1">{label}</span>
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full px-3 py-2.5 bg-neutral-800 border rounded-lg text-white focus:outline-none transition-colors ${
        error 
          ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
          : 'border-neutral-700 focus:border-orange-500 focus:ring-orange-500'
      } focus:ring-1`}
    />
    {error && (
      <p className="text-red-400 text-sm mt-1">{error}</p>
    )}
  </label>
);

interface TextareaFieldWithErrorProps extends TextareaFieldProps {
  error?: string;
}

const TextareaField: React.FC<TextareaFieldWithErrorProps> = ({
  label,
  rows = 3,
  placeholder,
  value,
  onChange,
  error,
}) => (
  <label className="block mb-4">
    <span className="block text-neutral-400 text-sm mb-1">{label}</span>
    <textarea
      rows={rows}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full px-3 py-2.5 bg-neutral-800 border rounded-lg text-white resize-none focus:outline-none transition-colors ${
        error 
          ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
          : 'border-neutral-700 focus:border-orange-500 focus:ring-orange-500'
      } focus:ring-1`}
    />
    {error && (
      <p className="text-red-400 text-sm mt-1">{error}</p>
    )}
  </label>
);

// ============================================================================
// CUSTOM HOOKS
// ============================================================================

const useProfile = () => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Profile>(EMPTY_PROFILE);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // ✅ AÑADIR ERROR HANDLER
  const { handleError, showSuccess, showLoading, dismissToast } = useErrorHandler({
    context: 'ProfilePage'
  });

  const loadProfile = async (): Promise<void> => {
    const loadingToast = showLoading('Cargando perfil...');
    setLoading(true);
    
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;
      
      if (!user) {
        throw new AppError(
          ErrorType.AUTH,
          'No authenticated user',
          { 
            userMessage: 'No se encontró usuario autenticado',
            severity: ErrorSeverity.MEDIUM 
          }
        );
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      
      if (data) setFormData(data);
      
      dismissToast(loadingToast);
    } catch (error) {
      dismissToast(loadingToast);
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async (): Promise<void> => {
    // Validar con Zod
    const validation = ProfileSchema.safeParse(formData);
    
    if (!validation.success) {
      setErrors(getFormErrors(validation.error));
      handleError(new AppError(
        ErrorType.VALIDATION,
        'Form validation failed',
        {
          userMessage: 'Por favor, corrige los errores en el formulario',
          severity: ErrorSeverity.MEDIUM,
        }
      ));
      return;
    }

    const loadingToast = showLoading('Guardando cambios...');
    setLoading(true);
    setErrors({});

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError) throw userError;
      
      if (!user) {
        throw new AppError(
          ErrorType.AUTH,
          'No authenticated user',
          { 
            userMessage: 'No se encontró usuario autenticado',
            severity: ErrorSeverity.MEDIUM 
          }
        );
      }

      const { error } = await supabase
        .from('profiles')
        .update(validation.data)
        .eq('id', user.id);

      if (error) throw error;

      dismissToast(loadingToast);
      showSuccess('✅ Perfil actualizado correctamente');
    } catch (error) {
      dismissToast(loadingToast);
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  const updateField = <K extends keyof Profile>(
    field: K,
    value: Profile[K]
  ): void => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Limpiar error del campo cuando el usuario empieza a escribir
    if (errors[field as string]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field as string];
        return newErrors;
      });
    }
  };

  return {
    loading,
    formData,
    errors,
    loadProfile,
    saveProfile,
    updateField,
  };
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const ProfilePage: React.FC = () => {
  const { loading, formData, errors, loadProfile, saveProfile, updateField } = useProfile();

  useEffect(() => {
    loadProfile();
  }, []);

  return (
    <div className="max-w-4xl mx-auto text-neutral-200 p-5">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-white text-2xl font-bold mb-2">Mi Zona Personal</h2>
        <p className="text-neutral-500">
          Gestiona tus datos de facturación y envío.
        </p>
      </div>

      {/* Form Container */}
      <div className="bg-neutral-900 p-8 rounded-xl border border-neutral-800">
        
        {/* Company Information */}
        <SectionTitle icon="🏢">Datos Fiscales</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FormField
            label="Nombre Empresa"
            value={formData.company_name || ''}
            onChange={(value) => updateField('company_name', value)}
            error={errors.company_name}
          />
          <FormField
            label="CIF / NIF"
            value={formData.cif || ''}
            onChange={(value) => updateField('cif', value)}
            error={errors.cif}
          />
        </div>

        {/* Contact Information */}
        <SectionTitle icon="👤">Contacto Principal</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FormField
            label="Nombre Completo"
            value={formData.full_name || ''}
            onChange={(value) => updateField('full_name', value)}
            error={errors.full_name}
          />
          <FormField
            label="Teléfono"
            type="tel"
            value={formData.phone || ''}
            onChange={(value) => updateField('phone', value)}
            error={errors.phone}
          />
        </div>

        {/* Email Fields */}
        <FormField
          label="Email de Contacto (CRM)"
          type="email"
          placeholder="ejemplo@empresa.com"
          value={formData.email || ''}
          onChange={(value) => updateField('email', value)}
          error={errors.email}
        />

        <FormField
          label="Email para Facturación (si es distinto)"
          type="email"
          placeholder="contabilidad@empresa.com"
          value={formData.billing_email || ''}
          onChange={(value) => updateField('billing_email', value)}
          error={errors.billing_email}
        />

        {/* Addresses */}
        <SectionTitle icon="📍">Direcciones</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <TextareaField
            label="Dirección de Envío"
            value={formData.shipping_address || ''}
            onChange={(value) => updateField('shipping_address', value)}
            error={errors.shipping_address}
          />
          <TextareaField
            label="Dirección de Facturación"
            value={formData.billing_address || ''}
            onChange={(value) => updateField('billing_address', value)}
            error={errors.billing_address}
          />
        </div>

        {/* Additional Information */}
        <SectionTitle icon="📝">Otros</SectionTitle>
        <TextareaField
          label="Observaciones Generales"
          rows={2}
          value={formData.observations || ''}
          onChange={(value) => updateField('observations', value)}
          error={errors.observations}
        />

        {/* Save Button */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={saveProfile}
            disabled={loading}
            className={`
              px-8 py-3 bg-blue-600 text-white rounded-lg font-bold
              transition-all
              ${loading
                ? 'opacity-70 cursor-wait'
                : 'hover:bg-blue-500 cursor-pointer'
              }
            `}
          >
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>
  );
};