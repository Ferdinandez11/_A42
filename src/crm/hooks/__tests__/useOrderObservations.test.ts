// useOrderObservations.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useOrderObservations } from '../useOrderObservations';
import { supabase } from '@/core/lib/supabase';
import { useErrorHandler } from '@/core/hooks/useErrorHandler';

// Mock dependencies
vi.mock('@/core/lib/supabase');
vi.mock('@/core/hooks/useErrorHandler');

describe('useOrderObservations', () => {
  const mockHandleError = vi.fn();
  const mockShowSuccess = vi.fn();
  const mockShowLoading = vi.fn();
  const mockDismissToast = vi.fn();

  const mockObservation = {
    id: 'obs-1',
    order_id: 'order-1',
    user_id: 'user-1',
    content: 'Test observation',
    created_at: '2024-01-01',
    profiles: {
      full_name: 'John Doe',
      role: 'admin',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    (useErrorHandler as any).mockReturnValue({
      handleError: mockHandleError,
      showSuccess: mockShowSuccess,
      showLoading: mockShowLoading,
      dismissToast: mockDismissToast,
    });

    // Mock auth.getUser
    (supabase.auth.getUser as any) = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
  });

  it('should initialize with empty observations and loading false', () => {
    const { result } = renderHook(() => useOrderObservations());

    expect(result.current.observations).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('should fetch observations successfully', async () => {
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [mockObservation],
        error: null,
      }),
    };

    (supabase.from as any).mockReturnValue(mockQuery);

    const { result } = renderHook(() => useOrderObservations());

    await act(async () => {
      await result.current.fetchObservations('order-1');
    });

    await act(async () => {
      await waitFor(() => {
        expect(result.current.observations).toHaveLength(1);
        expect(result.current.observations[0].id).toBe('obs-1');
      });
    });
  });

  it('should add observation successfully', async () => {
    const mockInsert = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    const mockFetch = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [mockObservation],
        error: null,
      }),
    };

    (supabase.from as any).mockImplementation((table) => {
      if (table === 'order_observations') {
        return mockInsert;
      }
      return mockFetch;
    });

    const { result } = renderHook(() => useOrderObservations());

    await act(async () => {
      await result.current.addObservation('order-1', 'New observation');
    });

    await act(async () => {
      await waitFor(() => {
        expect(mockShowSuccess).toHaveBeenCalledWith('✅ Observación añadida');
      });
    });
  });

  it('should not add empty observation', async () => {
    const { result } = renderHook(() => useOrderObservations());

    await act(async () => {
      await result.current.addObservation('order-1', '   ');
    });

    expect(mockHandleError).toHaveBeenCalled();
    expect(mockShowSuccess).not.toHaveBeenCalled();
  });

  it('should handle fetch error', async () => {
    const error = new Error('Fetch failed');
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: null,
        error,
      }),
    };

    (supabase.from as any).mockReturnValue(mockQuery);

    const { result } = renderHook(() => useOrderObservations());

    await act(async () => {
      await result.current.fetchObservations('order-1');
    });

    await act(async () => {
      await waitFor(() => {
        expect(mockHandleError).toHaveBeenCalledWith(error);
      });
    });
  });
});

