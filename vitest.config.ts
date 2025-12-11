import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    // Entorno de pruebas (simula navegador)
    environment: 'jsdom',
    
    // Variables globales como expect, describe, it
    globals: true,
    
    // Archivo de setup que se ejecuta antes de cada test
    setupFiles: ['./src/core/tests/setup.ts'],
    
    // Configuración de coverage (cobertura de código)
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/core/tests/setup.ts',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/index.ts',
        '**/__tests__/**',
      ],
      // Objetivo: 80% de cobertura
      thresholds: {
        lines: 25,      // Empezamos con 60%, subiremos a 80%
        functions: 30,
        branches: 25,
        statements: 20,
      },
    },
    
    // Timeout para tests (útil para tests con async)
    testTimeout: 10000,
  },
  
  // Alias de rutas (importante para que funcione @/)
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
