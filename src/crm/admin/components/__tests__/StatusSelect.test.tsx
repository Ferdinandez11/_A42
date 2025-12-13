// StatusSelect.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StatusSelect } from '../StatusSelect';

describe('StatusSelect', () => {
  it('should render budget options when isBudget is true', () => {
    const mockOnChange = vi.fn();
    render(
      <StatusSelect
        value="pendiente"
        onChange={mockOnChange}
        isBudget={true}
      />
    );

    expect(screen.getByText('🟠 Pendiente')).toBeInTheDocument();
    expect(screen.getByText('🟣 Presupuestado')).toBeInTheDocument();
  });

  it('should render order options when isBudget is false', () => {
    const mockOnChange = vi.fn();
    render(
      <StatusSelect value="pedido" onChange={mockOnChange} isBudget={false} />
    );

    expect(screen.getByText('🔵 Pedido')).toBeInTheDocument();
    expect(screen.getByText('🟠 Fabricación')).toBeInTheDocument();
  });

  it('should call onChange when value changes', async () => {
    const user = userEvent.setup();
    const mockOnChange = vi.fn();
    render(
      <StatusSelect
        value="pendiente"
        onChange={mockOnChange}
        isBudget={true}
      />
    );

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'presupuestado');

    expect(mockOnChange).toHaveBeenCalledWith('presupuestado');
  });
});

