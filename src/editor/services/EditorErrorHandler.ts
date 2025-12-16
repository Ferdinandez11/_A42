// EditorErrorHandler.ts
// ✅ Servicio centralizado de manejo de errores para el editor
import { AppError, ErrorType, ErrorSeverity, handleError as handleErrorCore } from '@/core/lib/errorHandler';

/**
 * Servicio para manejo de errores en el módulo editor
 * Permite que clases y managers manejen errores sin depender de hooks
 */
export class EditorErrorHandler {
  private context: string;

  constructor(context: string = 'Editor') {
    this.context = context;
  }

  /**
   * Maneja un error y opcionalmente lo loguea
   */
  handleError(
    error: unknown,
    options?: {
      userMessage?: string;
      severity?: ErrorSeverity;
      showToast?: boolean;
      metadata?: Record<string, any>;
    }
  ): AppError {
    const appError = handleErrorCore(error, this.context);

    // Si se proporciona un mensaje personalizado, actualizarlo
    if (options?.userMessage) {
      appError.userMessage = options.userMessage;
    }

    // Si se proporciona una severidad, actualizarla
    if (options?.severity) {
      appError.severity = options.severity;
    }

    // Agregar metadata si se proporciona
    if (options?.metadata) {
      appError.metadata = { ...appError.metadata, ...options.metadata };
    }

    // En el editor, por defecto no mostramos toasts desde managers
    // Los componentes React pueden usar useErrorHandler para mostrar toasts
    // Esto evita problemas de contexto de React en clases

    return appError;
  }

  /**
   * Crea un error personalizado
   */
  createError(
    type: ErrorType,
    message: string,
    options?: {
      severity?: ErrorSeverity;
      userMessage?: string;
      metadata?: Record<string, any>;
    }
  ): AppError {
    return new AppError(type, message, options);
  }
}

/**
 * Instancia global del error handler para el editor
 */
export const editorErrorHandler = new EditorErrorHandler('Editor');



