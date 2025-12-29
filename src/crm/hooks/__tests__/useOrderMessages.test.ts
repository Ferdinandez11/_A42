// useOrderMessages.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useOrderMessages } from '../useOrderMessages';
import { supabase } from '@/core/lib/supabase';
import { useErrorHandler } from '@/core/hooks/useErrorHandler';

// Mock dependencies
vi.mock('@/core/lib/supabase');
vi.mock('@/core/hooks/useErrorHandler');

describe('useOrderMessages', () => {
  const mockHandleError = vi.fn();
  const mockShowSuccess = vi.fn();
  const mockShowLoading = vi.fn();
  const mockDismissToast = vi.fn();

  const mockMessage = {
    id: 'msg-1',
    order_id: 'order-1',
    user_id: 'user-1',
    content: 'Test message',
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

  it('should initialize with empty messages and loading false', () => {
    const { result } = renderHook(() => useOrderMessages());

    expect(result.current.messages).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('should fetch messages successfully', async () => {
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [mockMessage],
        error: null,
      }),
    };

    (supabase.from as any).mockReturnValue(mockQuery);

    const { result } = renderHook(() => useOrderMessages());

    await act(async () => {
      await result.current.fetchMessages('order-1');
    });

    await act(async () => {
      await waitFor(() => {
        expect(result.current.messages).toHaveLength(1);
        expect(result.current.messages[0].id).toBe('msg-1');
      });
    });
  });

  it('should send message successfully', async () => {
    const mockInsert = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    const mockFetch = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [mockMessage],
        error: null,
      }),
    };

    (supabase.from as any).mockImplementation((table) => {
      if (table === 'order_messages') {
        return mockInsert;
      }
      return mockFetch;
    });

    const { result } = renderHook(() => useOrderMessages());

    await act(async () => {
      await result.current.sendMessage('order-1', 'New message');
    });

    await act(async () => {
      await waitFor(() => {
        expect(mockShowSuccess).toHaveBeenCalledWith('✅ Mensaje enviado');
      });
    });
  });

  it('should not send empty message', async () => {
    const { result } = renderHook(() => useOrderMessages());

    await act(async () => {
      await result.current.sendMessage('order-1', '   ');
    });

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

    const { result } = renderHook(() => useOrderMessages());

    await act(async () => {
      await result.current.fetchMessages('order-1');
    });

    await act(async () => {
      await waitFor(() => {
        expect(mockHandleError).toHaveBeenCalledWith(error);
      });
    });
  });
});

