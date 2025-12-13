// useDashboardTabs.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDashboardTabs } from '../useDashboardTabs';
import { useSearchParams } from 'react-router-dom';

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useSearchParams: vi.fn(),
}));

const mockUseSearchParams = vi.mocked(useSearchParams);

describe('useDashboardTabs', () => {
  const mockSetSearchParams = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSearchParams.mockReturnValue([
      new URLSearchParams('?tab=projects'),
      mockSetSearchParams,
    ]);
  });

  it('should initialize with tab from URL', () => {
    mockUseSearchParams.mockReturnValue([
      new URLSearchParams('?tab=budgets'),
      mockSetSearchParams,
    ]);

    const { result } = renderHook(() => useDashboardTabs());

    expect(result.current.activeTab).toBe('budgets');
  });

  it('should default to projects if no tab in URL', () => {
    mockUseSearchParams.mockReturnValue([
      new URLSearchParams(''),
      mockSetSearchParams,
    ]);

    const { result } = renderHook(() => useDashboardTabs());

    expect(result.current.activeTab).toBe('projects');
  });

  it('should update tab and sync with URL', async () => {
    const { result } = renderHook(() => useDashboardTabs());

    result.current.setActiveTab('orders');

    await waitFor(() => {
      expect(result.current.activeTab).toBe('orders');
      expect(mockSetSearchParams).toHaveBeenCalledWith({ tab: 'orders' });
    });
  });

  it('should handle all tab types', () => {
    const tabs: Array<'projects' | 'budgets' | 'orders' | 'archived'> = [
      'projects',
      'budgets',
      'orders',
      'archived',
    ];

    tabs.forEach((tab) => {
      mockUseSearchParams.mockReturnValue([
        new URLSearchParams(`?tab=${tab}`),
        mockSetSearchParams,
      ]);

      const { result } = renderHook(() => useDashboardTabs());
      expect(result.current.activeTab).toBe(tab);
    });
  });
});

