import { createContext, useContext } from 'react';
import type { A42Engine } from '../engine/A42Engine';

// Definimos el tipo del contexto
interface EngineContextType {
  engine: A42Engine | null;
}

// Creamos el contexto
export const EngineContext = createContext<EngineContextType>({
  engine: null,
});

// Hook personalizado para usar el motor fácilmente
export const useEngine = () => {
  const context = useContext(EngineContext);
  if (context === undefined) {
    throw new Error('useEngine must be used within an EngineProvider');
  }
  return context.engine;
};