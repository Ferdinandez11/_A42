// useEditorMedia.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEditorMedia } from '../useEditorMedia';
import { useEngine } from '@/editor/context/EngineContext';

// Mock dependencies
vi.mock('@/editor/context/EngineContext');
vi.mock('@/core/hooks/useErrorHandler', () => ({
  useErrorHandler: () => ({
    handleError: vi.fn(),
  }),
}));

describe('useEditorMedia', () => {
  const mockRecorderManager = {
    startRecording: vi.fn(),
    stopRecording: vi.fn(),
    takeScreenshot: vi.fn().mockResolvedValue(undefined),
    startOrbitAnimation: vi.fn().mockResolvedValue(undefined),
    isRecording: false,
  };

  const mockExportManager = {
    exportGLB: vi.fn().mockResolvedValue(undefined),
    exportDXF: vi.fn().mockResolvedValue(undefined),
  };

  const mockPDFManager = {
    generatePDF: vi.fn().mockResolvedValue(undefined),
  };

  const mockEngine = {
    recorderManager: mockRecorderManager,
    exportManager: mockExportManager,
    pdfManager: mockPDFManager,
    renderer: {
      domElement: {
        toDataURL: vi.fn(() => 'data:image/png;base64,test'),
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useEngine as any).mockReturnValue(mockEngine);
  });

  describe('takePhoto', () => {
    it('should take photo successfully', async () => {
      const { result } = renderHook(() => useEditorMedia());
      
      let photoResult: any;
      await act(async () => {
        photoResult = await result.current.takePhoto();
      });

      expect(photoResult.success).toBe(true);
    });

    it('should return error when engine is unavailable', async () => {
      (useEngine as any).mockReturnValue(null);
      
      const { result } = renderHook(() => useEditorMedia());
      
      let photoResult: any;
      await act(async () => {
        photoResult = await result.current.takePhoto();
      });

      expect(photoResult.success).toBe(false);
    });
  });

  describe('start360Video', () => {
    it('should start 360 video successfully', async () => {
      const { result } = renderHook(() => useEditorMedia());
      
      let videoResult: any;
      await act(async () => {
        videoResult = await result.current.start360Video();
      });

      expect(videoResult.success).toBe(true);
    });
  });

  describe('toggleRecording', () => {
    it('should toggle recording', () => {
      const { result } = renderHook(() => useEditorMedia());
      
      act(() => {
        result.current.toggleRecording();
      });

      expect(mockRecorderManager.startRecording).toHaveBeenCalled();
    });
  });

  describe('exportGLB', () => {
    it('should export GLB successfully', async () => {
      const { result } = renderHook(() => useEditorMedia());
      
      let exportResult: any;
      await act(async () => {
        exportResult = await result.current.exportGLB();
      });

      expect(exportResult.success).toBe(true);
      expect(mockExportManager.exportGLB).toHaveBeenCalled();
    });
  });

  describe('exportDXF', () => {
    it('should export DXF successfully', async () => {
      const { result } = renderHook(() => useEditorMedia());
      
      let exportResult: any;
      await act(async () => {
        exportResult = await result.current.exportDXF();
      });

      expect(exportResult.success).toBe(true);
      expect(mockExportManager.exportDXF).toHaveBeenCalled();
    });
  });

  describe('generatePDF', () => {
    it('should generate PDF successfully', async () => {
      const { result } = renderHook(() => useEditorMedia());
      
      let pdfResult: any;
      await act(async () => {
        pdfResult = await result.current.generatePDF();
      });

      expect(pdfResult.success).toBe(true);
      expect(mockPDFManager.generatePDF).toHaveBeenCalled();
    });
  });

  describe('isRecording', () => {
    it('should reflect recording state', () => {
      const { result } = renderHook(() => useEditorMedia());
      
      // El estado isRecording se maneja internamente en el hook
      // Inicialmente debe ser false
      expect(result.current.isRecording).toBe(false);
      
      // Al activar la grabación, el estado cambia
      act(() => {
        result.current.toggleRecording();
      });
      
      expect(result.current.isRecording).toBe(true);
    });
  });
});

