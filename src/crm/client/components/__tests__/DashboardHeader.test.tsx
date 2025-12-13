// DashboardHeader.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardHeader } from '../DashboardHeader';

describe('DashboardHeader', () => {
  it('should render header with title and buttons', () => {
    const mockOnCreateBudget = vi.fn();
    const mockOnNewProject = vi.fn();

    render(
      <DashboardHeader
        onCreateBudget={mockOnCreateBudget}
        onNewProject={mockOnNewProject}
      />
    );

    expect(screen.getByText('Mi Espacio Personal')).toBeInTheDocument();
    expect(screen.getByText('Crear Presupuesto Manual')).toBeInTheDocument();
    expect(screen.getByText('Nuevo Proyecto 3D')).toBeInTheDocument();
  });

  it('should call onCreateBudget when button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnCreateBudget = vi.fn();
    const mockOnNewProject = vi.fn();

    render(
      <DashboardHeader
        onCreateBudget={mockOnCreateBudget}
        onNewProject={mockOnNewProject}
      />
    );

    const budgetButton = screen.getByText('Crear Presupuesto Manual');
    await user.click(budgetButton);

    expect(mockOnCreateBudget).toHaveBeenCalledTimes(1);
    expect(mockOnNewProject).not.toHaveBeenCalled();
  });

  it('should call onNewProject when button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnCreateBudget = vi.fn();
    const mockOnNewProject = vi.fn();

    render(
      <DashboardHeader
        onCreateBudget={mockOnCreateBudget}
        onNewProject={mockOnNewProject}
      />
    );

    const projectButton = screen.getByText('Nuevo Proyecto 3D');
    await user.click(projectButton);

    expect(mockOnNewProject).toHaveBeenCalledTimes(1);
    expect(mockOnCreateBudget).not.toHaveBeenCalled();
  });
});

