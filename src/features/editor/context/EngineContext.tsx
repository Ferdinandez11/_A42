import { createContext, useContext } from "react";
import type { A42Engine } from "../engine/A42Engine";

// Context type definition
interface EngineContextType {
  engine: A42Engine | null;
}

// Create context with default value
export const EngineContext = createContext<EngineContextType>({
  engine: null,
});

// Custom hook to access the engine
export const useEngine = (): A42Engine | null => {
  const context = useContext(EngineContext);
  if (context === undefined) {
    throw new Error("useEngine must be used within an EngineProvider");
  }
  return context.engine;
};