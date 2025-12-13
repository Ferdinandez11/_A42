// CrmTabButton.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CrmTabButton } from '../CrmTabButton';

describe('CrmTabButton', () => {
  it('should render button with children', () => {
    const mockOnClick = vi.fn();
    render(
      <CrmTabButton active={false} onClick={mockOnClick}>
        Test Button
      </CrmTabButton>
    );

    expect(screen.getByText('Test Button')).toBeInTheDocument();
  });

  it('should apply active styles when active', () => {
    const mockOnClick = vi.fn();
    const { container } = render(
      <CrmTabButton active={true} onClick={mockOnClick}>
        Active
      </CrmTabButton>
    );

    const button = container.querySelector('button');
    expect(button).toHaveClass('bg-orange-500');
  });

  it('should call onClick when clicked', async () => {
    const user = userEvent.setup();
    const mockOnClick = vi.fn();
    render(
      <CrmTabButton active={false} onClick={mockOnClick}>
        Click Me
      </CrmTabButton>
    );

    await user.click(screen.getByText('Click Me'));
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('should apply success variant styles', () => {
    const mockOnClick = vi.fn();
    const { container } = render(
      <CrmTabButton active={false} onClick={mockOnClick} variant="success">
        Success
      </CrmTabButton>
    );

    const button = container.querySelector('button');
    expect(button).toHaveClass('bg-green-600');
  });
});

