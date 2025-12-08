import { describe, it, expect, beforeEach } from 'vitest';
import {
  AppError,
  ErrorType,
  ErrorSeverity,
  errorHandler,
  handleError,
  getUserMessage,
} from '../errorHandler';

describe('errorHandler', () => {
  beforeEach(() => {
    // Limpiar localStorage antes de cada test
    localStorage.clear();
  });

  describe('AppError', () => {
    it('should create an AppError with required fields', () => {
      const error = new AppError(
        ErrorType.VALIDATION,
        'Test error message'
      );

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error.type).toBe(ErrorType.VALIDATION);
      expect(error.message).toBe('Test error message');
      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
    });

    it('should use custom severity', () => {
      const error = new AppError(
        ErrorType.NETWORK,
        'Network error',
        { severity: ErrorSeverity.HIGH }
      );

      expect(error.severity).toBe(ErrorSeverity.HIGH);
    });

    it('should use custom user message', () => {
      const error = new AppError(
        ErrorType.DATABASE,
        'DB connection failed',
        { userMessage: 'No pudimos guardar tus datos' }
      );

      expect(error.userMessage).toBe('No pudimos guardar tus datos');
    });

    it('should have default user message for each type', () => {
      const error = new AppError(ErrorType.NETWORK, 'Internal message');
      expect(error.userMessage).toContain('conexión');
    });

    it('should include metadata', () => {
      const metadata = { component: 'TestComponent', userId: '123' };
      const error = new AppError(
        ErrorType.AUTH,
        'Auth failed',
        { metadata }
      );

      expect(error.metadata.component).toBe('TestComponent');
      expect(error.metadata.userId).toBe('123');
      expect(error.metadata.timestamp).toBeDefined();
    });

    it('should store original error', () => {
      const originalError = new Error('Original error');
      const error = new AppError(
        ErrorType.UNKNOWN,
        'Wrapped error',
        { originalError }
      );

      expect(error.originalError).toBe(originalError);
    });

    it('should convert to JSON correctly', () => {
      const error = new AppError(
        ErrorType.VALIDATION,
        'Test error',
        {
          severity: ErrorSeverity.LOW,
          metadata: { field: 'email' },
        }
      );

      const json = error.toJSON();

      expect(json.name).toBe('AppError');
      expect(json.type).toBe(ErrorType.VALIDATION);
      expect(json.severity).toBe(ErrorSeverity.LOW);
      expect(json.message).toBe('Test error');
      expect(json.metadata.field).toBe('email');
    });
  });

  describe('handleError', () => {
    it('should handle AppError', () => {
      const originalError = new AppError(
        ErrorType.NETWORK,
        'Network failed'
      );

      const result = handleError(originalError);

      expect(result).toBe(originalError);
      expect(result.type).toBe(ErrorType.NETWORK);
    });

    it('should convert Error to AppError', () => {
      const originalError = new Error('Standard error');
      const result = handleError(originalError, 'TestComponent');

      expect(result).toBeInstanceOf(AppError);
      expect(result.type).toBe(ErrorType.UNKNOWN);
      expect(result.message).toBe('Standard error');
      expect(result.metadata.component).toBe('TestComponent');
    });

    it('should handle string errors', () => {
      const result = handleError('Something went wrong');

      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe('Something went wrong');
    });

    it('should handle network errors', () => {
      const networkError = new TypeError('fetch failed');
      const result = handleError(networkError);

      expect(result.type).toBe(ErrorType.NETWORK);
      expect(result.severity).toBe(ErrorSeverity.HIGH);
    });

    it('should handle Supabase auth errors', () => {
      const supabaseError = {
        code: '401',
        message: 'Invalid credentials',
      };

      const result = handleError(supabaseError);

      expect(result.type).toBe(ErrorType.AUTH);
      expect(result.severity).toBe(ErrorSeverity.HIGH);
    });

    it('should handle Supabase permission errors', () => {
      const supabaseError = {
        code: '403',
        message: 'Permission denied',
      };

      const result = handleError(supabaseError);

      expect(result.type).toBe(ErrorType.PERMISSION);
    });

    it('should handle Supabase not found errors', () => {
      const supabaseError = {
        code: '404',
        message: 'Resource not found',
      };

      const result = handleError(supabaseError);

      expect(result.type).toBe(ErrorType.NOT_FOUND);
      expect(result.severity).toBe(ErrorSeverity.LOW);
    });
  });

  describe('getUserMessage', () => {
    it('should return user-friendly message', () => {
      const error = new AppError(
        ErrorType.DATABASE,
        'Connection pool exhausted'
      );

      const message = getUserMessage(error);

      expect(message).not.toContain('pool');
      expect(message).not.toContain('exhausted');
      expect(message).toContain('guardar');
    });

    it('should use custom user message if provided', () => {
      const error = new AppError(
        ErrorType.VALIDATION,
        'Internal validation error',
        { userMessage: 'Por favor revisa el formulario' }
      );

      const message = getUserMessage(error);

      expect(message).toBe('Por favor revisa el formulario');
    });
  });

  describe('Error Types', () => {
    it('should have correct default messages for each type', () => {
      const types = [
        ErrorType.NETWORK,
        ErrorType.AUTH,
        ErrorType.DATABASE,
        ErrorType.VALIDATION,
        ErrorType.ENGINE,
      ];

      types.forEach((type) => {
        const error = new AppError(type, 'Test');
        expect(error.userMessage).toBeTruthy();
        expect(error.userMessage.length).toBeGreaterThan(10);
      });
    });
  });

  describe('Error Severity', () => {
    it('should categorize errors by severity', () => {
      const lowError = new AppError(
        ErrorType.NOT_FOUND,
        'Not found',
        { severity: ErrorSeverity.LOW }
      );

      const mediumError = new AppError(
        ErrorType.VALIDATION,
        'Invalid data'
      );

      const highError = new AppError(
        ErrorType.AUTH,
        'Auth failed',
        { severity: ErrorSeverity.HIGH }
      );

      const criticalError = new AppError(
        ErrorType.DATABASE,
        'DB crashed',
        { severity: ErrorSeverity.CRITICAL }
      );

      expect(lowError.severity).toBe(ErrorSeverity.LOW);
      expect(mediumError.severity).toBe(ErrorSeverity.MEDIUM);
      expect(highError.severity).toBe(ErrorSeverity.HIGH);
      expect(criticalError.severity).toBe(ErrorSeverity.CRITICAL);
    });
  });

  describe('Context tracking', () => {
    it('should track context in metadata', () => {
      const error = handleError(new Error('Test'), 'LoginComponent');

      expect(error.metadata.component).toBe('LoginComponent');
    });

    it('should include stack trace', () => {
      const error = handleError(new Error('Test'));

      expect(error.metadata.stack).toBeDefined();
    });

    it('should include timestamp', () => {
      const error = handleError(new Error('Test'));

      expect(error.metadata.timestamp).toBeDefined();
      expect(typeof error.metadata.timestamp).toBe('number');
    });
  });

  describe('Edge cases', () => {
    it('should handle null error', () => {
      const result = handleError(null);

      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe('null');
    });

    it('should handle undefined error', () => {
      const result = handleError(undefined);

      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe('undefined');
    });

    it('should handle object without message', () => {
      const result = handleError({ foo: 'bar' });

      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toContain('object');
    });

    it('should handle circular references in metadata', () => {
      const circular: any = { name: 'test' };
      circular.self = circular;

      const error = new AppError(
        ErrorType.UNKNOWN,
        'Test',
        { metadata: { data: circular } }
      );

      // Should not throw when converting to JSON
      expect(() => error.toJSON()).not.toThrow();
    });
  });
});
