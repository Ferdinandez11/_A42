// useAdminOrders.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useAdminOrders } from '../useAdminOrders';
import { supabase } from '@/core/lib/supabase';
import { useErrorHandler } from '@/core/hooks/useErrorHandler';

// Mock dependencies
vi.mock('@/core/lib/supabase');
vi.mock('@/core/hooks/useErrorHandler');

describe('useAdminOrders', () => {
  const mockHandleError = vi.fn();
  const mockShowSuccess = vi.fn();
  const mockShowLoading = vi.fn(() => 'toast-id');
  const mockDismissToast = vi.fn();

  const mockOrderData = {
    id: 'order-1',
    order_ref: 'ORD-001',
    status: 'pendiente' as const,
    total_price: 1000,
    created_at: '2024-01-01',
    user_id: 'user-1',
    profiles: {
      company_name: 'Test Company',
      email: 'test@example.com',
      discount_rate: 10,
    },
    projects: { name: 'Test Project' },
    order_messages: [{ created_at: '2024-01-01', profiles: { role: 'admin' } }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    (useErrorHandler as any).mockReturnValue({
      handleError: mockHandleError,
      showSuccess: mockShowSuccess,
      showLoading: mockShowLoading,
      dismissToast: mockDismissToast,
    });
  });

  it('should initialize with empty orders and loading false', () => {
    const { result } = renderHook(() => useAdminOrders());

    expect(result.current.orders).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('should fetch budgets when activeTab is budgets', async () => {
    const mockOrderFn = vi.fn().mockResolvedValue({
      data: [mockOrderData],
      error: null,
    });
    const mockIn = vi.fn().mockReturnValue({ order: mockOrderFn });
    const mockSelect = vi.fn().mockReturnValue({ in: mockIn, order: mockOrderFn });
    const mockFrom = { select: mockSelect };

    (supabase.from as any).mockReturnValue(mockFrom);

    const { result } = renderHook(() => useAdminOrders());

    await act(async () => {
      await result.current.fetchOrders('budgets');
    });

    await waitFor(() => {
      expect(result.current.orders).toHaveLength(1);
      expect(result.current.orders[0].id).toBe('order-1');
    });
  });

  it('should fetch orders when activeTab is orders', async () => {
    const mockOrderFn = vi.fn().mockResolvedValue({
      data: [mockOrderData],
      error: null,
    });
    const mockIn = vi.fn().mockReturnValue({ order: mockOrderFn });
    const mockSelect = vi.fn().mockReturnValue({ in: mockIn, order: mockOrderFn });
    const mockFrom = { select: mockSelect };

    (supabase.from as any).mockReturnValue(mockFrom);

    const { result } = renderHook(() => useAdminOrders());

    await act(async () => {
      await result.current.fetchOrders('orders');
    });

    await waitFor(() => {
      expect(result.current.orders).toHaveLength(1);
    });
  });

  it('should clear orders when activeTab is clients', async () => {
    const { result } = renderHook(() => useAdminOrders());

    await act(async () => {
      await result.current.fetchOrders('clients');
    });

    expect(result.current.orders).toEqual([]);
  });

  it('should handle fetch error', async () => {
    const error = new Error('Fetch failed');
    const mockOrderFn = vi.fn().mockResolvedValue({
      data: null,
      error,
    });
    const mockIn = vi.fn().mockReturnValue({ order: mockOrderFn });
    const mockSelect = vi.fn().mockReturnValue({ in: mockIn, order: mockOrderFn });
    const mockFrom = { select: mockSelect };

    (supabase.from as any).mockReturnValue(mockFrom);

    const { result } = renderHook(() => useAdminOrders());

    await act(async () => {
      await result.current.fetchOrders('budgets');
    });

    await waitFor(() => {
      expect(mockHandleError).toHaveBeenCalled();
    });
  });

  it('should update order status', async () => {
    const mockEq = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate });

    (supabase.from as any).mockReturnValue(mockFrom);

    const { result } = renderHook(() => useAdminOrders());

    await act(async () => {
      await result.current.updateOrderStatus('order-1', 'presupuestado');
    });

    await waitFor(() => {
      expect(mockShowSuccess).toHaveBeenCalledWith('✅ Estado actualizado');
    });
  });

  it('should delete order', async () => {
    const mockEq = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ delete: mockDelete });

    (supabase.from as any).mockReturnValue(mockFrom);

    const { result } = renderHook(() => useAdminOrders());

    await act(async () => {
      await result.current.deleteOrder('order-1');
    });

    await waitFor(() => {
      expect(mockShowSuccess).toHaveBeenCalledWith('✅ Registro eliminado');
    });
  });
});
