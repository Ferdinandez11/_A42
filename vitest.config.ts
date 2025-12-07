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
    setupFiles: ['./src/tests/setup.ts'],
    
    // Configuración de coverage (cobertura de código)
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json'],
      exclude: [
        'node_modules/',
        'src/tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData.ts',
        'src/main.tsx',
      ],
      // Objetivo: 80% de cobertura
      thresholds: {
        lines: 60,      // Empezamos con 60%, subiremos a 80%
        functions: 60,
        branches: 55,
        statements: 60,
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
