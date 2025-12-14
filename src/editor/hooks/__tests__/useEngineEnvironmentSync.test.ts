// useEngineEnvironmentSync.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useEngineEnvironmentSync } from '../useEngineEnvironmentSync';
import type { A42Engine } from '@/editor/engine/A42Engine';

describe('useEngineEnvironmentSync', () => {
  const mockSetGridVisible = vi.fn();
  const mockUpdateSunPosition = vi.fn();
  const mockSetSkyVisible = vi.fn();
  const mockSetBackgroundColor = vi.fn();
  
  const mockEngine = {
    setGridVisible: mockSetGridVisible,
    updateSunPosition: mockUpdateSunPosition,
    setSkyVisible: mockSetSkyVisible,
    setBackgroundColor: mockSetBackgroundColor,
  } as unknown as A42Engine;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call setGridVisible when gridVisible changes', () => {
    const { rerender } = renderHook(
      ({ gridVisible }) => useEngineEnvironmentSync(
        mockEngine,
        gridVisible,
        { azimuth: 180, elevation: 45 },
        '#000000'
      ),
      { initialProps: { gridVisible: true } }
    );

    expect(mockSetGridVisible).toHaveBeenCalledWith(true);

    rerender({ gridVisible: false });
    expect(mockSetGridVisible).toHaveBeenCalledWith(false);
  });

  it('should call updateSunPosition when sun position changes', () => {
    const { rerender } = renderHook(
      ({ sunPosition }) => useEngineEnvironmentSync(
        mockEngine,
        true,
        sunPosition,
        '#000000'
      ),
      { initialProps: { sunPosition: { azimuth: 180, elevation: 45 } } }
    );

    expect(mockUpdateSunPosition).toHaveBeenCalledWith(180, 45);

    rerender({ sunPosition: { azimuth: 90, elevation: 30 } });
    expect(mockUpdateSunPosition).toHaveBeenCalledWith(90, 30);
  });

  it('should call setSkyVisible when backgroundColor is sky color', () => {
    renderHook(() => useEngineEnvironmentSync(
      mockEngine,
      true,
      { azimuth: 180, elevation: 45 },
      '#111111' // SKY_BACKGROUND_COLOR
    ));

    expect(mockSetSkyVisible).toHaveBeenCalledWith(true);
    expect(mockSetBackgroundColor).not.toHaveBeenCalled();
  });

  it('should call setBackgroundColor when backgroundColor is not sky color', () => {
    renderHook(() => useEngineEnvironmentSync(
      mockEngine,
      true,
      { azimuth: 180, elevation: 45 },
      '#000000'
    ));

    expect(mockSetBackgroundColor).toHaveBeenCalledWith('#000000');
    expect(mockSetSkyVisible).not.toHaveBeenCalled();
  });

  it('should not call methods when engine is null', () => {
    renderHook(() => useEngineEnvironmentSync(
      null,
      true,
      { azimuth: 180, elevation: 45 },
      '#000000'
    ));

    expect(mockSetGridVisible).not.toHaveBeenCalled();
    expect(mockUpdateSunPosition).not.toHaveBeenCalled();
    expect(mockSetBackgroundColor).not.toHaveBeenCalled();
  });
});

