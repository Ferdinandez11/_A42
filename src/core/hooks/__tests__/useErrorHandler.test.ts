// useErrorHandler.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import toast from 'react-hot-toast';
import { useErrorHandler } from '../useErrorHandler';
import { AppError, ErrorType, ErrorSeverity } from '@/core/lib/errorHandler';

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(() => 'toast-id'),
    dismiss: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock errorHandler core
vi.mock('@/core/lib/errorHandler', async () => {
  const actual = await vi.importActual('@/core/lib/errorHandler');
  return {
    ...actual,
    handleError: vi.fn((error, context) => {
      if (error instanceof AppError) return error;
      return new AppError(ErrorType.INTERNAL, String(error), {
        severity: ErrorSeverity.MEDIUM,
      });
    }),
    getUserMessage: vi.fn((error) => error.userMessage || error.message),
  };
});

describe('useErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleError', () => {
    it('should handle errors and show toast by default', () => {
      const { result } = renderHook(() => useErrorHandler({ context: 'TestComponent' }));
      
      const error = new AppError(ErrorType.INTERNAL, 'Test error', {
        severity: ErrorSeverity.MEDIUM,
        userMessage: 'Error de prueba',
      });

      act(() => {
        result.current.handleError(error);
      });

      expect(toast.error).toHaveBeenCalledWith('Error de prueba');
    });

    it('should not show toast when showToast is false', () => {
      const { result } = renderHook(() => 
        useErrorHandler({ context: 'TestComponent', showToast: false })
      );
      
      const error = new AppError(ErrorType.INTERNAL, 'Test error', {
        severity: ErrorSeverity.MEDIUM,
      });

      act(() => {
        result.current.handleError(error, { showToast: false });
      });

      expect(toast.error).not.toHaveBeenCalled();
    });

    it('should show different toast styles based on severity', () => {
      const { result } = renderHook(() => useErrorHandler({ context: 'TestComponent' }));
      
      const criticalError = new AppError(ErrorType.INTERNAL, 'Critical', {
        severity: ErrorSeverity.CRITICAL,
        userMessage: 'Error crítico',
      });

      act(() => {
        result.current.handleError(criticalError);
      });

      expect(toast.error).toHaveBeenCalledWith('Error crítico', {
        duration: 6000,
        icon: '🚨',
      });
    });

    it('should call onError callback when provided', () => {
      const onError = vi.fn();
      const { result } = renderHook(() => 
        useErrorHandler({ context: 'TestComponent', onError })
      );
      
      const error = new AppError(ErrorType.INTERNAL, 'Test error', {
        severity: ErrorSeverity.MEDIUM,
      });

      act(() => {
        result.current.handleError(error);
      });

      expect(onError).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('should use custom message when provided', () => {
      const { result } = renderHook(() => useErrorHandler({ context: 'TestComponent' }));
      
      const error = new AppError(ErrorType.INTERNAL, 'Test error', {
        severity: ErrorSeverity.MEDIUM,
        userMessage: 'Original message',
      });

      act(() => {
        result.current.handleError(error, { customMessage: 'Custom message' });
      });

      expect(toast.error).toHaveBeenCalledWith('Custom message');
    });

    it('should return AppError instance', () => {
      const { result } = renderHook(() => useErrorHandler({ context: 'TestComponent' }));
      
      const error = new Error('Test error');

      let returnedError: AppError;
      act(() => {
        returnedError = result.current.handleError(error);
      });

      expect(returnedError!).toBeInstanceOf(AppError);
    });
  });

  describe('showSuccess', () => {
    it('should show success toast', () => {
      const { result } = renderHook(() => useErrorHandler());
      
      act(() => {
        result.current.showSuccess('Success message');
      });

      expect(toast.success).toHaveBeenCalledWith('Success message');
    });
  });

  describe('showError', () => {
    it('should show error toast', () => {
      const { result } = renderHook(() => useErrorHandler());
      
      act(() => {
        result.current.showError('Error message');
      });

      expect(toast.error).toHaveBeenCalledWith('Error message');
    });
  });

  describe('showInfo', () => {
    it('should show info toast', () => {
      const { result } = renderHook(() => useErrorHandler());
      
      act(() => {
        result.current.showInfo('Info message');
      });

      expect(toast.info).toHaveBeenCalledWith('Info message', {
        icon: 'ℹ️',
      });
    });
  });

  describe('showLoading', () => {
    it('should show loading toast and return toast ID', () => {
      const { result } = renderHook(() => useErrorHandler());
      
      let toastId: string;
      act(() => {
        toastId = result.current.showLoading('Loading...');
      });

      expect(toast.loading).toHaveBeenCalledWith('Loading...');
      expect(toastId!).toBe('toast-id');
    });
  });

  describe('dismissToast', () => {
    it('should dismiss specific toast', () => {
      const { result } = renderHook(() => useErrorHandler());
      
      act(() => {
        result.current.dismissToast('toast-id');
      });

      expect(toast.dismiss).toHaveBeenCalledWith('toast-id');
    });
  });

  describe('dismissAll', () => {
    it('should dismiss all toasts', () => {
      const { result } = renderHook(() => useErrorHandler());
      
      act(() => {
        result.current.dismissAll();
      });

      expect(toast.dismiss).toHaveBeenCalled();
    });
  });
});

