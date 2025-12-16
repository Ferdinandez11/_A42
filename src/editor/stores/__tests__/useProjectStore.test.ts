// useProjectStore.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useProjectStore } from '../project/useProjectStore';
import { useSceneStore } from '../scene/useSceneStore';
import { useEditorStore } from '../editor/useEditorStore';
import { supabase } from '@/core/lib/supabase';
import { AppError, ErrorType, ErrorSeverity } from '@/core/lib/errorHandler';

// Mock stores
const { mockResetScene, mockSetState } = vi.hoisted(() => {
  const resetScene = vi.fn();
  const setState = vi.fn();
  return {
    mockResetScene: resetScene,
    mockSetState: setState,
  };
});

vi.mock('../scene/useSceneStore', () => ({
  useSceneStore: {
    getState: vi.fn(() => ({
      resetScene: mockResetScene,
      setState: mockSetState,
    })),
    setState: mockSetState,
  },
}));

vi.mock('../editor/useEditorStore', () => ({
  useEditorStore: {
    setState: vi.fn(),
  },
}));

// Mock supabase
vi.mock('@/core/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
  },
}));

describe('useProjectStore', () => {
  beforeEach(() => {
    // Reset store
    useProjectStore.setState({
      user: null,
      currentProjectId: null,
      currentProjectName: null,
      isReadOnlyMode: false,
    });
    
    vi.clearAllMocks();
  });

  describe('setUser', () => {
    it('should set the user', () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' } as any;
      useProjectStore.getState().setUser(mockUser);
      expect(useProjectStore.getState().user).toEqual(mockUser);
    });

    it('should clear user when set to null', () => {
      const mockUser = { id: 'user-1' } as any;
      useProjectStore.getState().setUser(mockUser);
      useProjectStore.getState().setUser(null);
      expect(useProjectStore.getState().user).toBeNull();
    });
  });

  describe('setProjectInfo', () => {
    it('should set project ID and name', () => {
      useProjectStore.getState().setProjectInfo('project-1', 'Test Project');
      expect(useProjectStore.getState().currentProjectId).toBe('project-1');
      expect(useProjectStore.getState().currentProjectName).toBe('Test Project');
      expect(useProjectStore.getState().isReadOnlyMode).toBe(false);
    });

    it('should clear project info when set to null', () => {
      useProjectStore.getState().setProjectInfo('project-1', 'Test');
      useProjectStore.getState().setProjectInfo(null, null);
      expect(useProjectStore.getState().currentProjectId).toBeNull();
      expect(useProjectStore.getState().currentProjectName).toBeNull();
    });
  });

  describe('resetProject', () => {
    it('should reset project and clear scene', () => {
      useProjectStore.getState().setProjectInfo('project-1', 'Test');
      
      useProjectStore.getState().resetProject();
      
      expect(useProjectStore.getState().currentProjectId).toBeNull();
      expect(useProjectStore.getState().currentProjectName).toBeNull();
      expect(useProjectStore.getState().isReadOnlyMode).toBe(false);
      expect(mockResetScene).toHaveBeenCalled();
    });
  });

  describe('loadProjectFromURL', () => {
    it('should load project from database', async () => {
      const mockProject = {
        id: 'project-1',
        name: 'Test Project',
        data: {
          items: [
            { uuid: 'item-1', price: 100 },
            { uuid: 'item-2', price: 200 },
          ],
          fenceConfig: { presetId: 'wood', colors: { post: 0, slatA: 0 } },
          camera: 'orthographic',
        },
      };

      // Mock para la primera query: verificar órdenes asociadas
      const mockOrdersQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }), // Sin órdenes asociadas
      };

      // Mock para la segunda query: obtener proyecto
      const mockProjectQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockProject, error: null }),
      };

      // Configurar mock para que devuelva diferentes queries según la tabla
      let callCount = 0;
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        callCount++;
        if (table === 'orders') {
          return mockOrdersQuery as any;
        }
        if (table === 'projects') {
          return mockProjectQuery as any;
        }
        return mockProjectQuery as any;
      });

      await useProjectStore.getState().loadProjectFromURL('project-1');

      expect(useProjectStore.getState().currentProjectId).toBe('project-1');
      expect(useProjectStore.getState().currentProjectName).toBe('Test Project');
      // Sin órdenes asociadas, no debería estar en modo read-only a menos que forceReadOnly
      expect(useProjectStore.getState().isReadOnlyMode).toBe(false);
      expect(useSceneStore.setState).toHaveBeenCalled();
      expect(useEditorStore.setState).toHaveBeenCalled();
    });

    it('should throw error when project not found', async () => {
      // Mock para la primera query: verificar órdenes asociadas
      const mockOrdersQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      // Mock para la segunda query: proyecto no encontrado
      const mockProjectQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      };

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'orders') {
          return mockOrdersQuery as any;
        }
        return mockProjectQuery as any;
      });

      await expect(
        useProjectStore.getState().loadProjectFromURL('invalid-id')
      ).rejects.toThrow();
    });

    it('should handle database errors', async () => {
      const dbError = { code: 'PGRST116', message: 'Not found' };
      
      // Mock para la primera query: verificar órdenes asociadas
      const mockOrdersQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      // Mock para la segunda query: error de base de datos
      const mockProjectQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: dbError }),
      };

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'orders') {
          return mockOrdersQuery as any;
        }
        return mockProjectQuery as any;
      });

      await expect(
        useProjectStore.getState().loadProjectFromURL('project-1')
      ).rejects.toThrow();
    });

    it('should handle empty project data', async () => {
      const mockProject = {
        id: 'project-1',
        name: 'Empty Project',
        data: null,
      };

      // Mock para la primera query: verificar órdenes asociadas
      const mockOrdersQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      // Mock para la segunda query: proyecto con data null
      const mockProjectQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockProject, error: null }),
      };

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'orders') {
          return mockOrdersQuery as any;
        }
        return mockProjectQuery as any;
      });

      await useProjectStore.getState().loadProjectFromURL('project-1');

      expect(useProjectStore.getState().currentProjectId).toBe('project-1');
      expect(useSceneStore.setState).toHaveBeenCalledWith(
        expect.objectContaining({
          items: [],
          totalPrice: 0,
        })
      );
    });
  });
});

