// useProjects.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useProjects } from '../useProjects';
import { supabase } from '@/core/lib/supabase';
import { useErrorHandler } from '@/core/hooks/useErrorHandler';

// Mock dependencies
vi.mock('@/core/lib/supabase');
vi.mock('@/core/hooks/useErrorHandler');

const mockSupabase = vi.mocked(supabase);
const mockUseErrorHandler = vi.mocked(useErrorHandler);

describe('useProjects', () => {
  const mockHandleError = vi.fn();
  const mockShowSuccess = vi.fn();
  const mockShowLoading = vi.fn(() => 'toast-id');
  const mockDismissToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseErrorHandler.mockReturnValue({
      handleError: mockHandleError,
      showSuccess: mockShowSuccess,
      showLoading: mockShowLoading,
      dismissToast: mockDismissToast,
      showError: vi.fn(),
    });
  });

  describe('fetchProjects', () => {
    it('should fetch projects successfully', async () => {
      const mockProjects = [
        {
          id: '1',
          name: 'Project 1',
          user_id: 'user-1',
          updated_at: '2024-01-01',
          orders: [{ id: 'order-1' }],
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockProjects,
          error: null,
        }),
      } as any);

      const { result } = renderHook(() => useProjects());

      await act(async () => {
        await result.current.fetchProjects('user-1');
      });

      await act(async () => {
        await waitFor(() => {
          expect(result.current.projects).toEqual(mockProjects);
          expect(result.current.loading).toBe(false);
        });
      });

      expect(mockShowLoading).toHaveBeenCalledWith('Cargando proyectos...');
      expect(mockDismissToast).toHaveBeenCalledWith('toast-id');
    });

    it('should handle fetch error', async () => {
      const mockError = new Error('Fetch failed');

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: mockError,
        }),
      } as any);

      const { result } = renderHook(() => useProjects());

      await act(async () => {
        await result.current.fetchProjects('user-1');
      });

      await act(async () => {
        await waitFor(() => {
          expect(result.current.loading).toBe(false);
        });
      });

      expect(mockHandleError).toHaveBeenCalledWith(mockError);
      expect(result.current.projects).toEqual([]);
    });
  });

  describe('deleteProject', () => {
    it('should delete project successfully', async () => {
      const initialProjects = [
        { id: '1', name: 'Project 1', user_id: 'user-1', updated_at: '2024-01-01' },
        { id: '2', name: 'Project 2', user_id: 'user-1', updated_at: '2024-01-02' },
      ];

      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      } as any);

      const { result } = renderHook(() => useProjects());

      // Set initial projects
      result.current.projects = initialProjects as any;

      await act(async () => {
        await result.current.deleteProject('1');
      });

      await act(async () => {
        await waitFor(() => {
          expect(mockShowSuccess).toHaveBeenCalledWith('✅ Proyecto eliminado');
          expect(mockDismissToast).toHaveBeenCalledWith('toast-id');
        });
      });

      // Verify project was removed (we need to check the internal state)
      expect(mockSupabase.from).toHaveBeenCalledWith('projects');
    });

    it('should handle delete error', async () => {
      const mockError = new Error('Delete failed');

      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: mockError,
        }),
      } as any);

      const { result } = renderHook(() => useProjects());

      await expect(result.current.deleteProject('1')).rejects.toThrow();

      expect(mockHandleError).toHaveBeenCalledWith(mockError);
    });
  });

  describe('refreshProjects', () => {
    it('should refresh projects', async () => {
      const mockProjects = [
        { id: '1', name: 'Project 1', user_id: 'user-1', updated_at: '2024-01-01' },
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockProjects,
          error: null,
        }),
      } as any);

      const { result } = renderHook(() => useProjects());

      await act(async () => {
        await result.current.refreshProjects('user-1');
      });

      await act(async () => {
        await waitFor(() => {
          expect(result.current.projects).toEqual(mockProjects);
        });
      });
    });
  });
});

