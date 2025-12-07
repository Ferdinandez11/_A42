# 🧪 Guía de Testing - Proyecto A42

## Setup Inicial

### 1. Instalar dependencias
```bash
npm install
```

### 2. Ejecutar tests
```bash
# Modo watch (recomendado para desarrollo)
npm run test

# Ejecutar una vez
npm run test:run

# Con interfaz visual
npm run test:ui

# Con coverage
npm run test:coverage
```

## Estructura de Tests

```
src/
├── utils/
│   └── __tests__/
│       ├── PriceCalculator.test.ts
│       └── budgetUtils.test.ts
├── stores/
│   └── auth/
│       └── __tests__/
│           └── useAuthStore.test.ts
└── tests/
    └── setup.ts  (configuración global)
```

## Comandos Útiles

### Durante desarrollo:
```bash
# Watch mode - tests se ejecutan automáticamente al guardar
npm run test

# Solo tests de un archivo específico
npm run test PriceCalculator

# Ver coverage en el navegador
npm run test:coverage
# Abre: coverage/index.html
```

### Para CI/CD:
```bash
# Ejecutar todos los tests una vez
npm run test:run

# Con coverage para CI
npm run test:coverage
```

## Escribir un Test

### Estructura básica:
```typescript
import { describe, it, expect } from 'vitest';

describe('Nombre del módulo', () => {
  describe('nombre de la función', () => {
    it('should do something', () => {
      // Arrange (preparar)
      const input = 'test';
      
      // Act (ejecutar)
      const result = myFunction(input);
      
      // Assert (verificar)
      expect(result).toBe('expected');
    });
  });
});
```

### Para componentes React:
```typescript
import { render, screen } from '@testing-library/react';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### Para stores (Zustand):
```typescript
import { renderHook, act } from '@testing-library/react';
import { useMyStore } from './useMyStore';

describe('useMyStore', () => {
  it('should update state', () => {
    const { result } = renderHook(() => useMyStore());
    
    act(() => {
      result.current.setValue('new value');
    });
    
    expect(result.current.value).toBe('new value');
  });
});
```

## Matchers Comunes

```typescript
// Igualdad
expect(value).toBe(expected);           // ===
expect(value).toEqual(expected);        // deep equality
expect(value).toStrictEqual(expected);  // strict deep equality

// Truthiness
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeNull();
expect(value).toBeUndefined();
expect(value).toBeDefined();

// Números
expect(value).toBeGreaterThan(3);
expect(value).toBeGreaterThanOrEqual(3.5);
expect(value).toBeLessThan(5);
expect(value).toBeCloseTo(0.3);  // Para floats

// Strings
expect(value).toMatch(/pattern/);
expect(value).toContain('substring');

// Arrays
expect(array).toContain(item);
expect(array).toHaveLength(3);

// Objetos
expect(object).toHaveProperty('key');
expect(object).toMatchObject({ key: 'value' });

// Funciones
expect(fn).toHaveBeenCalled();
expect(fn).toHaveBeenCalledWith(arg1, arg2);
expect(fn).toHaveBeenCalledTimes(2);

// Errores
expect(() => fn()).toThrow();
expect(() => fn()).toThrow('error message');

// DOM (con @testing-library/jest-dom)
expect(element).toBeInTheDocument();
expect(element).toBeVisible();
expect(element).toHaveTextContent('text');
expect(element).toBeDisabled();
```

## Coverage Objetivos

- **Lines:** 80%
- **Functions:** 80%
- **Branches:** 75%
- **Statements:** 80%

Actualmente configurado en 60% para empezar, iremos subiendo gradualmente.

## Tips

### 1. Tests descriptivos
```typescript
// ❌ Malo
it('works', () => { ... });

// ✅ Bueno
it('should calculate total price including discounts', () => { ... });
```

### 2. Un concepto por test
```typescript
// ❌ Malo - muchas verificaciones
it('should work', () => {
  expect(a).toBe(1);
  expect(b).toBe(2);
  expect(c).toBe(3);
});

// ✅ Bueno - un test por concepto
it('should return correct value for a', () => {
  expect(a).toBe(1);
});

it('should return correct value for b', () => {
  expect(b).toBe(2);
});
```

### 3. Arrange-Act-Assert
```typescript
it('should format price correctly', () => {
  // Arrange
  const price = 1234.56;
  
  // Act
  const result = formatPrice(price);
  
  // Assert
  expect(result).toBe('1.234,56 €');
});
```

## Troubleshooting

### Los tests no se ejecutan
```bash
# Verificar instalación
npm install

# Limpiar cache
npm run test -- --clearCache
```

### Error con imports de @/
Verificar que `vitest.config.ts` tiene el alias configurado:
```typescript
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src')
  }
}
```

### Error con Supabase
Los mocks están en `src/tests/setup.ts`. Si necesitas mockear algo más específico, añádelo ahí.

## Próximos Pasos

1. ✅ Setup básico completado
2. 🔄 Escribir tests para todas las utilities
3. 🔄 Escribir tests para todos los stores
4. ⏳ Tests de integración para componentes
5. ⏳ Tests E2E con Playwright

## Recursos

- [Vitest Docs](https://vitest.dev/)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Best Practices](https://testingjavascript.com/)
