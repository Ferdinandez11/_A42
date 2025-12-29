// ============================================================================
// ERROR HANDLER - Sistema centralizado de manejo de errores
// ============================================================================

/**
 * Tipos de error para categorización
 */
export const ErrorType = {
  // Network & API
  NETWORK: 'NETWORK_ERROR',
  API: 'API_ERROR',
  TIMEOUT: 'TIMEOUT_ERROR',
  
  // Authentication & Authorization
  AUTH: 'AUTH_ERROR',
  PERMISSION: 'PERMISSION_ERROR',
  
  // Database
  DATABASE: 'DATABASE_ERROR',
  NOT_FOUND: 'NOT_FOUND_ERROR',
  
  // Validation
  VALIDATION: 'VALIDATION_ERROR',
  
  // Business Logic
  BUSINESS: 'BUSINESS_ERROR',
  
  // 3D Engine
  ENGINE: 'ENGINE_ERROR',
  RENDERING: 'RENDERING_ERROR',
  
  // File Operations
  FILE: 'FILE_ERROR',
  UPLOAD: 'UPLOAD_ERROR',
  
  // Generic
  UNKNOWN: 'UNKNOWN_ERROR',
} as const;

export type ErrorType = typeof ErrorType[keyof typeof ErrorType];

/**
 * Severidad del error
 */
export const ErrorSeverity = {
  LOW: 'low',        // Informativo, no crítico
  MEDIUM: 'medium',  // Requiere atención
  HIGH: 'high',      // Error crítico
  CRITICAL: 'critical', // Sistema comprometido
} as const;

export type ErrorSeverity = typeof ErrorSeverity[keyof typeof ErrorSeverity];

/**
 * Metadata adicional del error
 */
export interface ErrorMetadata {
  /** Componente donde ocurrió el error */
  component?: string;
  
  /** Acción que se estaba ejecutando */
  action?: string;
  
  /** ID del usuario (si aplica) */
  userId?: string;
  
  /** Datos adicionales del contexto */
  context?: Record<string, unknown>;
  
  /** Código de error (para errores de Supabase, etc.) */
  code?: string;
  
  /** Stack trace */
  stack?: string;
  
  /** Timestamp */
  timestamp?: number;
}

/**
 * Clase de error personalizada
 */
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly severity: ErrorSeverity;
  public readonly metadata: ErrorMetadata;
  public readonly originalError?: unknown;
  public readonly userMessage: string;
  public readonly timestamp: number;

  constructor(
    type: ErrorType,
    message: string,
    options?: {
      severity?: ErrorSeverity;
      userMessage?: string;
      metadata?: ErrorMetadata;
      originalError?: unknown;
    }
  ) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.severity = options?.severity || ErrorSeverity.MEDIUM;
    this.userMessage = options?.userMessage || this.getDefaultUserMessage(type);
    this.metadata = {
      ...options?.metadata,
      timestamp: Date.now(),
      stack: this.stack,
    };
    this.originalError = options?.originalError;
    this.timestamp = Date.now();

    // Mantener el stack trace correcto
    // @ts-ignore - captureStackTrace is available in V8 environments
    if (Error.captureStackTrace) {
      // @ts-ignore
      Error.captureStackTrace(this, AppError);
    }
  }

  /**
   * Mensaje de usuario por defecto según el tipo de error
   */
  private getDefaultUserMessage(type: ErrorType): string {
    const messages: Record<ErrorType, string> = {
      [ErrorType.NETWORK]: 'Error de conexión. Verifica tu internet.',
      [ErrorType.API]: 'Error al comunicarse con el servidor.',
      [ErrorType.TIMEOUT]: 'La operación tardó demasiado. Intenta de nuevo.',
      [ErrorType.AUTH]: 'Error de autenticación. Inicia sesión nuevamente.',
      [ErrorType.PERMISSION]: 'No tienes permisos para realizar esta acción.',
      [ErrorType.DATABASE]: 'Error al guardar datos. Intenta nuevamente.',
      [ErrorType.NOT_FOUND]: 'No se encontró el recurso solicitado.',
      [ErrorType.VALIDATION]: 'Datos inválidos. Revisa el formulario.',
      [ErrorType.BUSINESS]: 'No se puede completar esta operación.',
      [ErrorType.ENGINE]: 'Error en el motor 3D. Recarga la página.',
      [ErrorType.RENDERING]: 'Error al renderizar. Intenta de nuevo.',
      [ErrorType.FILE]: 'Error al procesar el archivo.',
      [ErrorType.UPLOAD]: 'Error al subir el archivo. Verifica el tamaño.',
      [ErrorType.UNKNOWN]: 'Error inesperado. Contacta a soporte si persiste.',
    };
    
    return messages[type] || messages[ErrorType.UNKNOWN];
  }

  /**
   * Convierte el error a un objeto plano para logging
   */
  toJSON() {
    return {
      name: this.name,
      type: this.type,
      severity: this.severity,
      message: this.message,
      userMessage: this.userMessage,
      metadata: this.metadata,
      timestamp: this.timestamp,
      originalError: this.originalError instanceof Error 
        ? {
            name: this.originalError.name,
            message: this.originalError.message,
            stack: this.originalError.stack,
          }
        : this.originalError,
    };
  }
}

/**
 * Configuración del error handler
 */
interface ErrorHandlerConfig {
  /** Enviar errores a servicio externo (Sentry, etc.) */
  enableRemoteLogging?: boolean;
  
  /** Mostrar errores en consola */
  enableConsoleLogging?: boolean;
  
  /** Callback personalizado para errores */
  onError?: (error: AppError) => void;
}

/**
 * Handler centralizado de errores
 */
class ErrorHandler {
  private static instance: ErrorHandler;
  private config: ErrorHandlerConfig;

  private constructor(config: ErrorHandlerConfig = {}) {
    this.config = {
      enableRemoteLogging: import.meta.env.PROD,
      enableConsoleLogging: import.meta.env.DEV,
      ...config,
    };
  }

  /**
   * Obtiene la instancia singleton
   */
  static getInstance(config?: ErrorHandlerConfig): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler(config);
    }
    return ErrorHandler.instance;
  }

  /**
   * Actualiza la configuración
   */
  configure(config: Partial<ErrorHandlerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Maneja un error y lo convierte a AppError
   */
  handle(error: unknown, context?: string): AppError {
    const appError = this.normalizeError(error, context);
    
    // Log en consola (solo dev)
    if (this.config.enableConsoleLogging) {
      this.logToConsole(appError);
    }
    
    // Enviar a servicio remoto (solo prod)
    if (this.config.enableRemoteLogging) {
      this.logToRemote(appError);
    }
    
    // Callback personalizado
    if (this.config.onError) {
      this.config.onError(appError);
    }
    
    return appError;
  }

  /**
   * Normaliza cualquier error a AppError
   */
  private normalizeError(error: unknown, context?: string): AppError {
    // Ignorar errores de extensiones del navegador
    if (error instanceof Error && error.message.includes('message channel closed')) {
      return new AppError(
        ErrorType.UNKNOWN,
        'Browser extension error (ignored)',
        {
          severity: ErrorSeverity.LOW,
          userMessage: '',
        }
      );
    }
    
    // Ya es un AppError
    if (error instanceof AppError) {
      return error;
    }
    
    // Error de Supabase
    if (this.isSupabaseError(error)) {
      return this.handleSupabaseError(error, context);
    }
    
    // Error de red/fetch (verificar ANTES de Error genérico)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return new AppError(
        ErrorType.NETWORK,
        'Network request failed',
        {
          severity: ErrorSeverity.HIGH,
          metadata: { component: context },
          originalError: error,
        }
      );
    }
    
    // Error estándar de JavaScript
    if (error instanceof Error) {
      return new AppError(
        ErrorType.UNKNOWN,
        error.message,
        {
          metadata: { component: context, stack: error.stack },
          originalError: error,
        }
      );
    }
    
    // Cualquier otra cosa
    return new AppError(
      ErrorType.UNKNOWN,
      String(error),
      {
        metadata: { component: context },
        originalError: error,
      }
    );
  }

  /**
   * Detecta si es un error de Supabase
   */
  private isSupabaseError(error: unknown): boolean {
    if (error === null || typeof error !== 'object') {
      return false;
    }
    
    // Supabase Auth errors tienen 'code' y 'message'
    if ('code' in error && 'message' in error) {
      return true;
    }
    
    // También pueden tener 'status' y 'statusCode'
    if ('status' in error || 'statusCode' in error) {
      return true;
    }
    
    return false;
  }

  /**
   * Maneja errores específicos de Supabase
   */
  private handleSupabaseError(error: Record<string, unknown>, context?: string): AppError {
    // Extraer código y mensaje de diferentes formatos posibles
    const code = String(error.code || error.status || error.statusCode || '');
    const message = String(error.message || error.error_description || error.error || '').toLowerCase();
    
    // Log para debugging
    if (import.meta.env.DEV) {
      console.log('[ErrorHandler] Procesando error de Supabase:', { code, message, error });
    }
    
    // Errores de autenticación de Supabase Auth
    if (code === 'invalid_credentials' || message.includes('invalid login credentials')) {
      return new AppError(
        ErrorType.AUTH,
        error.message,
        {
          severity: ErrorSeverity.HIGH,
          userMessage: 'Email o contraseña incorrectos. Verifica tus credenciales.',
          metadata: { component: context, code },
          originalError: error,
        }
      );
    }
    
    if (code === 'email_not_confirmed' || message.includes('email not confirmed')) {
      return new AppError(
        ErrorType.AUTH,
        error.message,
        {
          severity: ErrorSeverity.MEDIUM,
          userMessage: 'Por favor, confirma tu email antes de iniciar sesión.',
          metadata: { component: context, code },
          originalError: error,
        }
      );
    }
    
    if (code === 'user_not_found' || message.includes('user not found')) {
      return new AppError(
        ErrorType.AUTH,
        error.message,
        {
          severity: ErrorSeverity.HIGH,
          userMessage: 'Usuario no encontrado. Verifica tu email o regístrate.',
          metadata: { component: context, code },
          originalError: error,
        }
      );
    }
    
    if (code === 'signup_disabled' || message.includes('signup disabled')) {
      return new AppError(
        ErrorType.AUTH,
        error.message,
        {
          severity: ErrorSeverity.MEDIUM,
          userMessage: 'El registro está deshabilitado temporalmente.',
          metadata: { component: context, code },
          originalError: error,
        }
      );
    }
    
    // Errores de autenticación HTTP
    if (code === 'PGRST301' || code === '401') {
      return new AppError(
        ErrorType.AUTH,
        error.message,
        {
          severity: ErrorSeverity.HIGH,
          userMessage: 'Sesión expirada. Inicia sesión nuevamente.',
          metadata: { component: context, code },
          originalError: error,
        }
      );
    }
    
    // Errores de permisos
    if (code === 'PGRST116' || code === '403') {
      return new AppError(
        ErrorType.PERMISSION,
        error.message,
        {
          severity: ErrorSeverity.MEDIUM,
          userMessage: 'No tienes permisos para realizar esta acción.',
          metadata: { component: context, code },
          originalError: error,
        }
      );
    }
    
    // No encontrado
    if (code === 'PGRST116' || code === '404') {
      return new AppError(
        ErrorType.NOT_FOUND,
        error.message,
        {
          severity: ErrorSeverity.LOW,
          userMessage: 'No se encontró el recurso solicitado.',
          metadata: { component: context, code },
          originalError: error,
        }
      );
    }
    
    // Error genérico de base de datos
    return new AppError(
      ErrorType.DATABASE,
      error.message,
      {
        severity: ErrorSeverity.MEDIUM,
        userMessage: 'Error al procesar la solicitud. Intenta nuevamente.',
        metadata: { component: context, code },
        originalError: error,
      }
    );
  }

  /**
   * Log a consola (desarrollo)
   */
  private logToConsole(error: AppError): void {
    const style = this.getConsoleStyle(error.severity);
    
    if (import.meta.env.DEV) {
      console.group(`%c[${error.type}] ${error.message}`, style);
      console.log('Severity:', error.severity);
      console.log('User Message:', error.userMessage);
      console.log('Metadata:', error.metadata);
      if (error.originalError) {
        console.log('Original Error:', error.originalError);
      }
      console.groupEnd();
    }
  }

  /**
   * Estilos de consola según severidad
   */
  private getConsoleStyle(severity: ErrorSeverity): string {
    const styles = {
      [ErrorSeverity.LOW]: 'color: #3b82f6; font-weight: bold',
      [ErrorSeverity.MEDIUM]: 'color: #f59e0b; font-weight: bold',
      [ErrorSeverity.HIGH]: 'color: #ef4444; font-weight: bold',
      [ErrorSeverity.CRITICAL]: 'color: #fff; background: #dc2626; font-weight: bold; padding: 2px 4px',
    };
    return styles[severity];
  }

  /**
   * Log a servicio remoto (producción)
   */
  private logToRemote(error: AppError): void {
    // TODO: Implementar cuando tengas Sentry u otro servicio
    // Ejemplo con Sentry:
    // Sentry.captureException(error, {
    //   level: this.mapSeverityToSentryLevel(error.severity),
    //   tags: { type: error.type },
    //   extra: error.metadata,
    // });
    
    // Por ahora, solo guardamos en localStorage para debugging
    try {
      const errors = JSON.parse(localStorage.getItem('app_errors') || '[]');
      errors.push(error.toJSON());
      // Mantener solo los últimos 50 errores
      if (errors.length > 50) {
        errors.shift();
      }
      localStorage.setItem('app_errors', JSON.stringify(errors));
    } catch (e) {
      // Ignorar errores de localStorage
    }
  }

  /**
   * Obtiene el mensaje apropiado para mostrar al usuario
   */
  getUserMessage(error: AppError): string {
    return error.userMessage;
  }

  /**
   * Determina si el error debe mostrarse al usuario
   */
  shouldShowToUser(error: AppError): boolean {
    // No mostrar errores de baja severidad
    if (error.severity === ErrorSeverity.LOW) {
      return false;
    }
    // No mostrar errores sin mensaje de usuario
    if (!error.userMessage || error.userMessage.trim() === '') {
      return false;
    }
    return true;
  }
}

// Export singleton
export const errorHandler = ErrorHandler.getInstance();

// Export helper functions
export const handleError = (error: unknown, context?: string): AppError => {
  return errorHandler.handle(error, context);
};

export const getUserMessage = (error: AppError): string => {
  return errorHandler.getUserMessage(error);
};