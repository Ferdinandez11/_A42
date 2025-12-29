// ============================================================================
// USE ERROR HANDLER - Hook para manejo de errores
// ============================================================================

import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { 
  handleError as handleErrorCore, 
  getUserMessage, 
  AppError,
  ErrorType,
  ErrorSeverity,
} from '../lib/errorHandler';

/**
 * Opciones para el manejo de errores
 */
interface UseErrorHandlerOptions {
  /** Contexto del componente (para debugging) */
  context?: string;
  
  /** Mostrar toast automáticamente */
  showToast?: boolean;
  
  /** Callback adicional cuando ocurre un error */
  onError?: (error: AppError) => void;
  
  /** Mensaje personalizado para mostrar al usuario */
  customMessage?: string;
}

/**
 * Resultado del hook
 */
interface UseErrorHandlerResult {
  /** Función para manejar errores */
  handleError: (error: unknown, options?: Partial<UseErrorHandlerOptions>) => AppError;
  
  /** Muestra un toast de éxito */
  showSuccess: (message: string) => void;
  
  /** Muestra un toast de error */
  showError: (message: string) => void;
  
  /** Muestra un toast de info */
  showInfo: (message: string) => void;
  
  /** Muestra un toast de carga */
  showLoading: (message: string) => string;
  
  /** Oculta un toast por ID */
  dismissToast: (toastId: string) => void;
  
  /** Oculta todos los toasts */
  dismissAll: () => void;
}

/**
 * Hook para manejo centralizado de errores
 * 
 * @example
 * ```tsx
 * const { handleError, showSuccess } = useErrorHandler({ context: 'MyComponent' });
 * 
 * try {
 *   await someAsyncOperation();
 *   showSuccess('Operación exitosa');
 * } catch (error) {
 *   handleError(error);
 * }
 * ```
 */
export const useErrorHandler = (
  defaultOptions: UseErrorHandlerOptions = {}
): UseErrorHandlerResult => {
  const {
    context,
    showToast: defaultShowToast = true,
    onError: defaultOnError,
  } = defaultOptions;

  /**
   * Maneja un error y opcionalmente muestra un toast
   */
  const handleError = useCallback(
    (error: unknown, options: Partial<UseErrorHandlerOptions> = {}): AppError => {
      const mergedOptions = { ...defaultOptions, ...options };
      const showToast = mergedOptions.showToast ?? defaultShowToast;
      
      // Procesar el error
      const appError = handleErrorCore(error, mergedOptions.context || context);
      
      // Mostrar toast si está habilitado
      if (showToast) {
        const message = mergedOptions.customMessage || getUserMessage(appError);
        
        // Elegir tipo de toast según severidad
        switch (appError.severity) {
          case ErrorSeverity.CRITICAL:
          case ErrorSeverity.HIGH:
            toast.error(message, {
              duration: 6000,
              icon: '🚨',
            });
            break;
          
          case ErrorSeverity.MEDIUM:
            toast.error(message);
            break;
          
          case ErrorSeverity.LOW:
            toast(message, {
              icon: 'ℹ️',
            });
            break;
        }
      }
      
      // Callback adicional
      if (mergedOptions.onError) {
        mergedOptions.onError(appError);
      } else if (defaultOnError) {
        defaultOnError(appError);
      }
      
      return appError;
    },
    // Solo incluir propiedades primitivas, no el objeto completo
    [context, defaultShowToast, defaultOnError, defaultOptions]
  );

  /**
   * Muestra un toast de éxito
   */
  const showSuccess = useCallback((message: string) => {
    toast.success(message);
  }, []);

  /**
   * Muestra un toast de error
   */
  const showError = useCallback((message: string) => {
    toast.error(message);
  }, []);

  /**
   * Muestra un toast de información
   */
  const showInfo = useCallback((message: string) => {
    toast(message, {
      icon: 'ℹ️',
    });
  }, []);

  /**
   * Muestra un toast de carga (retorna ID para poder ocultarlo después)
   */
  const showLoading = useCallback((message: string): string => {
    return toast.loading(message);
  }, []);

  /**
   * Oculta un toast específico
   */
  const dismissToast = useCallback((toastId: string) => {
    toast.dismiss(toastId);
  }, []);

  /**
   * Oculta todos los toasts
   */
  const dismissAll = useCallback(() => {
    toast.dismiss();
  }, []);

  return {
    handleError,
    showSuccess,
    showError,
    showInfo,
    showLoading,
    dismissToast,
    dismissAll,
  };
};

/**
 * Helper para crear un AppError personalizado
 */
export const createError = (
  type: ErrorType,
  message: string,
  options?: {
    severity?: ErrorSeverity;
    userMessage?: string;
    metadata?: Record<string, any>;
  }
): AppError => {
  return new AppError(type, message, options);
};
