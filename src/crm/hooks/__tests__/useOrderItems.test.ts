// useOrderItems.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useOrderItems } from '../useOrderItems';
import { supabase } from '@/core/lib/supabase';
import { useErrorHandler } from '@/core/hooks/useErrorHandler';
import { PRICES } from '@/pdf/utils/PriceCalculator';

// Mock dependencies
vi.mock('@/core/lib/supabase');
vi.mock('@/core/hooks/useErrorHandler');
vi.mock('@/pdf/utils/PriceCalculator', () => ({
  PRICES: {
    FENCE_M: 10,
    FLOOR_M2: 20,
    parametric: {
      per_meter: 10,
    },
  },
}));

describe('useOrderItems', () => {
  const mockHandleError = vi.fn();
  const mockShowSuccess = vi.fn();
  const mockShowLoading = vi.fn();
  const mockDismissToast = vi.fn();

  const mockItem = {
    id: 'item-1',
    product_id: 'prod-1',
    name: 'Test Item',
    quantity: 1,
    total_price: 100,
    dimensions: '1 ud',
    order_id: 'order-1',
  };

  const mockCatalogItem = {
    id: 'prod-1',
    name: 'Test Product',
    type: 'model' as const,
    price: 100,
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
      eq: vi.fn().mockReturnThis(),
    };

    (supabase.from as any).mockReturnValue(mockQuery);
  });

  it('should initialize with empty items and loading false', () => {
    const { result } = renderHook(() => useOrderItems());

    expect(result.current.manualItems).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('should fetch items successfully', async () => {
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [mockItem],
        error: null,
      }),
    };

    (supabase.from as any).mockReturnValue(mockQuery);

    const { result } = renderHook(() => useOrderItems());

    await act(async () => {
      await result.current.fetchItems('order-1');
    });

    await waitFor(() => {
      expect(result.current.manualItems).toHaveLength(1);
      expect(result.current.manualItems[0].id).toBe('item-1');
    });
  });

  it('should add item successfully', async () => {
    const mockInsert = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    const mockFetch = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [mockItem],
        error: null,
      }),
    };

    (supabase.from as any).mockImplementation((table) => {
      if (table === 'order_items') {
        return mockInsert;
      }
      return mockFetch;
    });

    const { result } = renderHook(() => useOrderItems());

    await act(async () => {
      await result.current.addItem('order-1', mockCatalogItem, 2);
    });

    await waitFor(() => {
      expect(mockShowSuccess).toHaveBeenCalledWith(
        expect.stringContaining('añadido correctamente')
      );
    });
  });

  it('should add parametric item', async () => {
    const mockParametricItem = {
      ...mockCatalogItem,
      type: 'fence' as const,
    };

    const mockInsertFn = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockInsert = {
      insert: mockInsertFn,
    };

    const mockFetch = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [mockItem],
        error: null,
      }),
    };

    let callCount = 0;
    (supabase.from as any).mockImplementation((table) => {
      callCount++;
      if (table === 'order_items' && callCount === 1) {
        return mockInsert;
      }
      // Para fetchItems después de insertar
      return mockFetch;
    });

    const { result } = renderHook(() => useOrderItems());

    await act(async () => {
      await result.current.addParametricItem('order-1', mockParametricItem, 5);
    });

    await waitFor(() => {
      expect(mockShowSuccess).toHaveBeenCalled();
      expect(mockInsertFn).toHaveBeenCalled();
    });
  });

  it('should delete item', async () => {
    // Primero cargar los items
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [mockItem],
        error: null,
      }),
    };

    const mockEq = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });

    let callCount = 0;
    (supabase.from as any).mockImplementation((table) => {
      callCount++;
      if (callCount === 1) {
        // Primera llamada: fetchItems
        return mockQuery;
      }
      // Segunda llamada: deleteItem
      return { delete: mockDelete };
    });

    const { result } = renderHook(() => useOrderItems());

    await act(async () => {
      await result.current.fetchItems('order-1');
    });

    await waitFor(() => {
      expect(result.current.manualItems).toHaveLength(1);
    });

    await act(async () => {
      await result.current.deleteItem('item-1');
    });

    await waitFor(() => {
      expect(mockShowSuccess).toHaveBeenCalledWith('✅ Elemento eliminado');
      expect(result.current.manualItems).toHaveLength(0);
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

    const { result } = renderHook(() => useOrderItems());

    await act(async () => {
      await result.current.fetchItems('order-1');
    });

    await waitFor(() => {
      expect(mockHandleError).toHaveBeenCalledWith(error);
    });
  });
});

