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
    
    expect(screen.getByText('Test Title')).toBeDefined();
    expect(screen.getByText('Test message')).toBeDefined();
  });

  it('should not render when closed', () => {
    render(<ConfirmModal {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByText('Test Title')).toBeNull();
  });

  it('should call onConfirm when confirm button clicked', () => {
    render(<ConfirmModal {...defaultProps} />);
    
    const confirmButton = screen.getByText('Confirmar');
    fireEvent.click(confirmButton);
    
    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
  });

  it('should call onCancel when cancel button clicked', () => {
    render(<ConfirmModal {...defaultProps} />);
    
    const cancelButton = screen.getByText('Cancelar');
    fireEvent.click(cancelButton);
    
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
  });

  it('should show "Confirmar" text by default', () => {
    render(<ConfirmModal {...defaultProps} />);
    
    expect(screen.getByText('Confirmar')).toBeDefined();
  });

  it('should show "Borrar / Ejecutar" when isDestructive is true', () => {
    render(<ConfirmModal {...defaultProps} isDestructive={true} />);
    
    expect(screen.getByText('Borrar / Ejecutar')).toBeDefined();
  });

  it('should apply destructive styling when isDestructive is true', () => {
    render(<ConfirmModal {...defaultProps} isDestructive={true} />);
    
    const confirmButton = screen.getByText('Borrar / Ejecutar');
    expect(confirmButton.className).toContain('bg-red-700');
  });

  it('should apply normal styling when isDestructive is false', () => {
    render(<ConfirmModal {...defaultProps} isDestructive={false} />);
    
    const confirmButton = screen.getByText('Confirmar');
    expect(confirmButton.className).toContain('bg-blue-600');
  });

  it('should render title and message correctly', () => {
    const customProps = {
      ...defaultProps,
      title: 'Delete Project',
      message: 'Are you sure you want to delete this project?',
    };

    render(<ConfirmModal {...customProps} />);
    
    expect(screen.getByText('Delete Project')).toBeDefined();
    expect(screen.getByText('Are you sure you want to delete this project?')).toBeDefined();
  });

  it('should always show "Cancelar" button', () => {
    render(<ConfirmModal {...defaultProps} />);
    
    expect(screen.getByText('Cancelar')).toBeDefined();
  });

  it('should handle multiple clicks on confirm', () => {
    const onConfirm = vi.fn();
    
    render(<ConfirmModal {...defaultProps} onConfirm={onConfirm} />);
    
    const confirmButton = screen.getByText('Confirmar');
    fireEvent.click(confirmButton);
    fireEvent.click(confirmButton);
    fireEvent.click(confirmButton);
    
    expect(onConfirm).toHaveBeenCalledTimes(3);
  });

  it('should have backdrop element', () => {
    const { container } = render(<ConfirmModal {...defaultProps} />);
    
    const backdrop = container.querySelector('.fixed.inset-0');
    expect(backdrop).toBeDefined();
  });

  it('should return null when isOpen is false', () => {
    const { container } = render(<ConfirmModal {...defaultProps} isOpen={false} />);
    
    expect(container.firstChild).toBeNull();
  });
});