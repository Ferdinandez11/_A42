import { useEffect } from 'react';
import type { A42Engine } from '@/editor/engine/A42Engine';

/**
 * Hook to sync editor mode with engine
 * Clears tools when mode changes
 */
export const useEngineModeSync = (
  engine: A42Engine | null,
  mode: string
): void => {
  useEffect(() => {
    if (!engine) return;
    engine.clearTools();
  }, [mode, engine]);
};

