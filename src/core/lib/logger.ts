// ============================================================================
// LOGGER - Sistema centralizado de logging
// ============================================================================

/**
 * Niveles de log
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * Opciones de logging
 */
interface LogOptions {
  /** Contexto donde ocurre el log (componente, hook, store, etc.) */
  context?: string;
  
  /** Metadata adicional */
  meta?: Record<string, unknown>;
  
  /** Forzar log incluso en producción (útil para errores críticos) */
  force?: boolean;
}

/**
 * Logger centralizado
 * - En desarrollo: muestra todos los logs en consola
 * - En producción: solo muestra errores y logs forzados
 */
class Logger {
  /**
   * Formatea el mensaje con contexto
   */
  private formatMessage(level: LogLevel, message: string, context?: string): string {
    const prefix = context ? `[${context}]` : '[App]';
    return `${prefix} ${message}`;
  }

  /**
   * Log de debug (solo en desarrollo)
   */
  debug(message: string, options?: LogOptions): void {
    if (import.meta.env.DEV || options?.force) {
      const formatted = this.formatMessage(LogLevel.DEBUG, message, options?.context);
      console.log(formatted, options?.meta || '');
    }
  }

  /**
   * Log de información (solo en desarrollo)
   */
  info(message: string, options?: LogOptions): void {
    if (import.meta.env.DEV || options?.force) {
      const formatted = this.formatMessage(LogLevel.INFO, message, options?.context);
      console.info(formatted, options?.meta || '');
    }
  }

  /**
   * Log de advertencia (solo en desarrollo)
   */
  warn(message: string, options?: LogOptions): void {
    if (import.meta.env.DEV || options?.force) {
      const formatted = this.formatMessage(LogLevel.WARN, message, options?.context);
      console.warn(formatted, options?.meta || '');
    }
  }

  /**
   * Log de error (siempre, pero estructurado)
   */
  error(message: string, error?: unknown, options?: LogOptions): void {
    const formatted = this.formatMessage(LogLevel.ERROR, message, options?.context);
    
    if (import.meta.env.DEV) {
      console.error(formatted, error || '', options?.meta || '');
    } else {
      // En producción, también registrar el error estructuradamente
      // TODO: Enviar a servicio de logging (Sentry, etc.)
      if (error) {
        console.error(formatted, error);
      }
    }
  }
}

// Export singleton
export const logger = new Logger();

// Export helper functions for convenience
export const logDebug = (message: string, options?: LogOptions) => logger.debug(message, options);
export const logInfo = (message: string, options?: LogOptions) => logger.info(message, options);
export const logWarn = (message: string, options?: LogOptions) => logger.warn(message, options);
export const logError = (message: string, error?: unknown, options?: LogOptions) => 
  logger.error(message, error, options);

