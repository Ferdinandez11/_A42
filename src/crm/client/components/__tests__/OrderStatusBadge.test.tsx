// OrderStatusBadge.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OrderStatusBadge } from '../OrderStatusBadge';

describe('OrderStatusBadge', () => {
  it('should render status label', () => {
    render(<OrderStatusBadge status="pendiente" />);
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
  });

  it('should apply correct classes for known status', () => {
    const { container } = render(<OrderStatusBadge status="pendiente" />);
    const badge = container.querySelector('span');
    expect(badge).toHaveClass('text-orange-400');
    expect(badge).toHaveClass('bg-orange-500/10');
  });

  it('should handle unknown status', () => {
    render(<OrderStatusBadge status="unknown_status" />);
    expect(screen.getByText('unknown_status')).toBeInTheDocument();
  });

  it('should render all known statuses correctly', () => {
    const statuses = [
      { status: 'pendiente', label: 'Pendiente' },
      { status: 'presupuestado', label: 'Presupuestado' },
      { status: 'pedido', label: 'Pedido' },
      { status: 'fabricacion', label: 'Fabricación' },
      { status: 'entregado', label: 'Entregado' },
      { status: 'rechazado', label: 'Rechazado' },
      { status: 'cancelado', label: 'Cancelado' },
    ];

    statuses.forEach(({ status, label }) => {
      const { unmount } = render(<OrderStatusBadge status={status} />);
      expect(screen.getByText(label)).toBeInTheDocument();
      unmount();
    });
  });
});

