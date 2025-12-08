import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

import { ToastProvider } from './components/providers/ToastProvider';

// 🎨 Constants
const ROOT_ELEMENT_ID = 'root';

// 🎨 Helper Functions
/**
 * Gets the root element from the DOM
 * @throws {Error} If root element is not found
 */
const getRootElement = (): HTMLElement => {
  const rootElement = document.getElementById(ROOT_ELEMENT_ID);
  
  if (!rootElement) {
    throw new Error(
      `Root element with id "${ROOT_ELEMENT_ID}" not found in the document. ` +
      'Please ensure your index.html contains a div with this id.'
    );
  }
  
  return rootElement;
};

/**
 * Initializes and renders the React application
 */
const initializeApp = (): void => {
  try {
    const rootElement = getRootElement();
    const root = ReactDOM.createRoot(rootElement);
    
    root.render(
      <React.StrictMode>
        <ToastProvider>
          <App />
        </ToastProvider>
      </React.StrictMode>
    );
    
    // Log successful initialization in development
    if (import.meta.env.DEV) {
      console.log('✅ Application initialized successfully');
    }
  } catch (error) {
    console.error('❌ Failed to initialize application:', error);
    
    // Display user-friendly error message
    document.body.innerHTML = `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100vh;
        font-family: system-ui, -apple-system, sans-serif;
        background: #0f0f0f;
        color: #fff;
        text-align: center;
        padding: 2rem;
      ">
        <div>
          <h1 style="font-size: 2rem; margin-bottom: 1rem;">⚠️ Error al inicializar</h1>
          <p style="color: #888; max-width: 500px;">
            No se pudo cargar la aplicación. Por favor, recarga la página o contacta con soporte.
          </p>
          <button 
            onclick="location.reload()" 
            style="
              margin-top: 2rem;
              padding: 0.75rem 2rem;
              background: #3b82f6;
              color: white;
              border: none;
              border-radius: 0.5rem;
              font-size: 1rem;
              cursor: pointer;
            "
          >
            Recargar Página
          </button>
        </div>
      </div>
    `;
  }
};

// 🎨 Initialize Application
initializeApp();