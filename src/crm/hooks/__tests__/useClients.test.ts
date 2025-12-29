// useClients.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useClients } from '../useClients';
import { supabase } from '@/core/lib/supabase';
import { useErrorHandler } from '@/core/hooks/useErrorHandler';

// Mock dependencies
vi.mock('@/core/lib/supabase');
vi.mock('@/core/hooks/useErrorHandler');

describe('useClients', () => {
  const mockHandleError = vi.fn();
  const mockShowSuccess = vi.fn();
  const mockShowLoading = vi.fn();
  const mockDismissToast = vi.fn();

  const mockClient = {
    id: 'client-1',
    email: 'client@example.com',
    company_name: 'Test Company',
    discount_rate: 10,
    is_approved: false,
    created_at: '2024-01-01',
  };

  const mockNewClient = {
    email: 'new@example.com',
    company_name: 'New Company',
    full_name: 'John Doe',
    phone: '123456789',
    discount_rate: 5,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    (useErrorHandler as any).mockReturnValue({
      handleError: mockHandleError,
      showSuccess: mockShowSuccess,
      showLoading: mockShowLoading,
      dismissToast: mockDismissToast,
    });

    // Mock Supabase chain
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    };

    (supabase.from as any).mockReturnValue(mockQuery);
  });

  it('should initialize with empty clients and loading false', () => {
    const { result } = renderHook(() => useClients());

    expect(result.current.clients).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('should fetch clients successfully', async () => {
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [mockClient],
        error: null,
      }),
    };

    (supabase.from as any).mockReturnValue(mockQuery);

    const { result } = renderHook(() => useClients());

    await act(async () => {
      await result.current.fetchClients();
    });

    await act(async () => {
      await waitFor(() => {
        expect(result.current.clients).toHaveLength(1);
        expect(result.current.clients[0].id).toBe('client-1');
      });
    });
  });

  it('should handle fetch error', async () => {
    const error = new Error('Fetch failed');
    const mockOrder = vi.fn().mockResolvedValue({
      data: null,
      error,
    });
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });

    (supabase.from as any).mockReturnValue({ select: mockSelect });

    const { result } = renderHook(() => useClients());

    await act(async () => {
      await result.current.fetchClients();
    });

    await act(async () => {
      await waitFor(() => {
        expect(mockHandleError).toHaveBeenCalled();
      });
    });
  });

  it('should approve client', async () => {
    // Primero cargar los clientes
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [mockClient],
        error: null,
      }),
    };

    const mockEq = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

    let callCount = 0;
    (supabase.from as any).mockImplementation((table) => {
      callCount++;
      if (callCount === 1) {
        // Primera llamada: fetchClients
        return mockQuery;
      }
      // Segunda llamada: approveClient
      return { update: mockUpdate };
    });

    const { result } = renderHook(() => useClients());

    await act(async () => {
      await result.current.fetchClients();
    });

    await act(async () => {
      await waitFor(() => {
        expect(result.current.clients).toHaveLength(1);
      });
    });

    await act(async () => {
      await result.current.approveClient('client-1');
    });

    await act(async () => {
      await waitFor(() => {
        expect(mockShowSuccess).toHaveBeenCalledWith('✅ Cliente aprobado correctamente');
        expect(result.current.clients[0].is_approved).toBe(true);
      });
    });
  });

  it('should create client', async () => {
    const mockInsertFn = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockInsert = vi.fn().mockReturnValue({ insert: mockInsertFn });
    
    const mockOrder = vi.fn().mockResolvedValue({
      data: [mockClient],
      error: null,
    });
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
    const mockFetch = vi.fn().mockReturnValue({ select: mockSelect });

    let callCount = 0;
    (supabase.from as any).mockImplementation((table) => {
      callCount++;
      if (table === 'pre_clients') {
        return { insert: mockInsertFn };
      }
      // Para fetchClients después de crear
      return { select: mockSelect };
    });

    const { result } = renderHook(() => useClients());

    await act(async () => {
      await result.current.createClient(mockNewClient);
    });

    await act(async () => {
      await waitFor(() => {
        expect(mockShowSuccess).toHaveBeenCalledWith(
          expect.stringContaining('creado correctamente')
        );
        expect(mockInsertFn).toHaveBeenCalled();
      });
    });
  });

  it('should not create client without email', async () => {
    const { result } = renderHook(() => useClients());

    await act(async () => {
      await result.current.createClient({
        ...mockNewClient,
        email: '',
      });
    });

    expect(mockHandleError).toHaveBeenCalled();
  });

  it('should delete client', async () => {
    // Primero cargar los clientes
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [mockClient],
        error: null,
      }),
    };

    const mockEq = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });

    let callCount = 0;
    (supabase.from as any).mockImplementation((table) => {
      callCount++;
      if (callCount === 1) {
        // Primera llamada: fetchClients
        return mockQuery;
      }
      // Segunda llamada: deleteClient
      return { delete: mockDelete };
    });

    const { result } = renderHook(() => useClients());

    await act(async () => {
      await result.current.fetchClients();
    });

    await act(async () => {
      await waitFor(() => {
        expect(result.current.clients).toHaveLength(1);
      });
    });

    await act(async () => {
      await result.current.deleteClient('client-1');
    });

    await act(async () => {
      await waitFor(() => {
        expect(mockShowSuccess).toHaveBeenCalledWith('✅ Cliente eliminado');
        expect(result.current.clients).toHaveLength(0);
      });
    });
  });
});

