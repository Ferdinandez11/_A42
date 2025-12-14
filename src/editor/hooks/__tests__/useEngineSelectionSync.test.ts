// useEngineSelectionSync.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useEngineSelectionSync } from '../useEngineSelectionSync';
import type { A42Engine } from '@/editor/engine/A42Engine';

describe('useEngineSelectionSync', () => {
  const mockSelectItemByUUID = vi.fn();
  const mockEngine = {
    interactionManager: {
      selectItemByUUID: mockSelectItemByUUID,
    },
  } as unknown as A42Engine;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call selectItemByUUID when selectedItemId changes', () => {
    const { rerender } = renderHook(
      ({ selectedItemId }) => useEngineSelectionSync(mockEngine, selectedItemId),
      { initialProps: { selectedItemId: null } }
    );

    expect(mockSelectItemByUUID).toHaveBeenCalledWith(null);

    rerender({ selectedItemId: 'item-1' });
    expect(mockSelectItemByUUID).toHaveBeenCalledWith('item-1');

    rerender({ selectedItemId: 'item-2' });
    expect(mockSelectItemByUUID).toHaveBeenCalledWith('item-2');
  });

  it('should not call selectItemByUUID when engine is null', () => {
    renderHook(
      ({ selectedItemId }) => useEngineSelectionSync(null, selectedItemId),
      { initialProps: { selectedItemId: 'item-1' } }
    );

    expect(mockSelectItemByUUID).not.toHaveBeenCalled();
  });
});

