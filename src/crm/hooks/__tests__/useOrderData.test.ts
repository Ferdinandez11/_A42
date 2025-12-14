// useOrderData.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useOrderData } from '../useOrderData';
import { supabase } from '@/core/lib/supabase';
import { useErrorHandler } from '@/core/hooks/useErrorHandler';
import { PriceCalculator } from '@/pdf/utils/PriceCalculator';
import { generateBillOfMaterials } from '@/pdf/utils/budgetUtils';

// Mock dependencies
vi.mock('@/core/lib/supabase');
vi.mock('@/core/hooks/useErrorHandler');
vi.mock('@/pdf/utils/PriceCalculator');
vi.mock('@/pdf/utils/budgetUtils');

describe('useOrderData', () => {
  const mockHandleError = vi.fn();
  const mockShowLoading = vi.fn();
  const mockDismissToast = vi.fn();

  const mockOrder = {
    id: 'order-1',
    order_ref: 'ORD-001',
    status: 'pendiente',
    total_price: 1000,
    created_at: '2024-01-01',
    projects: {
      id: 'project-1',
      name: 'Test Project',
      data: {
        items: [
          {
            uuid: 'item-1',
            type: 'fence',
            price: 500,
          },
        ],
      },
    },
    profiles: {
      id: 'user-1',
      email: 'test@example.com',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    (useErrorHandler as any).mockReturnValue({
      handleError: mockHandleError,
      showLoading: mockShowLoading,
      dismissToast: mockDismissToast,
    });

    vi.mocked(PriceCalculator.getItemPrice).mockReturnValue(500);
    vi.mocked(generateBillOfMaterials).mockReturnValue([
      {
        name: 'Fence',
        quantity: 1,
        totalPrice: 500,
      },
    ]);
  });

  it('should initialize with null order and empty arrays', () => {
    const { result } = renderHook(() => useOrderData());

    expect(result.current.order).toBeNull();
    expect(result.current.items3D).toEqual([]);
    expect(result.current.manualItems).toEqual([]);
    expect(result.current.calculatedBasePrice).toBe(0);
    expect(result.current.loading).toBe(false);
  });

  it('should load order data successfully', async () => {
    const mockOrderQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockOrder,
        error: null,
      }),
    };

    const mockItemsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    };

    (supabase.from as any).mockImplementation((table) => {
      if (table === 'orders') return mockOrderQuery;
      if (table === 'order_items') return mockItemsQuery;
      return mockOrderQuery;
    });

    const { result } = renderHook(() => useOrderData());

    await act(async () => {
      await result.current.loadOrderData('order-1');
    });

    await waitFor(() => {
      expect(result.current.order).not.toBeNull();
      expect(result.current.order?.id).toBe('order-1');
    });
  });

  it('should process 3D items and calculate price', async () => {
    const mockOrderQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockOrder,
        error: null,
      }),
    };

    const mockItemsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    };

    (supabase.from as any).mockImplementation((table) => {
      if (table === 'orders') return mockOrderQuery;
      if (table === 'order_items') return mockItemsQuery;
      return mockOrderQuery;
    });

    const { result } = renderHook(() => useOrderData());

    await act(async () => {
      await result.current.loadOrderData('order-1');
    });

    await waitFor(() => {
      expect(result.current.items3D).toHaveLength(1);
      expect(result.current.calculatedBasePrice).toBeGreaterThan(0);
    });
  });

  it('should handle order not found error', async () => {
    const mockOrderQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    };

    (supabase.from as any).mockReturnValue(mockOrderQuery);

    const { result } = renderHook(() => useOrderData());

    await act(async () => {
      await result.current.loadOrderData('order-1');
    });

    await waitFor(() => {
      expect(mockHandleError).toHaveBeenCalled();
    });
  });

  it('should update order', async () => {
    const mockUpdate = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    (supabase.from as any).mockReturnValue(mockUpdate);

    const { result } = renderHook(() => useOrderData());

    // Set initial order
    await act(async () => {
      result.current.order = mockOrder as any;
    });

    await act(async () => {
      await result.current.updateOrder({ status: 'presupuestado' });
    });

    await waitFor(() => {
      expect(result.current.order?.status).toBe('presupuestado');
    });
  });

  it('should handle update error', async () => {
    const error = new Error('Update failed');
    const mockUpdate = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: null, error }),
    };

    (supabase.from as any).mockReturnValue(mockUpdate);

    const { result } = renderHook(() => useOrderData());

    await act(async () => {
      result.current.order = mockOrder as any;
    });

    await act(async () => {
      try {
        await result.current.updateOrder({ status: 'presupuestado' });
      } catch (e) {
        // Expected to throw
      }
    });

    await waitFor(() => {
      expect(mockHandleError).toHaveBeenCalled();
    });
  });
});

