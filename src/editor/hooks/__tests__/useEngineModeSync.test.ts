// useEngineModeSync.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useEngineModeSync } from '../useEngineModeSync';
import type { A42Engine } from '@/editor/engine/A42Engine';

describe('useEngineModeSync', () => {
  const mockClearTools = vi.fn();
  const mockEngine = {
    clearTools: mockClearTools,
  } as unknown as A42Engine;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call clearTools when mode changes', () => {
    const { rerender } = renderHook(
      ({ mode }) => useEngineModeSync(mockEngine, mode),
      { initialProps: { mode: 'idle' } }
    );

    expect(mockClearTools).toHaveBeenCalledTimes(1);

    rerender({ mode: 'drawing_floor' });
    expect(mockClearTools).toHaveBeenCalledTimes(2);

    rerender({ mode: 'catalog' });
    expect(mockClearTools).toHaveBeenCalledTimes(3);
  });

  it('should not call clearTools when engine is null', () => {
    renderHook(
      ({ mode }) => useEngineModeSync(null, mode),
      { initialProps: { mode: 'idle' } }
    );

    expect(mockClearTools).not.toHaveBeenCalled();
  });

  it('should call clearTools when engine changes', () => {
    const { rerender } = renderHook(
      ({ engine, mode }) => useEngineModeSync(engine, mode),
      { initialProps: { engine: null, mode: 'idle' } }
    );

    expect(mockClearTools).not.toHaveBeenCalled();

    rerender({ engine: mockEngine, mode: 'idle' });
    expect(mockClearTools).toHaveBeenCalledTimes(1);
  });
});

