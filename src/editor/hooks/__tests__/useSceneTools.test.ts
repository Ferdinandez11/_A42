// useSceneTools.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSceneTools } from '../useSceneTools';
import { useEngine } from '@/editor/context/EngineContext';

// Mock dependencies
vi.mock('@/editor/context/EngineContext');
vi.mock('@/core/hooks/useErrorHandler', () => ({
  useErrorHandler: () => ({
    handleError: vi.fn(),
  }),
}));

describe('useSceneTools', () => {
  const mockWalkManager = {
    enable: vi.fn(),
    disable: vi.fn(),
    isEnabled: false,
  };

  const mockToolsManager = {
    setCadSegment: vi.fn(),
    setCadAngle: vi.fn(),
    swapCadSelection: vi.fn(),
  };

  const mockEngine = {
    walkManager: mockWalkManager,
    toolsManager: mockToolsManager,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useEngine as any).mockReturnValue(mockEngine);
  });

  describe('activateWalkMode', () => {
    it('should activate walk mode', () => {
      const { result } = renderHook(() => useSceneTools());
      
      act(() => {
        const operation = result.current.activateWalkMode();
        expect(operation.success).toBe(true);
      });

      expect(mockWalkManager.enable).toHaveBeenCalled();
    });

    it('should return error when engine is unavailable', () => {
      (useEngine as any).mockReturnValue(null);
      
      const { result } = renderHook(() => useSceneTools());
      
      act(() => {
        const operation = result.current.activateWalkMode();
        expect(operation.success).toBe(false);
      });
    });
  });

  describe('deactivateWalkMode', () => {
    it('should deactivate walk mode', () => {
      const { result } = renderHook(() => useSceneTools());
      
      act(() => {
        const operation = result.current.deactivateWalkMode();
        expect(operation.success).toBe(true);
      });

      expect(mockWalkManager.disable).toHaveBeenCalled();
    });
  });

  describe('toggleWalkMode', () => {
    it('should toggle walk mode on', () => {
      mockWalkManager.isEnabled = false;
      
      const { result } = renderHook(() => useSceneTools());
      
      act(() => {
        const operation = result.current.toggleWalkMode();
        expect(operation.success).toBe(true);
      });

      expect(mockWalkManager.enable).toHaveBeenCalled();
    });

    it('should toggle walk mode off', () => {
      mockWalkManager.isEnabled = true;
      
      const { result } = renderHook(() => useSceneTools());
      
      act(() => {
        const operation = result.current.toggleWalkMode();
        expect(operation.success).toBe(true);
      });

      expect(mockWalkManager.disable).toHaveBeenCalled();
    });
  });

  describe('isWalkModeActive', () => {
    it('should return walk mode status', () => {
      mockWalkManager.isEnabled = true;
      
      const { result } = renderHook(() => useSceneTools());
      
      expect(result.current.isWalkModeActive()).toBe(true);
    });
  });

  describe('setCadSegment', () => {
    it('should set CAD segment with valid params', () => {
      const { result } = renderHook(() => useSceneTools());
      
      act(() => {
        const operation = result.current.setCadSegment({
          length: 10,
          indexToMove: 1,
          indexAnchor: 0,
        });
        expect(operation.success).toBe(true);
      });

      expect(mockToolsManager.setCadSegment).toHaveBeenCalledWith(10, 1, 0);
    });

    it('should return error with invalid params', () => {
      const { result } = renderHook(() => useSceneTools());
      
      act(() => {
        const operation = result.current.setCadSegment({
          length: -1,
          indexToMove: 1,
          indexAnchor: 0,
        });
        expect(operation.success).toBe(false);
      });
    });
  });

  describe('setCadAngle', () => {
    it('should set CAD angle with valid angle', () => {
      const { result } = renderHook(() => useSceneTools());
      
      act(() => {
        const operation = result.current.setCadAngle(45);
        expect(operation.success).toBe(true);
      });

      expect(mockToolsManager.setCadAngle).toHaveBeenCalledWith(45);
    });

    it('should return error with invalid angle', () => {
      const { result } = renderHook(() => useSceneTools());
      
      act(() => {
        const operation = result.current.setCadAngle(500);
        expect(operation.success).toBe(false);
      });
    });
  });

  describe('swapCadSelection', () => {
    it('should swap CAD selection', () => {
      const { result } = renderHook(() => useSceneTools());
      
      act(() => {
        const operation = result.current.swapCadSelection();
        expect(operation.success).toBe(true);
      });

      expect(mockToolsManager.swapCadSelection).toHaveBeenCalled();
    });
  });
});

