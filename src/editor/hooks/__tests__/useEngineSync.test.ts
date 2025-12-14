// useEngineSync.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useEngineModeSync } from '../useEngineModeSync';
import { useEngineSelectionSync } from '../useEngineSelectionSync';
import { useEngineSceneSync } from '../useEngineSceneSync';
import { useEngineEnvironmentSync } from '../useEngineEnvironmentSync';
import { useEngineCameraSync } from '../useEngineCameraSync';
import { useEngineSafetyZonesSync } from '../useEngineSafetyZonesSync';

// Mock engine
const mockEngine = {
  clearTools: vi.fn(),
  interactionManager: {
    selectItemByUUID: vi.fn(),
    updateCamera: vi.fn(),
  },
  syncSceneFromStore: vi.fn(),
  setGridVisible: vi.fn(),
  updateSunPosition: vi.fn(),
  setBackgroundColor: vi.fn(),
  setSkyVisible: vi.fn(),
  switchCamera: vi.fn(),
  setView: vi.fn(),
  updateSafetyZones: vi.fn(),
  activeCamera: {} as any,
};

describe('useEngineModeSync', () => {
  it('should call clearTools when mode changes', () => {
    const { rerender } = renderHook(
      ({ mode }) => useEngineModeSync(mockEngine as any, mode),
      { initialProps: { mode: 'idle' } }
    );

    rerender({ mode: 'drawing_floor' });
    expect(mockEngine.clearTools).toHaveBeenCalled();
  });

  it('should not call clearTools when engine is null', () => {
    renderHook(() => useEngineModeSync(null, 'idle'));
    expect(mockEngine.clearTools).not.toHaveBeenCalled();
  });
});

describe('useEngineSelectionSync', () => {
  it('should call selectItemByUUID when selectedItemId changes', () => {
    const { rerender } = renderHook(
      ({ selectedItemId }) => useEngineSelectionSync(mockEngine as any, selectedItemId),
      { initialProps: { selectedItemId: null } }
    );

    rerender({ selectedItemId: 'item-1' });
    expect(mockEngine.interactionManager.selectItemByUUID).toHaveBeenCalledWith('item-1');
  });
});

describe('useEngineSceneSync', () => {
  it('should call syncSceneFromStore when items change', () => {
    const items = [{ uuid: 'item-1' }];
    renderHook(() => useEngineSceneSync(mockEngine as any, items));
    
    // Wait for effect to run
    expect(mockEngine.syncSceneFromStore).toHaveBeenCalled();
  });
});

describe('useEngineEnvironmentSync', () => {
  it('should sync grid visibility', () => {
    renderHook(() => 
      useEngineEnvironmentSync(mockEngine as any, true, { azimuth: 180, elevation: 45 }, '#111111')
    );
    
    expect(mockEngine.setGridVisible).toHaveBeenCalledWith(true);
  });

  it('should sync sun position', () => {
    renderHook(() => 
      useEngineEnvironmentSync(mockEngine as any, false, { azimuth: 90, elevation: 30 }, '#111111')
    );
    
    expect(mockEngine.updateSunPosition).toHaveBeenCalledWith(90, 30);
  });

  it('should set sky visible when background is sky color', () => {
    renderHook(() => 
      useEngineEnvironmentSync(mockEngine as any, false, { azimuth: 180, elevation: 45 }, '#111111')
    );
    
    expect(mockEngine.setSkyVisible).toHaveBeenCalledWith(true);
  });
});

describe('useEngineCameraSync', () => {
  it('should switch camera when cameraType changes', () => {
    const { rerender } = renderHook(
      ({ cameraType }) => useEngineCameraSync(mockEngine as any, cameraType, null, vi.fn()),
      { initialProps: { cameraType: 'perspective' } }
    );

    rerender({ cameraType: 'orthographic' });
    expect(mockEngine.switchCamera).toHaveBeenCalledWith('orthographic');
  });

  it('should set view when pendingView is set', () => {
    const clearPendingView = vi.fn();
    const { rerender } = renderHook(
      ({ pendingView }) => useEngineCameraSync(mockEngine as any, 'perspective', pendingView, clearPendingView),
      { initialProps: { pendingView: null } }
    );

    rerender({ pendingView: 'top' });
    expect(mockEngine.setView).toHaveBeenCalledWith('top');
    expect(clearPendingView).toHaveBeenCalled();
  });
});

describe('useEngineSafetyZonesSync', () => {
  it('should update safety zones visibility', () => {
    renderHook(() => useEngineSafetyZonesSync(mockEngine as any, true));
    expect(mockEngine.updateSafetyZones).toHaveBeenCalledWith(true);
  });
});

