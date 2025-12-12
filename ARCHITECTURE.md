# A42 - Arquitectura Modular

## 📋 Visión General

A42 utiliza una arquitectura modular con separación clara de responsabilidades, organizada en 6 módulos principales.

---

## 🏗️ Estructura de Módulos

### 📁 domain/
**Propósito:** Tipos y contratos compartidos  
**Contenido:** Interfaces TypeScript, tipos, enums  
**Dependencias:** Ninguna (capa base)  
**Exports:** `@/domain`

**Ejemplo:**
```typescript
import { CatalogProduct, PlaceableProduct } from '@/domain'
```

---

### 📁 core/
**Propósito:** Infraestructura y utilidades compartidas  
**Contenido:**
- Autenticación (Supabase)
- Manejo de errores
- Estado UI global
- Hooks compartidos

**Dependencias:** `domain`  
**Exports:** `@/core`

**Ejemplo:**
```typescript
import { supabase, useAuthStore, errorHandler } from '@/core'
```

---

### 📁 editor/
**Propósito:** Configurador 3D y gestión de escena  
**Contenido:**
- A42Engine (Three.js)
- Managers (Scene, Interaction, Tools, Objects)
- Componentes UI del editor
- Stores específicos del editor

**Dependencias:** `domain`, `core`  
**Exports:** `@/editor`

**Ejemplo:**
```typescript
import { Editor3D, useSceneStore, useEditorMedia } from '@/editor'
```

---

### 📁 pdf/
**Propósito:** Generación de documentos y cálculo de presupuestos  
**Contenido:**
- Utilidades de generación PDF
- Calculadoras de presupuesto
- Cálculo de precios

**Dependencias:** `domain`, `core`  
**Exports:** `@/pdf`

**Ejemplo:**
```typescript
import { generatePDF, PriceCalculator } from '@/pdf'
```

---

### 📁 crm/
**Propósito:** Gestión de clientes y pedidos  
**Estructura:**
- `admin/` - Portal administrativo
- `client/` - Portal de cliente
- `shared/` - Componentes compartidos
- `hooks/` - Hooks específicos CRM
- `pages/` - Utils, types, constants

**Dependencias:** `domain`, `core`  
**Exports:** `@/crm`

**Ejemplo:**
```typescript
import { useCRMStore } from '@/crm'
```

---

### 📁 erp/
**Propósito:** Reservado para funcionalidad ERP futura  
**Estado:** Vacío, listo para desarrollo futuro

---

## 🔗 Reglas de Dependencias

### Dependencias Permitidas
```
domain → (sin dependencias)
core → domain
editor → domain, core
pdf → domain, core
crm → domain, core
erp → domain, core
```

### ❌ Dependencias Prohibidas
- Módulos de negocio (editor/pdf/crm/erp) NO pueden importarse entre sí
- Sin dependencias circulares
- Domain no puede importar de ningún módulo

---

## 📦 Convenciones de Imports

### Usando Path Aliases
```typescript
// ✅ Correcto
import { CatalogProduct } from '@/domain'
import { supabase } from '@/core'
import { Editor3D } from '@/editor'

// ❌ Incorrecto
import { CatalogProduct } from '../../../domain/types/catalog'
```

### Usando Barrel Exports
```typescript
// ✅ Preferido (más limpio)
import { useSceneStore, useEditorMedia, Editor3D } from '@/editor'

// ✅ También válido (más específico)
import { useSceneStore } from '@/editor/stores/scene/useSceneStore'
```

---

## 🧪 Estrategia de Testing

### Ubicación de Tests
Los tests viven junto al código:
```
src/editor/stores/scene/
├── useSceneStore.ts
└── __tests__/
    └── useSceneStore.test.ts
```

### Cobertura Actual
- **Total:** 28%
- **Archivos core:** 80-100%
- **Editor stores:** 88%
- **PDF utils:** 100%
- **Objetivo:** Incrementar gradualmente a 60%+

---

## 📂 Organización de Archivos

### Convenciones de Nombres
- Componentes: `PascalCase.tsx`
- Hooks: `useCamelCase.ts`
- Utilidades: `camelCase.ts`
- Tests: `*.test.ts` o `*.test.tsx`

### Estructura de Carpetas
```
module/
├── components/      (si aplica)
├── hooks/          (si aplica)
├── stores/         (si aplica)
├── utils/          (si aplica)
└── index.ts        (barrel export)
```

---

## 👨‍💻 Guía para Desarrolladores

### Agregar Nuevas Features
1. Identificar módulo correcto (domain/core/editor/pdf/crm/erp)
2. Crear archivos en subcarpetas apropiadas
3. Actualizar `index.ts` del módulo si es necesario
4. Escribir tests junto al código
5. Usar imports `@/` para referencias entre módulos

### Refactorizar Código
1. Mantener archivos enfocados y bajo 300 líneas
2. Extraer lógica reutilizable a `utils/`
3. Mantener límites de módulos claros
4. Actualizar tests al mover archivos
5. Mantener barrel exports actualizados

---

## 📚 Referencias

- **Reglas completas:** `REGLAS_ARQUITECTURA_IA.md`
- **Plan de migración:** `PLAN_IMPLEMENTACION_DETALLADO.md`
- **Guía visual:** `GUIA_VISUAL_ARQUITECTURA.md`

---

## 📈 Historial de Migración

### Fase 1 - Completada ✅
- Reorganizados 85 archivos en estructura modular
- Actualizados imports a paths `@/`
- Corregidas jerarquías de tipos
- Mantenidos 208 tests pasando

### Fase 2 - Completada ✅
- Agregados barrel exports a todos los módulos
- Definidas APIs públicas

### Fase 3 - Futuro
- Aumentar cobertura de tests
- Optimizar estructura interna de módulos
- Agregar sub-barrel exports donde sea necesario

---

## 🎯 Beneficios Logrados

✅ **Mantenibilidad** - Código organizado y fácil de encontrar  
✅ **Escalabilidad** - Simple agregar nuevos módulos  
✅ **Trabajo paralelo** - Equipos pueden trabajar en módulos distintos  
✅ **Testing** - Tests organizados junto al código  
✅ **Onboarding** - Nuevos devs entienden estructura rápidamente  

---

**Última actualización:** Diciembre 2024  
**Versión:** 1.0