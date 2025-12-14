import { useEffect, useMemo, useCallback } from 'react';
import type { A42Engine } from '@/editor/engine/A42Engine';
import type { SceneItem } from '@/domain/types/editor';

/**
 * Hook to sync scene items with engine
 * Uses memoized hash to avoid unnecessary re-renders
 */
export const useEngineSceneSync = (
  engine: A42Engine | null,
  items: SceneItem[]
): void => {
  // Memoize hash of items to avoid re-renders
  const itemsHash = useMemo(() => JSON.stringify(items), [items]);

  // Stabilize sync function
  const syncItems = useCallback(() => {
    if (!engine) return;
    engine.syncSceneFromStore(items);
  }, [engine, items]);

  // Sync scene items using hash
  useEffect(() => {
    syncItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsHash, engine]); // Use hash instead of syncItems to avoid loops
};

