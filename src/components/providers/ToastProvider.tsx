// ============================================================================
// TOAST PROVIDER - Sistema de notificaciones
// ============================================================================

import { Toaster } from 'react-hot-toast';

/**
 * Configuración del toast provider
 * Envuelve la app para mostrar notificaciones
 */
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <>
      {children}
      <Toaster
        position="top-right"
        reverseOrder={false}
        gutter={8}
        toastOptions={{
          // Opciones por defecto
          duration: 4000,
          
          // Estilos globales
          style: {
            background: '#18181b', // zinc-900
            color: '#fff',
            border: '1px solid #27272a', // zinc-800
            padding: '16px',
            borderRadius: '12px',
            fontSize: '14px',
            maxWidth: '500px',
          },
          
          // Success
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10b981', // green-500
              secondary: '#fff',
            },
            style: {
              border: '1px solid #10b981',
            },
          },
          
          // Error
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#ef4444', // red-500
              secondary: '#fff',
            },
            style: {
              border: '1px solid #ef4444',
            },
          },
          
          // Loading
          loading: {
            duration: Infinity,
            iconTheme: {
              primary: '#3b82f6', // blue-500
              secondary: '#fff',
            },
          },
        }}
      />
    </>
  );
};
