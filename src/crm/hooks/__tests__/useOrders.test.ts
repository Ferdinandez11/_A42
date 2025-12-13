// useOrders.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useOrders, TabType } from '../useOrders';
import { supabase } from '@/core/lib/supabase';
import { useErrorHandler } from '@/core/hooks/useErrorHandler';

// Mock dependencies
vi.mock('@/core/lib/supabase');
vi.mock('@/core/hooks/useErrorHandler');

const mockSupabase = vi.mocked(supabase);
const mockUseErrorHandler = vi.mocked(useErrorHandler);

describe('useOrders', () => {
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

  describe('fetchOrders', () => {
    it('should fetch budgets correctly', async () => {
      const mockOrders = [
        {
          id: '1',
          order_ref: 'BUD-001',
          status: 'pendiente',
          total_price: 1000,
          created_at: '2024-01-01',
          is_archived: false,
          user_id: 'user-1',
        },
      ];

      const mockOrder = vi.fn().mockResolvedValue({
        data: mockOrders,
        error: null,
      });
      const mockIn = vi.fn().mockReturnValue({ order: mockOrder });
      const mockEq = vi.fn().mockReturnValue({ in: mockIn, order: mockOrder });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq, order: mockOrder });
      const mockFrom = { select: mockSelect };

      mockSupabase.from.mockReturnValue(mockFrom as any);

      const { result } = renderHook(() => useOrders());

      await result.current.fetchOrders('budgets');

      await waitFor(() => {
        expect(result.current.orders).toEqual(mockOrders);
        expect(result.current.loading).toBe(false);
      });

      expect(mockEq).toHaveBeenCalledWith('is_archived', false);
      expect(mockIn).toHaveBeenCalledWith('status', [
        'pendiente',
        'presupuestado',
        'rechazado',
      ]);
    });

    it('should fetch orders correctly', async () => {
      const mockOrders = [
        {
          id: '2',
          order_ref: 'ORD-001',
          status: 'pedido',
          total_price: 2000,
          created_at: '2024-01-02',
          is_archived: false,
          user_id: 'user-1',
        },
      ];

      const mockOrder = vi.fn().mockResolvedValue({
        data: mockOrders,
        error: null,
      });
      const mockIn = vi.fn().mockReturnValue({ order: mockOrder });
      const mockEq = vi.fn().mockReturnValue({ in: mockIn, order: mockOrder });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq, order: mockOrder });
      const mockFrom = { select: mockSelect };

      mockSupabase.from.mockReturnValue(mockFrom as any);

      const { result } = renderHook(() => useOrders());

      await result.current.fetchOrders('orders');

      await waitFor(() => {
        expect(result.current.orders).toEqual(mockOrders);
      });

      expect(mockIn).toHaveBeenCalledWith('status', [
        'pedido',
        'fabricacion',
        'entregado_parcial',
        'entregado',
        'completado',
      ]);
    });

    it('should fetch archived orders correctly', async () => {
      const mockOrders = [
        {
          id: '3',
          order_ref: 'ARC-001',
          status: 'cancelado',
          total_price: 0,
          created_at: '2024-01-03',
          is_archived: true,
          user_id: 'user-1',
        },
      ];

      const mockOrder = vi.fn().mockResolvedValue({
        data: mockOrders,
        error: null,
      });
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq, order: mockOrder });
      const mockFrom = { select: mockSelect };

      mockSupabase.from.mockReturnValue(mockFrom as any);

      const { result } = renderHook(() => useOrders());

      await result.current.fetchOrders('archived');

      await waitFor(() => {
        expect(result.current.orders).toEqual(mockOrders);
      });

      expect(mockEq).toHaveBeenCalledWith('is_archived', true);
    });

    it('should handle fetch error', async () => {
      const mockError = new Error('Fetch failed');

      const mockOrder = vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });
      const mockIn = vi.fn().mockReturnValue({ order: mockOrder });
      const mockEq = vi.fn().mockReturnValue({ in: mockIn, order: mockOrder });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq, order: mockOrder });
      const mockFrom = { select: mockSelect };

      mockSupabase.from.mockReturnValue(mockFrom as any);

      const { result } = renderHook(() => useOrders());

      await result.current.fetchOrders('budgets');

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockHandleError).toHaveBeenCalledWith(mockError);
    });
  });

  describe('reactivateOrder', () => {
    it('should reactivate order successfully', async () => {
      const mockOrder = {
        id: '1',
        order_ref: 'BUD-001',
        status: 'cancelado',
        total_price: 1000,
        created_at: '2024-01-01',
        is_archived: true,
        user_id: 'user-1',
      };

      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery as any);

      const { result } = renderHook(() => useOrders());

      // Set initial orders
      result.current.orders = [mockOrder] as any;

      await result.current.reactivateOrder(mockOrder);

      await waitFor(() => {
        expect(mockShowSuccess).toHaveBeenCalledWith('✅ Presupuesto reactivado');
      });

      expect(mockQuery.update).toHaveBeenCalledWith({
        is_archived: false,
        status: 'pendiente',
        created_at: expect.any(String),
      });
    });

    it('should handle reactivate error', async () => {
      const mockOrder = {
        id: '1',
        order_ref: 'BUD-001',
        status: 'cancelado',
        total_price: 1000,
        created_at: '2024-01-01',
        is_archived: true,
        user_id: 'user-1',
      };

      const mockError = new Error('Reactivate failed');

      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: mockError,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery as any);

      const { result } = renderHook(() => useOrders());

      await expect(result.current.reactivateOrder(mockOrder)).rejects.toThrow();

      expect(mockHandleError).toHaveBeenCalledWith(mockError);
    });
  });
});

