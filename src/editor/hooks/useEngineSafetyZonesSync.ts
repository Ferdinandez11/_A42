import { useEffect } from 'react';
import type { A42Engine } from '@/editor/engine/A42Engine';

/**
 * Hook to sync safety zones visibility with engine
 */
export const useEngineSafetyZonesSync = (
  engine: A42Engine | null,
  safetyZonesVisible: boolean
): void => {
  useEffect(() => {
    if (!engine) return;
    engine.updateSafetyZones(safetyZonesVisible);
  }, [safetyZonesVisible, engine]);
};

