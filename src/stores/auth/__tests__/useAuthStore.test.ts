import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuthStore } from '../useAuthStore';
import type { User, Session } from '@supabase/supabase-js';

// Mock de Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}));

describe('useAuthStore', () => {
  // Reset del store antes de cada test
  beforeEach(() => {
    const { result } = renderHook(() => useAuthStore());
    act(() => {
      result.current.setUser(null);
      result.current.setSession(null);
    });
  });

  it('should initialize with null user and session', () => {
    const { result } = renderHook(() => useAuthStore());
    
    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('should set user correctly', () => {
    const { result } = renderHook(() => useAuthStore());
    
    const mockUser: Partial<User> = {
      id: 'user-123',
      email: 'test@example.com',
    };

    act(() => {
      result.current.setUser(mockUser as User);
    });

    expect(result.current.user).toEqual(mockUser);
  });

  it('should set session correctly', () => {
    const { result } = renderHook(() => useAuthStore());
    
    const mockSession: Partial<Session> = {
      access_token: 'token-123',
      user: { id: 'user-123' } as User,
    };

    act(() => {
      result.current.setSession(mockSession as Session);
    });

    expect(result.current.session).toEqual(mockSession);
  });

  it('should clear user and session on logout', async () => {
    const { result } = renderHook(() => useAuthStore());
    
    // Establecer usuario primero
    const mockUser: Partial<User> = {
      id: 'user-123',
      email: 'test@example.com',
    };

    act(() => {
      result.current.setUser(mockUser as User);
    });

    expect(result.current.user).toEqual(mockUser);

    // Hacer logout
    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });

  it('should handle multiple user updates', () => {
    const { result } = renderHook(() => useAuthStore());
    
    const user1: Partial<User> = { id: '1', email: 'user1@test.com' };
    const user2: Partial<User> = { id: '2', email: 'user2@test.com' };

    act(() => {
      result.current.setUser(user1 as User);
    });
    expect(result.current.user?.id).toBe('1');

    act(() => {
      result.current.setUser(user2 as User);
    });
    expect(result.current.user?.id).toBe('2');
  });

  it('should be able to set user back to null', () => {
    const { result } = renderHook(() => useAuthStore());
    
    const mockUser: Partial<User> = {
      id: 'user-123',
      email: 'test@example.com',
    };

    act(() => {
      result.current.setUser(mockUser as User);
    });
    expect(result.current.user).not.toBeNull();

    act(() => {
      result.current.setUser(null);
    });
    expect(result.current.user).toBeNull();
  });
});
