// useOrderAttachments.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useOrderAttachments } from '../useOrderAttachments';
import { supabase } from '@/core/lib/supabase';
import { useErrorHandler } from '@/core/hooks/useErrorHandler';

// Mock dependencies
vi.mock('@/core/lib/supabase');
vi.mock('@/core/hooks/useErrorHandler');

describe('useOrderAttachments', () => {
  const mockHandleError = vi.fn();
  const mockShowSuccess = vi.fn();
  const mockShowLoading = vi.fn();
  const mockDismissToast = vi.fn();

  const mockAttachment = {
    id: 'att-1',
    order_id: 'order-1',
    file_name: 'test.pdf',
    file_url: 'https://example.com/test.pdf',
    uploader_id: 'user-1',
    created_at: '2024-01-01',
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

    // Mock storage
    (supabase.storage.from as any) = vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({ data: null, error: null }),
      getPublicUrl: vi.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/file.pdf' },
      }),
    });
  });

  it('should initialize with empty attachments and loading false', () => {
    const { result } = renderHook(() => useOrderAttachments());

    expect(result.current.attachments).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.uploading).toBe(false);
  });

  it('should fetch attachments successfully', async () => {
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [mockAttachment],
        error: null,
      }),
    };

    (supabase.from as any).mockReturnValue(mockQuery);

    const { result } = renderHook(() => useOrderAttachments());

    await act(async () => {
      await result.current.fetchAttachments('order-1');
    });

    await act(async () => {
      await waitFor(() => {
        expect(result.current.attachments).toHaveLength(1);
        expect(result.current.attachments[0].id).toBe('att-1');
      });
    });
  });

  it('should upload file successfully', async () => {
    const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    
    const mockInsert = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    const mockFetch = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [mockAttachment],
        error: null,
      }),
    };

    (supabase.from as any).mockImplementation((table) => {
      if (table === 'order_attachments') {
        return mockInsert;
      }
      return mockFetch;
    });

    const { result } = renderHook(() => useOrderAttachments());

    await act(async () => {
      await result.current.uploadFile('order-1', mockFile);
    });

    await act(async () => {
      await waitFor(() => {
        expect(mockShowSuccess).toHaveBeenCalledWith(
          expect.stringContaining('subido correctamente')
        );
      });
    });
  });

  it('should delete attachment', async () => {
    const mockDelete = {
      from: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    (supabase.from as any).mockReturnValue(mockDelete);

    const { result } = renderHook(() => useOrderAttachments());

    // Set initial attachments
    await act(async () => {
      result.current.attachments.push(mockAttachment);
    });

    await act(async () => {
      await result.current.deleteAttachment('att-1');
    });

    await act(async () => {
      await waitFor(() => {
        expect(mockShowSuccess).toHaveBeenCalledWith('✅ Archivo eliminado');
        expect(result.current.attachments).toHaveLength(0);
      });
    });
  });

  it('should handle fetch error', async () => {
    const error = new Error('Fetch failed');
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: null,
        error,
      }),
    };

    (supabase.from as any).mockReturnValue(mockQuery);

    const { result } = renderHook(() => useOrderAttachments());

    await act(async () => {
      await result.current.fetchAttachments('order-1');
    });

    await act(async () => {
      await waitFor(() => {
        expect(mockHandleError).toHaveBeenCalledWith(error);
      });
    });
  });
});

