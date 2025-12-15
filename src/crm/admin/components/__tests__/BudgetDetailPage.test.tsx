// BudgetDetailPage.test.tsx
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BudgetDetailPage } from '../BudgetDetailPage';

// Evitar errores de scrollIntoView en el entorno de test
beforeAll(() => {
  Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
    value: vi.fn(),
    writable: true,
  });
});

// Mocks de routing
vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: 'order-1' }),
  useNavigate: () => vi.fn(),
}));

// Mocks de subcomponentes pesados para que el test sea ligero
vi.mock('../../shared/components/BudgetHeader', () => ({
  BudgetHeader: () => <div data-testid="budget-header" />,
}));

vi.mock('../../shared/components/BudgetInfoCard', () => ({
  BudgetInfoCard: () => <div data-testid="budget-info" />,
}));

vi.mock('../../shared/components/BudgetObservationsCard', () => ({
  BudgetObservationsCard: () => <div data-testid="budget-observations" />,
}));

vi.mock('../../shared/components/BudgetAttachmentsCard', () => ({
  BudgetAttachmentsCard: () => <div data-testid="budget-attachments" />,
}));

vi.mock('../../shared/components/BudgetMaterialsCard', () => ({
  BudgetMaterialsCard: () => <div data-testid="budget-materials" />,
}));

vi.mock('../../shared/components/BudgetProjectCard', () => ({
  BudgetProjectCard: () => <div data-testid="budget-project" />,
}));

// BudgetChatPanel se deja como está (ya no explota por scrollIntoView)

vi.mock('../../shared/components/CatalogModal', () => ({
  CatalogModal: () => <div data-testid="catalog-modal" />,
}));

vi.mock('../../shared/components/ParametricModal', () => ({
  ParametricModal: () => <div data-testid="parametric-modal" />,
}));

// Usamos vi.hoisted para definir los mocks de supabase antes de vi.mock
const { mockFrom, mockAuthGetUser, mockStorageFrom } = vi.hoisted(() => {
  const from = vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: {
        id: 'order-1',
        status: 'pendiente',
        projects: { data: { items: [] } },
        profiles: { discount_rate: 0 },
      },
      error: null,
    }),
  }));

  const authGetUser = vi.fn().mockResolvedValue({
    data: { user: { id: 'user-1' } },
  });

  const storageFrom = vi.fn(() => ({
    upload: vi.fn().mockResolvedValue({ error: null }),
    getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://example.com/file.png' } })),
  }));

  return {
    mockFrom: from,
    mockAuthGetUser: authGetUser,
    mockStorageFrom: storageFrom,
  };
});

// Mock Supabase
vi.mock('@/core/lib/supabase', () => ({
  supabase: {
    from: mockFrom,
    auth: { getUser: mockAuthGetUser },
    storage: { from: mockStorageFrom },
  },
}));

// Mock sistema de errores
const { mockHandleError, mockShowSuccess, mockShowLoading, mockDismissToast } = vi.hoisted(() => {
  return {
    mockHandleError: vi.fn(),
    mockShowSuccess: vi.fn(),
    mockShowLoading: vi.fn(() => 'toast-id'),
    mockDismissToast: vi.fn(),
  };
});

vi.mock('@/core/hooks/useErrorHandler', () => ({
  useErrorHandler: () => ({
    handleError: mockHandleError,
    showSuccess: mockShowSuccess,
    showLoading: mockShowLoading,
    dismissToast: mockDismissToast,
  }),
}));

// Tests

describe('BudgetDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería renderizar el estado de carga inicialmente', () => {
    render(<BudgetDetailPage />);
    expect(screen.getByText('Cargando...')).toBeInTheDocument();
  });

  it('debería intentar cargar los datos de la orden al montar', async () => {
    render(<BudgetDetailPage />);

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('orders');
    });
  });
});
