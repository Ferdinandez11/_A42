// ============================================================================
// FORM VALIDATION SCHEMAS - Zod schemas for form validation
// ============================================================================

import { z } from 'zod';

// ============================================================================
// LOGIN / REGISTER SCHEMAS
// ============================================================================

/**
 * Schema para login y registro
 */
export const LoginSchema = z.object({
  email: z
    .string()
    .min(1, 'El email es obligatorio')
    .email('Email inválido'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(100, 'La contraseña no puede exceder 100 caracteres')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'La contraseña debe contener al menos una mayúscula, una minúscula y un número'
    ),
});

export type LoginFormData = z.infer<typeof LoginSchema>;

// ============================================================================
// CLIENT CREATION SCHEMA
// ============================================================================

/**
 * Schema para crear un nuevo cliente
 */
export const CreateClientSchema = z.object({
  email: z
    .string()
    .min(1, 'El email es obligatorio')
    .email('Email inválido'),
  company_name: z
    .string()
    .min(1, 'El nombre de la empresa es obligatorio')
    .max(200, 'El nombre de la empresa no puede exceder 200 caracteres'),
  full_name: z
    .string()
    .min(1, 'El nombre completo es obligatorio')
    .max(200, 'El nombre completo no puede exceder 200 caracteres'),
  phone: z
    .string()
    .min(1, 'El teléfono es obligatorio')
    .regex(
      /^\+?[0-9\s\-()]+$/,
      'Teléfono inválido. Use solo números, espacios, guiones y paréntesis'
    ),
  discount_rate: z
    .number()
    .min(0, 'El descuento no puede ser negativo')
    .max(100, 'El descuento no puede exceder 100%')
    .default(0),
});

export type CreateClientFormData = z.infer<typeof CreateClientSchema>;

// ============================================================================
// PROFILE SCHEMA
// ============================================================================

/**
 * Schema para perfil de usuario
 */
export const ProfileSchema = z.object({
  company_name: z
    .string()
    .max(200, 'El nombre de la empresa no puede exceder 200 caracteres')
    .optional()
    .or(z.literal('')),
  full_name: z
    .string()
    .max(200, 'El nombre completo no puede exceder 200 caracteres')
    .optional()
    .or(z.literal('')),
  email: z
    .string()
    .email('Email inválido')
    .optional()
    .or(z.literal('')),
  cif: z
    .string()
    .max(20, 'El CIF/NIF no puede exceder 20 caracteres')
    .regex(
      /^[A-Z0-9]+$/i,
      'El CIF/NIF solo puede contener letras y números'
    )
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .regex(
      /^\+?[0-9\s\-()]+$/,
      'Teléfono inválido. Use solo números, espacios, guiones y paréntesis'
    )
    .optional()
    .or(z.literal('')),
  shipping_address: z
    .string()
    .max(500, 'La dirección de envío no puede exceder 500 caracteres')
    .optional()
    .or(z.literal('')),
  billing_address: z
    .string()
    .max(500, 'La dirección de facturación no puede exceder 500 caracteres')
    .optional()
    .or(z.literal('')),
  billing_email: z
    .string()
    .email('Email de facturación inválido')
    .optional()
    .or(z.literal('')),
  observations: z
    .string()
    .max(1000, 'Las observaciones no pueden exceder 1000 caracteres')
    .optional()
    .or(z.literal('')),
});

export type ProfileFormData = z.infer<typeof ProfileSchema>;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Valida datos de formulario y retorna resultado tipado
 */
export function validateForm<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  return { success: false, errors: result.error };
}

/**
 * Obtiene mensajes de error formateados para mostrar al usuario
 */
export function getFormErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  
  error.errors.forEach((err) => {
    const path = err.path.join('.');
    errors[path] = err.message;
  });
  
  return errors;
}

/**
 * Obtiene el primer mensaje de error
 */
export function getFirstError(error: z.ZodError): string {
  return error.errors[0]?.message || 'Error de validación';
}

