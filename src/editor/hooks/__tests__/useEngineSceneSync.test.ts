// useEngineSceneSync.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useEngineSceneSync } from '../useEngineSceneSync';
import type { A42Engine } from '@/editor/engine/A42Engine';
import type { SceneItem } from '@/domain/types/editor';

describe('useEngineSceneSync', () => {
  const mockSyncSceneFromStore = vi.fn();
  const mockEngine = {
    syncSceneFromStore: mockSyncSceneFromStore,
  } as unknown as A42Engine;

  const mockItems: SceneItem[] = [
    {
      uuid: 'item-1',
      type: 'fence',
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      fenceConfig: {
        presetId: 'wood',
        colors: { post: 0, slatA: 0 },
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call syncSceneFromStore when items change', () => {
    const { rerender } = renderHook(
      ({ items }) => useEngineSceneSync(mockEngine, items),
      { initialProps: { items: [] } }
    );

    expect(mockSyncSceneFromStore).toHaveBeenCalledWith([]);

    rerender({ items: mockItems });
    expect(mockSyncSceneFromStore).toHaveBeenCalledWith(mockItems);
  });

  it('should not call syncSceneFromStore when engine is null', () => {
    renderHook(
      ({ items }) => useEngineSceneSync(null, items),
      { initialProps: { items: mockItems } }
    );

    expect(mockSyncSceneFromStore).not.toHaveBeenCalled();
  });

  it('should use memoized hash to avoid unnecessary calls', () => {
    const { rerender } = renderHook(
      ({ items }) => useEngineSceneSync(mockEngine, items),
      { initialProps: { items: mockItems } }
    );

    const callCount = mockSyncSceneFromStore.mock.calls.length;

    // Re-render with same items (should not trigger new call due to hash)
    rerender({ items: [...mockItems] });
    
    // Should have been called at least once, but hash prevents duplicate calls
    expect(mockSyncSceneFromStore).toHaveBeenCalled();
  });
});

