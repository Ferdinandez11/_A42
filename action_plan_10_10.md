# 🎯 Plan de Acción: De 8/10 a 10/10
## Proyecto A42 - Preparación Pre-ERP

**Objetivo:** Pulir completamente el proyecto antes de desarrollar el módulo ERP  
**Duración Estimada:** 6-8 semanas  
**Metodología:** Sprints de 1-2 semanas

---

## 📅 ROADMAP GENERAL

```
Sprint 1-2: Fundamentos Críticos (Testing + Errores)
Sprint 3-4: Seguridad y Optimización
Sprint 5-6: Calidad y Polish Final
Sprint 7-8: Documentación y DevOps
```

---

## 🔥 SPRINT 1: INFRAESTRUCTURA DE TESTING (Semana 1-2)

### Objetivo: Establecer base de testing y CI/CD

### Tareas:

#### 1.1 Setup Testing (Día 1-2)
```bash
# Instalar dependencias
npm install -D vitest @vitest/ui
npm install -D @testing-library/react @testing-library/jest-dom
npm install -D @testing-library/user-event
npm install -D happy-dom
```

**Archivo a crear:** `vitest.config.ts`
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/tests/',
        '**/*.d.ts',
        '**/*.config.*',
      ]
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
```

#### 1.2 Tests Unitarios Críticos (Día 3-5)

**Prioridad 1: Utilidades**
- [ ] `src/utils/budgetUtils.test.ts`
- [ ] `src/utils/PriceCalculator.test.ts`
- [ ] `src/utils/pdfGenerator.test.ts`

**Prioridad 2: Stores**
- [ ] `src/stores/auth/useAuthStore.test.ts`
- [ ] `src/stores/scene/useSceneStore.test.ts`
- [ ] `src/stores/selection/useSelectionStore.test.ts`

#### 1.3 Tests de Integración (Día 6-8)
- [ ] Flujo de login completo
- [ ] Creación y guardado de proyecto
- [ ] Gestión de presupuestos

#### 1.4 Setup CI/CD (Día 9-10)

**Archivo a crear:** `.github/workflows/ci.yml`
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run type-check
      - run: npm run lint
      - run: npm run test:coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  build:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - run: npm ci
      - run: npm run build
```

### Entregables Sprint 1:
- ✅ 30+ tests unitarios
- ✅ Coverage >60%
- ✅ CI/CD funcionando
- ✅ Tests corriendo en cada PR

---

## 🛡️ SPRINT 2: GESTIÓN DE ERRORES Y LOGGING (Semana 2-3)

### Objetivo: Sistema robusto de manejo de errores

### Tareas:

#### 2.1 Sistema Centralizado de Errores (Día 1-3)

**Archivo a crear:** `src/lib/errorHandler.ts`
```typescript
import * as Sentry from '@sentry/react';

export enum ErrorType {
  NETWORK = 'NETWORK_ERROR',
  AUTH = 'AUTH_ERROR',
  DATABASE = 'DATABASE_ERROR',
  VALIDATION = 'VALIDATION_ERROR',
  ENGINE = 'ENGINE_ERROR',
  UNKNOWN = 'UNKNOWN_ERROR',
}

export class AppError extends Error {
  constructor(
    public type: ErrorType,
    message: string,
    public originalError?: unknown,
    public metadata?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  
  private constructor() {
    if (import.meta.env.PROD) {
      Sentry.init({
        dsn: import.meta.env.VITE_SENTRY_DSN,
        environment: import.meta.env.MODE,
        tracesSampleRate: 1.0,
      });
    }
  }

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  handle(error: unknown, context?: string): AppError {
    const appError = this.normalize(error);
    
    // Log to console in dev
    if (import.meta.env.DEV) {
      console.error(`[${context}]`, appError);
    }
    
    // Send to Sentry in prod
    if (import.meta.env.PROD) {
      Sentry.captureException(appError, {
        tags: { context, type: appError.type },
        extra: appError.metadata,
      });
    }
    
    return appError;
  }

  private normalize(error: unknown): AppError {
    if (error instanceof AppError) return error;
    
    if (error instanceof Error) {
      return new AppError(
        ErrorType.UNKNOWN,
        error.message,
        error
      );
    }
    
    return new AppError(
      ErrorType.UNKNOWN,
      'An unexpected error occurred',
      error
    );
  }

  getUserMessage(error: AppError): string {
    const messages: Record<ErrorType, string> = {
      [ErrorType.NETWORK]: 'Error de conexión. Verifica tu internet.',
      [ErrorType.AUTH]: 'Error de autenticación. Inicia sesión nuevamente.',
      [ErrorType.DATABASE]: 'Error al guardar. Intenta nuevamente.',
      [ErrorType.VALIDATION]: 'Datos inválidos. Revisa el formulario.',
      [ErrorType.ENGINE]: 'Error en el motor 3D. Recarga la página.',
      [ErrorType.UNKNOWN]: 'Error inesperado. Contacta soporte.',
    };
    
    return messages[error.type] || messages[ErrorType.UNKNOWN];
  }
}

export const errorHandler = ErrorHandler.getInstance();
```

#### 2.2 Hook de Manejo de Errores (Día 3-4)

**Archivo a crear:** `src/hooks/useErrorHandler.ts`
```typescript
import { useState, useCallback } from 'react';
import { errorHandler, AppError } from '@/lib/errorHandler';
import { useToast } from '@/hooks/useToast';

export const useErrorHandler = (context?: string) => {
  const [error, setError] = useState<AppError | null>(null);
  const { showToast } = useToast();

  const handleError = useCallback((err: unknown) => {
    const appError = errorHandler.handle(err, context);
    setError(appError);
    
    const userMessage = errorHandler.getUserMessage(appError);
    showToast({
      type: 'error',
      message: userMessage,
    });
    
    return appError;
  }, [context, showToast]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return { error, handleError, clearError };
};
```

#### 2.3 Sistema de Toast/Notificaciones (Día 4-5)

**Archivo a crear:** `src/components/ui/Toast.tsx`
```typescript
import { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  showToast: (toast: Omit<Toast, 'id'>) => void;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: Toast = { ...toast, id };
    
    setToasts(prev => [...prev, newToast]);
    
    const duration = toast.duration ?? 5000;
    setTimeout(() => hideToast(id), duration);
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <ToastContainer toasts={toasts} onClose={hideToast} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};
```

#### 2.4 Refactor de Código Existente (Día 6-10)
- [ ] Refactorizar todos los try-catch
- [ ] Implementar errorHandler en stores
- [ ] Implementar errorHandler en componentes
- [ ] Agregar boundary de errores en React

### Entregables Sprint 2:
- ✅ Sistema de errores centralizado
- ✅ Toast notifications
- ✅ Error boundaries
- ✅ Logging en producción (Sentry)
- ✅ Todo el código refactorizado

---

## 🔐 SPRINT 3: SEGURIDAD (Semana 3-4)

### Objetivo: Auditar y asegurar completamente la aplicación

### Tareas:

#### 3.1 Auditoría Supabase RLS (Día 1-3)

**Archivo a crear:** `supabase/migrations/001_security_audit.sql`
```sql
-- =============================================================================
-- SECURITY AUDIT - ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- 1. PROFILES TABLE
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 2. PROJECTS TABLE
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Users can view their own projects
CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  USING (user_id = auth.uid());

-- Users can create projects
CREATE POLICY "Users can create projects"
  ON projects FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own projects
CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own projects
CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  USING (user_id = auth.uid());

-- Employees can view all projects
CREATE POLICY "Employees can view all projects"
  ON projects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() 
      AND role IN ('admin', 'employee')
    )
  );

-- 3. ORDERS TABLE
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Similar policies for orders...

-- 4. SECURITY FUNCTIONS
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_employee_or_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'employee')
  );
$$ LANGUAGE SQL SECURITY DEFINER;
```

#### 3.2 Validación con Zod (Día 3-5)

**Archivo a crear:** `src/lib/validation.ts`
```typescript
import { z } from 'zod';

// Client validation
export const clientSchema = z.object({
  email: z.string().email('Email inválido'),
  company_name: z.string().min(2, 'Mínimo 2 caracteres').max(100),
  full_name: z.string().min(2).max(100).optional(),
  phone: z.string().regex(/^\+?[0-9\s\-()]+$/, 'Teléfono inválido').optional(),
  discount_rate: z.number().min(0).max(100),
});

export type ClientInput = z.infer<typeof clientSchema>;

// Project validation
export const projectSchema = z.object({
  name: z.string().min(1, 'Nombre requerido').max(200),
  data: z.object({
    items: z.array(z.any()),
    fenceConfig: z.object({
      presetId: z.string(),
      colors: z.object({
        post: z.number(),
        slatA: z.number(),
      }),
    }).optional(),
  }),
});

// Order validation
export const orderSchema = z.object({
  order_ref: z.string(),
  status: z.enum([
    'borrador',
    'pendiente',
    'presupuestado',
    'pedido',
    'en_proceso',
    'enviado',
    'entregado',
    'rechazado',
  ]),
  total_price: z.number().min(0),
  custom_name: z.string().max(200).optional(),
});

// Helper function
export const validate = <T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } => {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  return { success: false, errors: result.error };
};
```

#### 3.3 Sanitización de Inputs (Día 5-6)

**Archivo a crear:** `src/lib/sanitize.ts`
```typescript
import DOMPurify from 'dompurify';

export const sanitize = {
  html: (dirty: string): string => {
    return DOMPurify.sanitize(dirty, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br'],
    });
  },
  
  text: (dirty: string): string => {
    return dirty
      .replace(/[<>]/g, '')
      .trim()
      .slice(0, 1000); // Max length
  },
  
  number: (value: unknown): number | null => {
    const num = Number(value);
    return isNaN(num) ? null : num;
  },
  
  email: (email: string): string | null => {
    const cleaned = email.toLowerCase().trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned) ? cleaned : null;
  },
};
```

#### 3.4 Content Security Policy (Día 6-7)

**Actualizar `index.html`:**
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https: blob:;
  font-src 'self' data:;
  connect-src 'self' https://*.supabase.co wss://*.supabase.co;
  frame-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
">
```

#### 3.5 Auditoría de Dependencias (Día 8-10)
```bash
npm audit
npm audit fix
npm install -g snyk
snyk test
```

### Entregables Sprint 3:
- ✅ RLS completo en Supabase
- ✅ Validación con Zod en todos los formularios
- ✅ Sanitización de inputs
- ✅ CSP implementado
- ✅ Dependencias auditadas

---

## ⚡ SPRINT 4: OPTIMIZACIÓN DE RENDIMIENTO (Semana 4-5)

### Objetivo: Aplicación rápida y eficiente

### Tareas:

#### 4.1 Code Splitting y Lazy Loading (Día 1-2)

**Refactorizar `App.tsx`:**
```typescript
import { lazy, Suspense } from 'react';

const Editor3D = lazy(() => import('./features/editor/Editor3D'));
const CrmDashboard = lazy(() => import('./features/crm/pages/CrmDashboard'));
const ClientDashboard = lazy(() => import('./features/crm/pages/ClientDashboard'));

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen bg-zinc-950">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
  </div>
);

// Wrap routes with Suspense
<Suspense fallback={<PageLoader />}>
  <Routes>
    {/* routes */}
  </Routes>
</Suspense>
```

#### 4.2 Optimización del Store (Día 2-3)

**Refactorizar duplicación de user:**
```typescript
// Eliminar user de useProjectStore
// Crear un selector compartido

// src/stores/selectors.ts
export const selectUser = () => useAuthStore.getState().user;
export const selectUserRole = () => useAuthStore.getState().user?.role;

// Usar en componentes
const user = useAuthStore(state => state.user);
const role = useAuthStore(state => state.user?.role);
```

#### 4.3 Memoización de Componentes (Día 3-5)

**Crear componentes memoizados:**
```typescript
// src/features/crm/pages/CrmDashboard.tsx

// Antes
const TabButton = ({ active, onClick, children }) => (...)

// Después
const TabButton = memo(({ active, onClick, children, variant = 'default' }) => {
  return (...)
}, (prevProps, nextProps) => {
  return prevProps.active === nextProps.active && 
         prevProps.variant === nextProps.variant;
});

// Memoizar callbacks
const handleStatusUpdate = useCallback(async (id: string, newStatus: OrderStatus) => {
  // ...
}, [loadData]);
```

#### 4.4 Optimización de Three.js (Día 5-7)

**Refactorizar imports:**
```typescript
// Antes
import * as THREE from 'three';

// Después - Solo lo necesario
import {
  Scene,
  WebGLRenderer,
  PerspectiveCamera,
  DirectionalLight,
  AmbientLight,
  // ... solo lo que uses
} from 'three';
```

**Implementar instancing para objetos repetidos:**
```typescript
// Para cercas con muchos postes idénticos
class FenceInstancedManager {
  createInstanced(geometry, material, count) {
    const instancedMesh = new InstancedMesh(geometry, material, count);
    // Set transforms
    return instancedMesh;
  }
}
```

#### 4.5 Asset Optimization (Día 7-8)

```bash
# Comprimir modelos 3D con Draco
gltf-pipeline -i model.gltf -o model.glb -d

# Optimizar texturas
npm install -D imagemin imagemin-webp
```

#### 4.6 Implementar React Query (Día 8-10)

**Para cachear queries de Supabase:**
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// src/hooks/useOrders.ts
export const useOrders = (status?: OrderStatus[]) => {
  return useQuery({
    queryKey: ['orders', status],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select('...')
        .order('created_at', { ascending: false });
      
      if (status) {
        query = query.in('status', status);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    staleTime: 30000, // 30 segundos
    cacheTime: 300000, // 5 minutos
  });
};

// En componente
const { data: orders, isLoading, error } = useOrders(['pedido', 'en_proceso']);
```

### Entregables Sprint 4:
- ✅ Bundle size reducido >30%
- ✅ Lazy loading implementado
- ✅ React Query para caching
- ✅ Memoización estratégica
- ✅ Three.js optimizado

---

## ♿ SPRINT 5: ACCESIBILIDAD (Semana 5-6)

### Objetivo: WCAG 2.1 AA compliance

### Tareas:

#### 5.1 Auditoría con Lighthouse (Día 1)
```bash
npm install -g @lhci/cli
lhci autorun
```

#### 5.2 Navegación por Teclado (Día 1-3)

**Crear hook:**
```typescript
// src/hooks/useKeyboard.ts
export const useKeyboardNavigation = (
  items: any[],
  onSelect: (item: any) => void
) => {
  const [focusedIndex, setFocusedIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex(prev => Math.min(prev + 1, items.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          onSelect(items[focusedIndex]);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, focusedIndex, onSelect]);

  return { focusedIndex };
};
```

#### 5.3 ARIA Labels (Día 3-4)

**Refactorizar botones:**
```typescript
// Antes
<button onClick={handleQROpen}>
  <QrCode size={20} />
</button>

// Después
<button
  onClick={handleQROpen}
  aria-label="Mostrar código QR del proyecto"
  aria-describedby="qr-button-description"
>
  <QrCode size={20} aria-hidden="true" />
  <span id="qr-button-description" className="sr-only">
    Genera y muestra el código QR para compartir este proyecto
  </span>
</button>
```

#### 5.4 Contraste de Colores (Día 4-5)

**Crear paleta accesible:**
```css
/* Asegurar ratio 4.5:1 mínimo */
:root {
  --text-primary: #ffffff;      /* Sobre oscuro: 21:1 */
  --text-secondary: #a3a3a3;    /* Sobre oscuro: 7.5:1 */
  --bg-primary: #000000;
  --bg-secondary: #171717;
  --accent: #3b82f6;            /* Sobre oscuro: 8.2:1 */
  --accent-hover: #60a5fa;
}
```

#### 5.5 Screen Reader Support (Día 5-7)

**Crear live regions:**
```typescript
const LiveRegion: React.FC<{ message: string }> = ({ message }) => (
  <div
    role="status"
    aria-live="polite"
    aria-atomic="true"
    className="sr-only"
  >
    {message}
  </div>
);

// Usar para feedback
{isLoading && <LiveRegion message="Cargando proyectos..." />}
{error && <LiveRegion message="Error al cargar datos" />}
```

#### 5.6 Focus Management (Día 7-8)

**Crear focus trap para modals:**
```typescript
import { useEffect, useRef } from 'react';

export const useFocusTrap = (isOpen: boolean) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const container = containerRef.current;
    if (!container) return;

    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    firstElement?.focus();

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement?.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement?.focus();
          e.preventDefault();
        }
      }
    };

    document.addEventListener('keydown', handleTabKey);
    return () => document.removeEventListener('keydown', handleTabKey);
  }, [isOpen]);

  return containerRef;
};
```

### Entregables Sprint 5:
- ✅ Lighthouse score >90
- ✅ Navegación completa por teclado
- ✅ ARIA completo
- ✅ Contraste WCAG AA
- ✅ Screen reader tested

---

## 📚 SPRINT 6: DOCUMENTACIÓN (Semana 6-7)

### Objetivo: Documentación completa y profesional

### Tareas:

#### 6.1 README Completo (Día 1-2)
#### 6.2 Storybook (Día 3-5)
#### 6.3 Documentación de API (Día 5-7)
#### 6.4 Guías de Contribución (Día 7-8)

---

## 🚀 SPRINT 7-8: DEVOPS Y MONITORING (Semana 7-8)

### Objetivo: Deployment robusto y monitoring

### Tareas:

#### 7.1 Environment Variables Management
#### 7.2 Monitoring (Sentry + Analytics)
#### 7.3 Performance Monitoring
#### 7.4 Backup Strategy
#### 7.5 Deployment Pipeline

---

## 📊 MÉTRICAS DE ÉXITO

Al final del proceso deberías tener:

- ✅ **Tests:** >80% coverage
- ✅ **Performance:** Lighthouse >90
- ✅ **Accessibility:** WCAG AA compliant
- ✅ **Security:** A+ en Observatory
- ✅ **Bundle:** <500kb gzipped (excl. Three.js)
- ✅ **Errors:** Sistema robusto con logging
- ✅ **Documentation:** Completa y actualizada

---

## 🎯 SIGUIENTE PASO

**¿Por dónde empezamos?**

Te propongo comenzar con **Sprint 1: Testing Infrastructure**, porque es la base que nos dará confianza para hacer todos los demás cambios.

**¿Estás listo para empezar?** Puedo ayudarte paso a paso con:
1. Crear los archivos de configuración
2. Escribir los primeros tests
3. Refactorizar el código existente
4. Revisar cada cambio que hagas

¿Empezamos con el setup de testing? 🚀