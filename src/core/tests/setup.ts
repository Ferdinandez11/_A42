import { expect, afterEach, vi, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// ============================================================================
// EXTENSIÓN DE MATCHERS
// ============================================================================
expect.extend(matchers);

// ============================================================================
// LIMPIEZA DESPUÉS DE CADA TEST
// ============================================================================
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// ============================================================================
// POLYFILLS Y MOCKS GLOBALES
// ============================================================================

// Mock de window.matchMedia (usado por componentes responsive)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock de IntersectionObserver (usado en lazy loading y observadores)
globalThis.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;

// Mock de ResizeObserver (usado por Three.js y componentes responsive)
globalThis.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any;

// Mock de requestAnimationFrame (usado por Three.js y animaciones)
globalThis.requestAnimationFrame = vi.fn((cb) => {
  setTimeout(cb, 0);
  return 0;
});

globalThis.cancelAnimationFrame = vi.fn();

// Mock de WebGL context (usado por Three.js)
const createWebGLContext = () => {
  const canvas = document.createElement('canvas');
  const gl = {
    canvas,
    drawingBufferWidth: 800,
    drawingBufferHeight: 600,
    getParameter: vi.fn(),
    getExtension: vi.fn(),
    createShader: vi.fn(),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn(),
    createProgram: vi.fn(),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn(),
    useProgram: vi.fn(),
    createBuffer: vi.fn(),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    enable: vi.fn(),
    disable: vi.fn(),
    blendFunc: vi.fn(),
    clearColor: vi.fn(),
    clear: vi.fn(),
    viewport: vi.fn(),
    drawArrays: vi.fn(),
    drawElements: vi.fn(),
  };
  return gl;
};

// Mock de HTMLCanvasElement.getContext para WebGL
HTMLCanvasElement.prototype.getContext = vi.fn((contextType: string) => {
  if (contextType === 'webgl' || contextType === 'webgl2') {
    return createWebGLContext() as any;
  }
  return null;
});

// ============================================================================
// MOCK DE SUPABASE (CENTRALIZADO)
// ============================================================================
// Mock básico de Supabase para tests
// Los tests individuales pueden sobrescribir comportamientos específicos
vi.mock('@/core/lib/supabase', () => ({
  supabase: {
    auth: {
      signIn: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
      getUser: vi.fn(),
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: null },
        error: null,
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      like: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      contains: vi.fn().mockReturnThis(),
      single: vi.fn(),
      maybeSingle: vi.fn(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
    })),
  },
}));
