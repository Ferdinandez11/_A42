// TabNavigation.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TabNavigation } from '../TabNavigation';

describe('TabNavigation', () => {
  it('should render all tabs', () => {
    const mockOnTabChange = vi.fn();

    render(<TabNavigation activeTab="projects" onTabChange={mockOnTabChange} />);

    expect(screen.getByText('Mis Proyectos')).toBeInTheDocument();
    expect(screen.getByText('Mis Presupuestos')).toBeInTheDocument();
    expect(screen.getByText('Mis Pedidos')).toBeInTheDocument();
    expect(screen.getByText('Archivados')).toBeInTheDocument();
  });

  it('should highlight active tab', () => {
    const mockOnTabChange = vi.fn();

    const { rerender } = render(
      <TabNavigation activeTab="projects" onTabChange={mockOnTabChange} />
    );

    const projectsTab = screen.getByText('Mis Proyectos');
    expect(projectsTab).toHaveClass('bg-blue-600');

    rerender(<TabNavigation activeTab="budgets" onTabChange={mockOnTabChange} />);

    const budgetsTab = screen.getByText('Mis Presupuestos');
    expect(budgetsTab).toHaveClass('bg-blue-600');
    expect(projectsTab).not.toHaveClass('bg-blue-600');
  });

  it('should call onTabChange when tab is clicked', async () => {
    const user = userEvent.setup();
    const mockOnTabChange = vi.fn();

    render(<TabNavigation activeTab="projects" onTabChange={mockOnTabChange} />);

    const budgetsTab = screen.getByText('Mis Presupuestos');
    await user.click(budgetsTab);

    expect(mockOnTabChange).toHaveBeenCalledWith('budgets');
    expect(mockOnTabChange).toHaveBeenCalledTimes(1);
  });
});

