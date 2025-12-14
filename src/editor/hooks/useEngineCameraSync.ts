import { useEffect } from 'react';
import type { A42Engine } from '@/editor/engine/A42Engine';
import type { CameraType, CameraView } from '@/editor/engine/managers/SceneManager';

/**
 * Hook to sync camera settings with engine
 * Handles camera type switching and view changes
 */
export const useEngineCameraSync = (
  engine: A42Engine | null,
  cameraType: CameraType,
  pendingView: CameraView | null,
  clearPendingView: () => void
): void => {
  // Sync camera type
  useEffect(() => {
    if (!engine) return;
    engine.switchCamera(cameraType);
    engine.interactionManager.updateCamera(engine.activeCamera);
  }, [cameraType, engine]);

  // Handle pending view
  useEffect(() => {
    if (!pendingView || !engine) return;
    engine.setView(pendingView);
    clearPendingView();
  }, [pendingView, clearPendingView, engine]);
};

