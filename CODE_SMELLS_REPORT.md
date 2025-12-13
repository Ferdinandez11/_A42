# 🔍 Reporte de Code Smells y Riesgos - A42

**Fecha:** Diciembre 2024  
**Auditor:** Arquitecto de Software Senior  
**Alcance:** Análisis completo del código fuente

---

## 📋 RESUMEN EJECUTIVO

Se identificaron **7 categorías principales de code smells** con diferentes niveles de severidad. El proyecto tiene una base sólida, pero presenta oportunidades de mejora en duplicación de código, organización de archivos grandes y consistencia de estilos.

**Severidad General:** 🟡 **MEDIA** - No crítico, pero requiere atención

---

## 🔴 1. DUPLICACIÓN DE CÓDIGO (Alta Prioridad)

### 1.1 Componentes Modales Duplicados

**Problema:** Existen componentes prácticamente idénticos con nombres diferentes.

#### **CatalogModal vs BudgetCatalogModal**
- **Ubicación:**
  - `src/crm/shared/components/CatalogModal.tsx` (44 líneas)
  - `src/crm/shared/components/BudgetCatalogModal.tsx` (48 líneas)
- **Duplicación:** ~95% del código es idéntico
- **Diferencias:** Solo cambian los imports:
  - `CatalogModal` usa: `@/crm/pages/constants` y `@/crm/pages/types`
  - `BudgetCatalogModal` usa: `@/crm/pages/budgetConstants` y `@/crm/pages/budgetTypes`
- **Impacto:** Mantenimiento duplicado, riesgo de inconsistencias

#### **ParametricModal vs BudgetParametricModal**
- **Ubicación:**
  - `src/crm/shared/components/ParametricModal.tsx` (52 líneas)
  - `src/crm/shared/components/BudgetParametricModal.tsx` (52 líneas)
- **Duplicación:** 100% idéntico excepto imports
- **Diferencias:** Solo el tipo importado (`CatalogItem` de diferentes lugares)
- **Impacto:** Código completamente redundante

**Recomendación:**
```typescript
// Crear un componente genérico con props tipadas
<CatalogModal 
  items={CATALOG_ITEMS} 
  onSelect={handleSelect}
  // ... otras props
/>
```

### 1.2 Constantes Duplicadas

**Problema:** Mismos datos definidos en múltiples archivos.

#### **CATALOG_ITEMS Duplicado**
- `src/crm/pages/constants.ts` - Define `CATALOG_ITEMS`
- `src/crm/pages/budgetConstants.ts` - Define `CATALOG_ITEMS` (idéntico)

**Código duplicado:**
```typescript
// constants.ts
export const CATALOG_ITEMS: CatalogItem[] = [
  { id: 'bench_01', name: 'Banco Clásico', type: 'model', price: 150 },
  { id: 'swing_01', name: 'Columpio Doble', type: 'model', price: 1200 },
  // ... mismo contenido
];

// budgetConstants.ts
export const CATALOG_ITEMS: CatalogItem[] = [
  { id: 'bench_01', name: 'Banco Clásico', type: 'model', price: 150 },
  { id: 'swing_01', name: 'Columpio Doble', type: 'model', price: 1200 },
  // ... mismo contenido
];
```

**Recomendación:** Centralizar en un solo archivo y reutilizar.

---

## 🟠 2. ARCHIVOS EXCESIVAMENTE GRANDES (Media-Alta Prioridad)

### 2.1 ClientDashboard.tsx - 787 líneas

**Ubicación:** `src/crm/client/pages/ClientDashboard.tsx`

**Problemas identificados:**
- ✅ **Bien:** Tiene sub-componentes extraídos (DashboardHeader, TabNavigation, etc.)
- ⚠️ **Problema:** Lógica de negocio mezclada con presentación
- ⚠️ **Problema:** Múltiples `useEffect` y `useCallback` complejos
- ⚠️ **Problema:** Manejo de estado local extenso

**Estructura actual:**
```typescript
// 787 líneas con:
- 4 tipos de tabs diferentes
- Múltiples operaciones CRUD
- Lógica de fetch compleja
- Manejo de modales
- Sub-componentes inline
```

**Recomendación:**
1. Extraer lógica de negocio a custom hooks:
   - `useProjects.ts` - Gestión de proyectos
   - `useOrders.ts` - Gestión de pedidos
   - `useDashboardTabs.ts` - Lógica de tabs
2. Mover sub-componentes a archivos separados
3. Crear servicios para operaciones CRUD

### 2.2 CrmDashboard.tsx - 730 líneas

**Ubicación:** `src/crm/admin/pages/CrmDashboard.tsx`

**Problemas similares:**
- Lógica compleja de filtrado y búsqueda
- Múltiples estados locales
- Operaciones CRUD extensas

**Recomendación:** Misma estrategia que ClientDashboard

### 2.3 Otros Archivos Grandes Detectados

- `src/crm/admin/pages/AdminOrderDetailPage.tsx` - ~624 líneas
- `src/editor/ui/FenceProperties.tsx` - ~423 líneas
- `src/editor/Editor3D.tsx` - ~204 líneas (aceptable, pero monitorear)

**Límite recomendado:** 300-400 líneas por archivo

---

## 🟡 3. MEZCLA DE ESTILOS (Media Prioridad)

### 3.1 CSS Puro vs Tailwind CSS

**Problema:** El proyecto usa **3 enfoques diferentes** para estilos:

#### **Enfoque 1: CSS Puro (Archivos .css)**
- `src/core/index.css` - 156 líneas
  - Variables CSS custom
  - Estilos base
  - Utilidades (scrollbar, etc.)
- `src/editor/ui/Editor.css` - 222 líneas
  - Estilos específicos del editor
  - Glassmorphism effects
  - Tool buttons

#### **Enfoque 2: Tailwind CSS (Mayoría)**
- ✅ **Bien:** 95% de componentes usan Tailwind
- ✅ **Bien:** Consistente en la mayoría del código

#### **Enfoque 3: Inline Styles (Pocos casos)**
- `src/crm/shared/components/BudgetInfoCard.tsx`:
  ```tsx
  <span 
    className="py-1 px-2.5 rounded font-bold text-white"
    style={{ backgroundColor: statusBadge.color }}  // ⚠️ Inline style
  >
  ```

**Análisis:**
- ✅ **Aceptable:** CSS puro para estilos globales y efectos complejos
- ⚠️ **Problema:** Inline styles mezclados con Tailwind
- ✅ **Bien:** Tailwind es el estándar principal

**Recomendación:**
1. Mantener CSS puro para:
   - Variables globales (`:root`)
   - Estilos base del editor (glassmorphism)
   - Utilidades complejas (scrollbar personalizado)
2. Eliminar inline styles:
   ```tsx
   // ❌ Antes
   style={{ backgroundColor: statusBadge.color }}
   
   // ✅ Después (usar Tailwind con variables)
   className={`bg-[${statusBadge.color}]`}
   // O mejor: usar CSS variables
   ```

### 3.2 Inconsistencias en Clases Tailwind

**Problema:** Algunos componentes usan clases muy largas y difíciles de leer:

```tsx
// Ejemplo encontrado
className="fixed inset-0 bg-black/80 flex justify-center items-center z-[999]"
```

**Recomendación:** Extraer a constantes o componentes reutilizables:
```tsx
const MODAL_OVERLAY = "fixed inset-0 bg-black/80 flex justify-center items-center z-[999]";
```

---

## 🟡 4. PATRONES INCONSISTENTES DE LLAMADAS A API (Media Prioridad)

### 4.1 Diferentes Formas de Manejar Supabase

#### **Patrón 1: Con useErrorHandler (Recomendado)**
```typescript
// ✅ Bien implementado
const { handleError } = useErrorHandler({ context: 'ComponentName' });
try {
  const { data, error } = await supabase.from('orders').select('*');
  if (error) throw error;
} catch (err) {
  handleError(err); // Manejo centralizado
}
```

#### **Patrón 2: Sin useErrorHandler (Inconsistente)**
```typescript
// ⚠️ Encontrado en algunos lugares
try {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
} catch (error) {
  throw handleError(error, 'useAuthStore.logout'); // Diferente patrón
}
```

#### **Patrón 3: Manejo Manual (Antiguo)**
```typescript
// ⚠️ Código legacy (según REFACTORING_GUIDE.md)
const { data, error } = await supabase.from('orders').select('*');
if (error) {
  console.error('[CrmDashboard] Load error:', err); // Solo log
}
```

**Estado actual:**
- ✅ **Bien:** La mayoría del código nuevo usa `useErrorHandler`
- ⚠️ **Problema:** Algunos archivos aún no migrados
- ⚠️ **Problema:** Inconsistencia en cómo se llama `handleError`

**Recomendación:**
1. Completar migración a `useErrorHandler` en todos los componentes
2. Estandarizar el patrón de uso
3. Crear un hook `useSupabaseQuery` para queries comunes

---

## 🟢 5. TIPOS Y CONSTANTES DUPLICADOS (Baja-Media Prioridad)

### 5.1 Tipos Duplicados

**Problema:** Tipos similares definidos en múltiples lugares:

- `src/crm/pages/types.ts` - Define `CatalogItem`, `Order`, etc.
- `src/crm/pages/budgetTypes.ts` - Define tipos similares
- `src/domain/types/types.ts` - Define `Order`, `OrderStatus`

**Análisis:**
- Algunos tipos están correctamente en `domain/`
- Otros están duplicados en módulos específicos

**Recomendación:**
1. Mover tipos compartidos a `domain/types/`
2. Usar tipos de dominio en lugar de duplicar

### 5.2 Constantes de Estado Duplicadas

- `STATUS_BADGES` en `budgetConstants.ts`
- `STATUS_OPTIONS` en `constants.ts`
- Lógica de estado en múltiples lugares

**Recomendación:** Centralizar en `domain/types/` o `crm/pages/constants.ts`

---

## 🟢 6. IMPORTS Y PATH ALIASES (Baja Prioridad)

### 6.1 Path Aliases No Utilizados

**Problema:** En `vite.config.ts` hay aliases definidos pero no usados:

```typescript
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'), // ✅ Usado
    '@features': path.resolve(__dirname, './src/features'), // ❌ No existe
    '@stores': path.resolve(__dirname, './src/stores'), // ❌ No usado
    '@lib': path.resolve(__dirname, './src/lib'), // ❌ No usado
    '@utils': path.resolve(__dirname, './src/utils'), // ❌ No usado
    '@components': path.resolve(__dirname, './src/components'), // ❌ No usado
  }
}
```

**Recomendación:** Eliminar aliases no utilizados para mantener configuración limpia.

### 6.2 Imports Inconsistentes

**Problema:** Algunos archivos usan imports relativos en lugar de path aliases:

```typescript
// ⚠️ Encontrado en algunos lugares
import { BudgetHeader } from '../../shared/components/BudgetHeader';

// ✅ Debería ser
import { BudgetHeader } from '@/crm/shared/components/BudgetHeader';
```

**Recomendación:** Estandarizar a path aliases `@/` en todo el proyecto.

---

## 🟢 7. OTROS CODE SMELLS MENORES

### 7.1 Console.log en Producción

**Problema:** Algunos archivos tienen `console.log` de debugging:

```typescript
// Encontrado en ClientDashboard.tsx
console.log('🔍 [FETCH] fetchData iniciado');
console.log('🔍 [FETCH] activeTab:', activeTab);
```

**Recomendación:**
1. Usar un logger configurado
2. Eliminar logs de desarrollo antes de producción
3. Usar `import.meta.env.DEV` para logs condicionales

### 7.2 Magic Numbers y Strings

**Problema:** Algunos valores hardcodeados:

```typescript
// Ejemplo encontrado
z-[999]  // z-index mágico
z-[1000] // otro z-index mágico
```

**Recomendación:** Extraer a constantes:
```typescript
const Z_INDEX = {
  MODAL: 1000,
  OVERLAY: 999,
  TOOLTIP: 100,
} as const;
```

### 7.3 Componentes con Muchas Props

**Problema:** Algunos componentes reciben muchas props:

```typescript
// Ejemplo: BudgetInfoCard
interface BudgetInfoCardProps {
  order: Order;
  customName: string;
  isPending: boolean;
  isDecisionTime: boolean;
  statusBadge: { label: string; color: string };
  onCustomNameChange: (value: string) => void;
  onSaveName: () => void;
}
```

**Recomendación:** Considerar usar objetos de configuración o context para props relacionadas.

---

## 📊 RESUMEN DE PRIORIDADES

### 🔴 **Alta Prioridad (Acción Inmediata)**
1. **Eliminar duplicación de modales** (CatalogModal/BudgetCatalogModal)
2. **Unificar constantes duplicadas** (CATALOG_ITEMS)

### 🟠 **Media Prioridad (Planificar Refactor)**
3. **Dividir archivos grandes** (ClientDashboard, CrmDashboard)
4. **Eliminar inline styles** mezclados con Tailwind
5. **Estandarizar llamadas a Supabase** (completar migración a useErrorHandler)

### 🟡 **Baja Prioridad (Mejoras Incrementales)**
6. **Centralizar tipos duplicados** en domain/
7. **Limpiar path aliases** no utilizados
8. **Estandarizar imports** a path aliases
9. **Eliminar console.log** de producción
10. **Extraer magic numbers** a constantes

---

## 📈 MÉTRICAS DE CODE SMELLS

| Categoría | Cantidad | Severidad |
|-----------|----------|-----------|
| Componentes duplicados | 4 | 🔴 Alta |
| Archivos > 500 líneas | 4 | 🟠 Media |
| Inline styles | 1 | 🟡 Baja |
| Patrones API inconsistentes | ~8 archivos | 🟡 Media |
| Tipos duplicados | ~5 tipos | 🟢 Baja |
| Path aliases no usados | 5 | 🟢 Baja |

---

## ✅ RECOMENDACIONES FINALES

### Fase 1: Eliminación de Duplicación (1-2 días)
1. Unificar `CatalogModal` y `BudgetCatalogModal`
2. Unificar `ParametricModal` y `BudgetParametricModal`
3. Centralizar `CATALOG_ITEMS` en un solo archivo

### Fase 2: Refactor de Archivos Grandes (3-5 días)
1. Extraer hooks de `ClientDashboard.tsx`
2. Extraer hooks de `CrmDashboard.tsx`
3. Mover sub-componentes a archivos separados

### Fase 3: Estandarización (2-3 días)
1. Eliminar inline styles
2. Completar migración a `useErrorHandler`
3. Limpiar path aliases no utilizados

### Fase 4: Mejoras Incrementales (Ongoing)
1. Centralizar tipos en `domain/`
2. Eliminar console.log
3. Extraer magic numbers

---

## 🎯 CONCLUSIÓN

El proyecto tiene una **base sólida** con buena arquitectura modular. Los code smells identificados son principalmente:

- ✅ **Duplicación de código** - Fácil de resolver
- ✅ **Archivos grandes** - Requiere refactor planificado
- ✅ **Inconsistencias menores** - Mejoras incrementales

**Nivel de deuda técnica:** 🟡 **MEDIA** - Manejable con refactoring planificado

**Recomendación:** Abordar primero la duplicación (rápido y alto impacto), luego planificar refactor de archivos grandes en sprints dedicados.

---

*Reporte generado el: Diciembre 2024*

