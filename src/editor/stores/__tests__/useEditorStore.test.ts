// useEditorStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../editor/useEditorStore';
import type { EditorMode, CameraType, CameraView } from '@/domain/types/editor';

describe('useEditorStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    useEditorStore.setState({
      mode: 'idle',
      gridVisible: false,
      budgetVisible: false,
      envPanelVisible: false,
      safetyZonesVisible: false,
      sunPosition: { azimuth: 180, elevation: 45 },
      backgroundColor: '#111111',
      cameraType: 'perspective',
      pendingView: null,
      measurementResult: null,
      inputModal: {
        isOpen: false,
        title: '',
        defaultValue: '',
        resolve: null,
      },
    });
  });

  describe('setMode', () => {
    it('should set the editor mode', () => {
      useEditorStore.getState().setMode('drawing_floor');
      expect(useEditorStore.getState().mode).toBe('drawing_floor');
    });

    it('should update mode multiple times', () => {
      useEditorStore.getState().setMode('drawing_floor');
      useEditorStore.getState().setMode('drawing_fence');
      expect(useEditorStore.getState().mode).toBe('drawing_fence');
    });
  });

  describe('toggleGrid', () => {
    it('should toggle grid visibility', () => {
      expect(useEditorStore.getState().gridVisible).toBe(false);
      useEditorStore.getState().toggleGrid();
      expect(useEditorStore.getState().gridVisible).toBe(true);
      useEditorStore.getState().toggleGrid();
      expect(useEditorStore.getState().gridVisible).toBe(false);
    });
  });

  describe('toggleBudget', () => {
    it('should toggle budget visibility', () => {
      expect(useEditorStore.getState().budgetVisible).toBe(false);
      useEditorStore.getState().toggleBudget();
      expect(useEditorStore.getState().budgetVisible).toBe(true);
    });
  });

  describe('toggleEnvPanel', () => {
    it('should toggle environment panel visibility', () => {
      expect(useEditorStore.getState().envPanelVisible).toBe(false);
      useEditorStore.getState().toggleEnvPanel();
      expect(useEditorStore.getState().envPanelVisible).toBe(true);
    });
  });

  describe('toggleSafetyZones', () => {
    it('should toggle safety zones visibility', () => {
      expect(useEditorStore.getState().safetyZonesVisible).toBe(false);
      useEditorStore.getState().toggleSafetyZones();
      expect(useEditorStore.getState().safetyZonesVisible).toBe(true);
    });
  });

  describe('setSunPosition', () => {
    it('should update sun position', () => {
      useEditorStore.getState().setSunPosition(90, 30);
      expect(useEditorStore.getState().sunPosition).toEqual({ azimuth: 90, elevation: 30 });
    });
  });

  describe('setBackgroundColor', () => {
    it('should update background color', () => {
      useEditorStore.getState().setBackgroundColor('#ffffff');
      expect(useEditorStore.getState().backgroundColor).toBe('#ffffff');
    });
  });

  describe('setMeasurementResult', () => {
    it('should set measurement result', () => {
      useEditorStore.getState().setMeasurementResult(10.5);
      expect(useEditorStore.getState().measurementResult).toBe(10.5);
    });

    it('should clear measurement result with null', () => {
      useEditorStore.getState().setMeasurementResult(10.5);
      useEditorStore.getState().setMeasurementResult(null);
      expect(useEditorStore.getState().measurementResult).toBeNull();
    });
  });

  describe('setCameraType', () => {
    it('should set camera type', () => {
      useEditorStore.getState().setCameraType('orthographic');
      expect(useEditorStore.getState().cameraType).toBe('orthographic');
    });
  });

  describe('triggerView', () => {
    it('should set pending view', () => {
      useEditorStore.getState().triggerView('top');
      expect(useEditorStore.getState().pendingView).toBe('top');
    });
  });

  describe('clearPendingView', () => {
    it('should clear pending view', () => {
      useEditorStore.getState().triggerView('top');
      useEditorStore.getState().clearPendingView();
      expect(useEditorStore.getState().pendingView).toBeNull();
    });
  });

  describe('requestInput', () => {
    it('should open input modal and return promise', async () => {
      const promise = useEditorStore.getState().requestInput('Enter value', 'default');
      
      expect(useEditorStore.getState().inputModal.isOpen).toBe(true);
      expect(useEditorStore.getState().inputModal.title).toBe('Enter value');
      expect(useEditorStore.getState().inputModal.defaultValue).toBe('default');
      
      // Resolve the promise
      useEditorStore.getState().closeInputModal('test-value');
      
      const result = await promise;
      expect(result).toBe('test-value');
    });

    it('should return null when modal is cancelled', async () => {
      const promise = useEditorStore.getState().requestInput('Enter value');
      
      useEditorStore.getState().closeInputModal(null);
      
      const result = await promise;
      expect(result).toBeNull();
    });
  });

  describe('closeInputModal', () => {
    it('should close modal and resolve with value', async () => {
      const promise = useEditorStore.getState().requestInput('Test');
      
      useEditorStore.getState().closeInputModal('result');
      
      expect(useEditorStore.getState().inputModal.isOpen).toBe(false);
      expect(await promise).toBe('result');
    });
  });
});

