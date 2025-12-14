import { useEffect, useMemo } from 'react';
import type { A42Engine } from '@/editor/engine/A42Engine';

const SKY_BACKGROUND_COLOR = '#111111';

/**
 * Hook to sync environment settings with engine
 * Handles grid visibility, sun position, and background color
 */
export const useEngineEnvironmentSync = (
  engine: A42Engine | null,
  gridVisible: boolean,
  sunPosition: { azimuth: number; elevation: number },
  backgroundColor: string
): void => {
  // Memoize hash of sun position
  const sunHash = useMemo(
    () => `${sunPosition.azimuth}-${sunPosition.elevation}`,
    [sunPosition]
  );

  // Sync grid visibility
  useEffect(() => {
    if (!engine) return;
    engine.setGridVisible(gridVisible);
  }, [gridVisible, engine]);

  // Sync sun position using hash
  useEffect(() => {
    if (!engine) return;
    engine.updateSunPosition(sunPosition.azimuth, sunPosition.elevation);
  }, [sunHash, engine, sunPosition]); // Use hash but keep sunPosition for access to values

  // Sync background
  useEffect(() => {
    if (!engine) return;
    
    if (backgroundColor === SKY_BACKGROUND_COLOR) {
      engine.setSkyVisible(true);
    } else {
      engine.setBackgroundColor(backgroundColor);
    }
  }, [backgroundColor, engine]);
};

