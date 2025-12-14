// useEngineSafetyZonesSync.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useEngineSafetyZonesSync } from '../useEngineSafetyZonesSync';
import type { A42Engine } from '@/editor/engine/A42Engine';

describe('useEngineSafetyZonesSync', () => {
  const mockUpdateSafetyZones = vi.fn();
  const mockEngine = {
    updateSafetyZones: mockUpdateSafetyZones,
  } as unknown as A42Engine;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call updateSafetyZones when safetyZonesVisible changes', () => {
    const { rerender } = renderHook(
      ({ safetyZonesVisible }) => useEngineSafetyZonesSync(mockEngine, safetyZonesVisible),
      { initialProps: { safetyZonesVisible: false } }
    );

    expect(mockUpdateSafetyZones).toHaveBeenCalledWith(false);

    rerender({ safetyZonesVisible: true });
    expect(mockUpdateSafetyZones).toHaveBeenCalledWith(true);
  });

  it('should not call updateSafetyZones when engine is null', () => {
    renderHook(
      ({ safetyZonesVisible }) => useEngineSafetyZonesSync(null, safetyZonesVisible),
      { initialProps: { safetyZonesVisible: true } }
    );

    expect(mockUpdateSafetyZones).not.toHaveBeenCalled();
  });
});

