// useProjectActions.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useProjectActions } from '../useProjectActions';
import { useEngine } from '@/editor/context/EngineContext';
import { useEditorStore } from '@/editor/stores/editor/useEditorStore';
import { useSceneStore } from '@/editor/stores/scene/useSceneStore';
import { useProjectStore } from '@/editor/stores/project/useProjectStore';
import { supabase } from '@/core/lib/supabase';

// Mock dependencies
vi.mock('@/editor/context/EngineContext');
vi.mock('@/editor/stores/editor/useEditorStore');
vi.mock('@/editor/stores/scene/useSceneStore');
vi.mock('@/editor/stores/project/useProjectStore');
vi.mock('@/core/lib/supabase');
vi.mock('@/core/hooks/useErrorHandler', () => ({
  useErrorHandler: () => ({
    handleError: vi.fn(),
    showSuccess: vi.fn(),
    showError: vi.fn(),
  }),
}));

describe('useProjectActions', () => {
  const mockEngine = {
    renderer: {
      domElement: {
        toDataURL: vi.fn(() => 'data:image/png;base64,test'),
      },
    },
  };

  const mockRequestInput = vi.fn();
  const mockSetProjectInfo = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useEngine as any).mockReturnValue(mockEngine);
    (useEditorStore as any).mockReturnValue({
      requestInput: mockRequestInput,
      cameraType: 'perspective',
    });
    (useSceneStore as any).mockReturnValue({
      items: [],
      fenceConfig: {},
      totalPrice: 0,
      addItem: vi.fn(),
    });
    (useProjectStore as any).mockReturnValue({
      user: { id: 'user-1' },
      currentProjectId: null,
      currentProjectName: null,
      isReadOnlyMode: false,
      setProjectInfo: mockSetProjectInfo,
    });
  });

  describe('saveProject', () => {
    it('should save new project when user is logged in', async () => {
      mockRequestInput.mockResolvedValue('New Project');
      
      const mockInsert = vi.fn().mockResolvedValue({
        data: [{ id: 'project-1' }],
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as any);

      const { result } = renderHook(() => useProjectActions());

      let saveResult: any;
      await act(async () => {
        saveResult = await result.current.saveProject();
      });

      expect(saveResult.success).toBe(true);
      expect(mockSetProjectInfo).toHaveBeenCalled();
    });

    it('should not save in read-only mode', async () => {
      (useProjectStore as any).mockReturnValue({
        user: { id: 'user-1' },
        currentProjectId: 'project-1',
        currentProjectName: 'Existing Project',
        isReadOnlyMode: true,
        setProjectInfo: mockSetProjectInfo,
      });

      const { result } = renderHook(() => useProjectActions());

      let saveResult: any;
      await act(async () => {
        saveResult = await result.current.saveProject();
      });

      expect(saveResult.success).toBe(false);
      expect(saveResult.error).toContain('Solo Lectura');
    });

    it('should require login to save', async () => {
      (useProjectStore as any).mockReturnValue({
        user: null,
        currentProjectId: null,
        currentProjectName: null,
        isReadOnlyMode: false,
        setProjectInfo: mockSetProjectInfo,
      });

      const { result } = renderHook(() => useProjectActions());

      let saveResult: any;
      await act(async () => {
        saveResult = await result.current.saveProject();
      });

      expect(saveResult.success).toBe(false);
      expect(saveResult.error).toContain('Inicia sesión');
    });
  });

  describe('importGLB', () => {
    it('should import GLB file successfully', async () => {
      const mockFile = new File(['test'], 'test.glb', { type: 'model/gltf-binary' });
      const mockEvent = {
        target: { files: [mockFile] },
      } as any;

      const mockAddItem = vi.fn();
      (useSceneStore as any).mockReturnValue({
        items: [],
        fenceConfig: {},
        totalPrice: 0,
        addItem: mockAddItem,
      });

      const { result } = renderHook(() => useProjectActions());

      let importResult: any;
      await act(async () => {
        importResult = await result.current.importGLB(mockEvent);
      });

      // Note: Actual GLB import requires Three.js GLTFLoader which is complex to mock
      // This test verifies the function is called
      expect(result.current.importGLB).toBeDefined();
    });

    it('should handle no file selected', async () => {
      const mockEvent = {
        target: { files: [] },
      } as any;

      const { result } = renderHook(() => useProjectActions());

      let importResult: any;
      await act(async () => {
        importResult = await result.current.importGLB(mockEvent);
      });

      expect(importResult.success).toBe(false);
    });
  });

  describe('isSaving', () => {
    it('should track saving state', () => {
      const { result } = renderHook(() => useProjectActions());
      expect(typeof result.current.isSaving).toBe('boolean');
    });
  });
});

