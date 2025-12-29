// ============================================================================
// FORM VALIDATION SCHEMAS - Zod schemas for form validation
// ============================================================================

import { z } from 'zod';

// ============================================================================
// EMAIL VALIDATION HELPERS
// ============================================================================

/**
 * Validación de email más flexible que acepta formatos comunes
 * Permite emails con caracteres especiales y formatos menos comunes
 * Acepta: usuario@dominio.com, usuario+tag@dominio.com, usuario.nombre@sub.dominio.com
 */
const emailValidation = z
  .string()
  .min(1, 'El email es obligatorio')
  .refine(
    (email) => {
      // Primero normalizar: quitar espacios
      const normalized = email.trim();
      if (normalized.length === 0) return false;
      
      // Validación más flexible: debe tener @ y al menos un punto después del @
      // Permite caracteres especiales comunes: +, -, _, .
      // Acepta dominios con múltiples puntos (sub.dominio.com)
      const emailRegex = /^[a-zA-Z0-9._+\-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      return emailRegex.test(normalized);
    },
    { message: 'Email inválido. Debe tener formato: usuario@dominio.com' }
  )
  .transform((email) => email.trim().toLowerCase()); // Normalizar email

/**
 * Validación de email opcional (para campos que pueden estar vacíos)
 */
const optionalEmailValidation = z
  .string()
  .optional()
  .or(z.literal(''))
  .refine(
    (email) => {
      if (!email || email === '') return true; // Vacío es válido
      const normalized = email.trim();
      if (normalized.length === 0) return true; // Solo espacios es válido (vacío)
      
      // Validación más flexible
      const emailRegex = /^[a-zA-Z0-9._+\-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      return emailRegex.test(normalized);
    },
    { message: 'Email inválido. Debe tener formato: usuario@dominio.com' }
  )
  .transform((email) => email ? email.trim().toLowerCase() : '');

// ============================================================================
// LOGIN / REGISTER SCHEMAS
// ============================================================================

/**
 * Schema para login y registro
 */
export const LoginSchema = z.object({
  email: emailValidation,
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
  email: emailValidation,
  company_name: z
    .string()
    .min(1, 'El nombre de la empresa es obligatorio')
    .max(200, 'El nombre de la empresa no puede exceder 200 caracteres')
    .transform((val) => val.trim()),
  full_name: z
    .string()
    .min(1, 'El nombre completo es obligatorio')
    .max(200, 'El nombre completo no puede exceder 200 caracteres')
    .transform((val) => val.trim()),
  phone: z
    .string()
    .min(1, 'El teléfono es obligatorio')
    .regex(
      /^\+?[0-9\s\-()]+$/,
      'Teléfono inválido. Use solo números, espacios, guiones y paréntesis'
    )
    .transform((val) => val.trim()),
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
    .or(z.literal(''))
    .transform((val) => val ? val.trim() : ''),
  full_name: z
    .string()
    .max(200, 'El nombre completo no puede exceder 200 caracteres')
    .optional()
    .or(z.literal(''))
    .transform((val) => val ? val.trim() : ''),
  email: optionalEmailValidation,
  cif: z
    .string()
    .max(20, 'El CIF/NIF no puede exceder 20 caracteres')
    .regex(
      /^[A-Z0-9]+$/i,
      'El CIF/NIF solo puede contener letras y números'
    )
    .optional()
    .or(z.literal(''))
    .transform((val) => val ? val.trim().toUpperCase() : ''),
  phone: z
    .string()
    .regex(
      /^\+?[0-9\s\-()]+$/,
      'Teléfono inválido. Use solo números, espacios, guiones y paréntesis'
    )
    .optional()
    .or(z.literal(''))
    .transform((val) => val ? val.trim() : ''),
  shipping_address: z
    .string()
    .max(500, 'La dirección de envío no puede exceder 500 caracteres')
    .optional()
    .or(z.literal(''))
    .transform((val) => val ? val.trim() : ''),
  billing_address: z
    .string()
    .max(500, 'La dirección de facturación no puede exceder 500 caracteres')
    .optional()
    .or(z.literal(''))
    .transform((val) => val ? val.trim() : ''),
  billing_email: optionalEmailValidation,
  observations: z
    .string()
    .max(1000, 'Las observaciones no pueden exceder 1000 caracteres')
    .optional()
    .or(z.literal(''))
    .transform((val) => val ? val.trim() : ''),
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
  
  // Validar que error.errors existe y es un array
  if (!error || !error.errors || !Array.isArray(error.errors)) {
    console.error('[getFormErrors] Error inválido:', error);
    return { _general: 'Error de validación desconocido' };
  }
  
  error.errors.forEach((err) => {
    const path = err.path && Array.isArray(err.path) ? err.path.join('.') : 'unknown';
    errors[path] = err.message || 'Error de validación';
  });
  
  return errors;
}

/**
 * Obtiene el primer mensaje de error
 */
export function getFirstError(error: z.ZodError): string {
  if (!error || !error.errors || !Array.isArray(error.errors) || error.errors.length === 0) {
    return 'Error de validación';
  }
  return error.errors[0]?.message || 'Error de validación';
}

/**
 * Valida un email de forma flexible (para debugging)
 * Retorna true si el email es válido, false si no
 */
export function isValidEmail(email: string): boolean {
  if (!email || email.trim() === '') return false;
  const normalized = email.trim();
  const emailRegex = /^[a-zA-Z0-9._+\-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(normalized);
}

/**
 * Normaliza un email (trim + lowercase)
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

