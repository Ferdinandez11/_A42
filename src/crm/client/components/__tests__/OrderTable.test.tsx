// OrderTable.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OrderTable, Order } from '../OrderTable';

describe('OrderTable', () => {
  const mockOrders: Order[] = [
    {
      id: '1',
      order_ref: 'ORD-001',
      status: 'pendiente',
      total_price: 1000,
      created_at: '2024-01-01T00:00:00Z',
      estimated_delivery_date: '2024-02-01T00:00:00Z',
      is_archived: false,
      user_id: 'user-1',
      projects: { name: 'Test Project' },
    },
  ];

  it('should render empty state when no orders', () => {
    const mockOnViewOrder = vi.fn();
    const mockOnReactivate = vi.fn();

    render(
      <OrderTable
        orders={[]}
        activeTab="budgets"
        onViewOrder={mockOnViewOrder}
        onReactivate={mockOnReactivate}
      />
    );

    expect(screen.getByText('No hay datos en esta sección.')).toBeInTheDocument();
  });

  it('should render orders table', () => {
    const mockOnViewOrder = vi.fn();
    const mockOnReactivate = vi.fn();

    render(
      <OrderTable
        orders={mockOrders}
        activeTab="budgets"
        onViewOrder={mockOnViewOrder}
        onReactivate={mockOnReactivate}
      />
    );

    expect(screen.getByText('ORD-001')).toBeInTheDocument();
    expect(screen.getByText('Test Project')).toBeInTheDocument();
  });

  it('should call onViewOrder when view button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnViewOrder = vi.fn();
    const mockOnReactivate = vi.fn();

    render(
      <OrderTable
        orders={mockOrders}
        activeTab="budgets"
        onViewOrder={mockOnViewOrder}
        onReactivate={mockOnReactivate}
      />
    );

    const viewButton = screen.getByText('Ver Ficha');
    await user.click(viewButton);

    expect(mockOnViewOrder).toHaveBeenCalledWith('1');
  });

  it('should show reactivate button for archived tab', async () => {
    const user = userEvent.setup();
    const mockOnViewOrder = vi.fn();
    const mockOnReactivate = vi.fn();

    const archivedOrder = { ...mockOrders[0], is_archived: true };

    render(
      <OrderTable
        orders={[archivedOrder]}
        activeTab="archived"
        onViewOrder={mockOnViewOrder}
        onReactivate={mockOnReactivate}
      />
    );

    const reactivateButton = screen.getByText('Reactivar');
    expect(reactivateButton).toBeInTheDocument();

    await user.click(reactivateButton);
    expect(mockOnReactivate).toHaveBeenCalledWith(archivedOrder);
  });

  it('should display correct header for orders tab', () => {
    const mockOnViewOrder = vi.fn();
    const mockOnReactivate = vi.fn();

    render(
      <OrderTable
        orders={mockOrders}
        activeTab="orders"
        onViewOrder={mockOnViewOrder}
        onReactivate={mockOnReactivate}
      />
    );

    expect(screen.getByText('F. Inicio Pedido')).toBeInTheDocument();
  });

  it('should display correct header for budgets tab', () => {
    const mockOnViewOrder = vi.fn();
    const mockOnReactivate = vi.fn();

    render(
      <OrderTable
        orders={mockOrders}
        activeTab="budgets"
        onViewOrder={mockOnViewOrder}
        onReactivate={mockOnReactivate}
      />
    );

    expect(screen.getByText('F. Solicitud')).toBeInTheDocument();
  });
});

