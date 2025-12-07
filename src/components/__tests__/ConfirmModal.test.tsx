import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmModal } from '../ui/ConfirmModal';

describe('ConfirmModal', () => {
  const defaultProps = {
    isOpen: true,
    title: 'Test Title',
    message: 'Test message',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  it('should render when open', () => {
    render(<ConfirmModal {...defaultProps} />);
    
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(<ConfirmModal {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByText('Test Title')).not.toBeInTheDocument();
  });

  it('should call onConfirm when confirm button clicked', () => {
    render(<ConfirmModal {...defaultProps} />);
    
    const confirmButton = screen.getByRole('button', { name: /confirmar/i });
    fireEvent.click(confirmButton);
    
    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
  });

  it('should call onCancel when cancel button clicked', () => {
    render(<ConfirmModal {...defaultProps} />);
    
    const cancelButton = screen.getByRole('button', { name: /cancelar/i });
    fireEvent.click(cancelButton);
    
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
  });

  it('should use custom confirm text', () => {
    render(<ConfirmModal {...defaultProps} confirmText="Delete" />);
    
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('should use custom cancel text', () => {
    render(<ConfirmModal {...defaultProps} cancelText="Go Back" />);
    
    expect(screen.getByText('Go Back')).toBeInTheDocument();
  });

  it('should show danger variant styling', () => {
    const { container } = render(
      <ConfirmModal {...defaultProps} variant="danger" />
    );
    
    const confirmButton = screen.getByRole('button', { name: /confirmar/i });
    expect(confirmButton.className).toContain('red');
  });

  it('should be accessible with keyboard', () => {
    render(<ConfirmModal {...defaultProps} />);
    
    const confirmButton = screen.getByRole('button', { name: /confirmar/i });
    confirmButton.focus();
    
    expect(document.activeElement).toBe(confirmButton);
  });
});
