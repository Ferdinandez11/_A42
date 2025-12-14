// useErrorHandler.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import toast from 'react-hot-toast';
import { useErrorHandler } from '../useErrorHandler';
import { AppError, ErrorType, ErrorSeverity } from '@/core/lib/errorHandler';

// Mock react-hot-toast
const { mockToast, mockSuccess, mockError, mockLoading, mockDismiss } = vi.hoisted(() => {
  const toast = vi.fn();
  const success = vi.fn();
  const error = vi.fn();
  const loading = vi.fn(() => 'toast-id');
  const dismiss = vi.fn();

  Object.assign(toast, {
    success,
    error,
    loading,
    dismiss,
  });

  return {
    mockToast: toast,
    mockSuccess: success,
    mockError: error,
    mockLoading: loading,
    mockDismiss: dismiss,
  };
});

vi.mock('react-hot-toast', () => ({
  default: mockToast,
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

      expect(mockError).toHaveBeenCalledWith('Error de prueba');
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

      expect(mockError).not.toHaveBeenCalled();
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

      expect(mockError).toHaveBeenCalledWith('Error crítico', {
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

      expect(mockError).toHaveBeenCalledWith('Custom message');
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

      expect(mockSuccess).toHaveBeenCalledWith('Success message');
    });
  });

  describe('showError', () => {
    it('should show error toast', () => {
      const { result } = renderHook(() => useErrorHandler());
      
      act(() => {
        result.current.showError('Error message');
      });

      expect(mockError).toHaveBeenCalledWith('Error message');
    });
  });

  describe('showInfo', () => {
    it('should show info toast', () => {
      const { result } = renderHook(() => useErrorHandler());
      
      act(() => {
        result.current.showInfo('Info message');
      });

      // El código usa toast(message, { icon: 'ℹ️' }) directamente
      expect(mockToast).toHaveBeenCalledWith('Info message', {
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

      expect(mockLoading).toHaveBeenCalledWith('Loading...');
      expect(toastId!).toBe('toast-id');
    });
  });

  describe('dismissToast', () => {
    it('should dismiss specific toast', () => {
      const { result } = renderHook(() => useErrorHandler());
      
      act(() => {
        result.current.dismissToast('toast-id');
      });

      expect(mockDismiss).toHaveBeenCalledWith('toast-id');
    });
  });

  describe('dismissAll', () => {
    it('should dismiss all toasts', () => {
      const { result } = renderHook(() => useErrorHandler());
      
      act(() => {
        result.current.dismissAll();
      });

      expect(mockDismiss).toHaveBeenCalled();
    });
  });
});

