import { useEffect } from 'react';
import type { A42Engine } from '@/editor/engine/A42Engine';

/**
 * Hook to sync selected item with engine
 */
export const useEngineSelectionSync = (
  engine: A42Engine | null,
  selectedItemId: string | null
): void => {
  useEffect(() => {
    if (!engine) return;
    engine.interactionManager.selectItemByUUID(selectedItemId);
  }, [selectedItemId, engine]);
};

