// useEngineCameraSync.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useEngineCameraSync } from '../useEngineCameraSync';
import type { A42Engine } from '@/editor/engine/A42Engine';
import type { CameraType, CameraView } from '@/editor/engine/managers/SceneManager';

describe('useEngineCameraSync', () => {
  const mockSwitchCamera = vi.fn();
  const mockSetView = vi.fn();
  const mockUpdateCamera = vi.fn();
  const mockClearPendingView = vi.fn();
  const mockActiveCamera = {} as any;
  
  const mockEngine = {
    switchCamera: mockSwitchCamera,
    setView: mockSetView,
    activeCamera: mockActiveCamera,
    interactionManager: {
      updateCamera: mockUpdateCamera,
    },
  } as unknown as A42Engine;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call switchCamera and updateCamera when cameraType changes', () => {
    const { rerender } = renderHook(
      ({ cameraType }) => useEngineCameraSync(
        mockEngine,
        cameraType,
        null,
        mockClearPendingView
      ),
      { initialProps: { cameraType: 'perspective' as CameraType } }
    );

    expect(mockSwitchCamera).toHaveBeenCalledWith('perspective');
    expect(mockUpdateCamera).toHaveBeenCalledWith(mockActiveCamera);

    rerender({ cameraType: 'orthographic' as CameraType });
    expect(mockSwitchCamera).toHaveBeenCalledWith('orthographic');
  });

  it('should call setView and clearPendingView when pendingView changes', () => {
    const { rerender } = renderHook(
      ({ pendingView }) => useEngineCameraSync(
        mockEngine,
        'perspective',
        pendingView,
        mockClearPendingView
      ),
      { initialProps: { pendingView: null } }
    );

    expect(mockSetView).not.toHaveBeenCalled();

    rerender({ pendingView: 'top' as CameraView });
    expect(mockSetView).toHaveBeenCalledWith('top');
    expect(mockClearPendingView).toHaveBeenCalled();
  });

  it('should not call methods when engine is null', () => {
    renderHook(() => useEngineCameraSync(
      null,
      'perspective',
      null,
      mockClearPendingView
    ));

    expect(mockSwitchCamera).not.toHaveBeenCalled();
    expect(mockSetView).not.toHaveBeenCalled();
  });
});

