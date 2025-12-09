# 🎯 Sprint 5: Coverage Global 70%+

## 📊 Estado Actual
- **Tests actuales:** 136 passing
- **Coverage archivos testeados:** 87%
- **Archivos con tests:** 6 de 92 (6.5%)
- **Archivos sin tests:** 86 (93.5%)

**Problema:** El 87% solo refleja los 6 archivos testeados. Necesitamos coverage **global real**.

---

## 🎯 Objetivo Sprint 5
Alcanzar **70%+ de coverage global** testeando componentes y módulos críticos sin tests.

---

## 📋 PLAN DE ATAQUE - Priorización por Criticidad

### **FASE 1: Componentes Core (Alta Prioridad)** 🔴
Estos son los archivos más críticos para la seguridad y estabilidad de la app.

#### 1.1 App Principal
- [ ] `src/App.tsx` (17KB) - **CRÍTICO**
  - Enrutamiento principal
  - Providers y contexto global
  - Tests: Renderizado, navegación, providers

#### 1.2 Hooks Críticos
- [ ] `src/hooks/useErrorHandler.ts` (4.9KB) - **CRÍTICO**
  - Manejo de errores en toda la app
  - Tests: Diferentes tipos de error, callbacks, integración con toast

#### 1.3 Services
- [ ] `src/services/catalogService.ts` (8.8KB) - **ALTA**
  - Conexión con Supabase para catálogo
  - Tests: CRUD operations, manejo de errores, caché

---

### **FASE 2: Stores sin Tests (Alta-Media Prioridad)** 🟠

#### 2.1 Stores Críticos
- [ ] `src/stores/project/useProjectStore.ts` (3.5KB)
  - Gestión de proyectos del usuario
  - Tests: CRUD projects, estado persistente

- [ ] `src/stores/editor/useEditorStore.ts` (3.4KB)
  - Estado del editor 3D
  - Tests: Modos, herramientas, estado UI

- [ ] `src/stores/ui/useUIStore.ts` (2.7KB)
  - Estado global UI (modales, sidebars, etc)
  - Tests: Toggle states, responsive behavior

#### 2.2 Stores Secundarios
- [ ] `src/stores/selection/useSelectionStore.ts` (2.8KB)
- [ ] `src/stores/catalog/useCatalogStore.ts` (1.2KB)
- [ ] `src/stores/fence/useFenceStore.ts` (870B)
- [ ] `src/stores/cad/useCADStore.ts` (716B)
- [ ] `src/stores/crm/useCRMStore.ts` (695B)
- [ ] `src/stores/user/useUserStore.ts` (424B)

---

### **FASE 3: Features Editor (Media Prioridad)** 🟡
El editor 3D es complejo pero menos crítico para seguridad básica.

#### 3.1 Hooks del Editor
- [ ] `src/features/editor/hooks/useProjectActions.ts`
- [ ] `src/features/editor/hooks/useSceneTools.ts`
- [ ] `src/features/editor/hooks/useEditorMedia.ts`

#### 3.2 UI Components
- [ ] `src/features/editor/ui/Catalog.tsx`
- [ ] `src/features/editor/ui/Toolbar.tsx`
- [ ] `src/features/editor/ui/BudgetPanel.tsx`

---

### **FASE 4: Features CRM (Baja Prioridad)** 🟢
CRM es importante pero menos crítico que el core de la app.

- [ ] `src/features/crm/pages/ClientDashboard.tsx`
- [ ] `src/features/crm/pages/ClientsPage.tsx`
- [ ] `src/features/crm/pages/ProfilePage.tsx`
- Resto de CRM si hay tiempo...

---

## 📈 Estrategia de Implementación

### Semana 1: Core + Stores Críticos
**Objetivo:** Establecer base sólida de tests en componentes fundamentales.

**Día 1-2: App.tsx + useErrorHandler**
```bash
# Target files:
src/App.tsx
src/hooks/useErrorHandler.ts
```
- Configurar testing de routing (react-router)
- Tests de providers y contextos
- Tests de error boundaries

**Día 3-4: Stores Críticos**
```bash
# Target files:
src/stores/project/useProjectStore.ts
src/stores/editor/useEditorStore.ts
src/stores/ui/useUIStore.ts
```
- Tests unitarios de cada store
- Tests de persistencia (localStorage)
- Tests de integración entre stores

**Día 5: catalogService + Stores Secundarios**
```bash
# Target files:
src/services/catalogService.ts
src/stores/selection/useSelectionStore.ts
src/stores/catalog/useCatalogStore.ts
```

### Semana 2: Features Editor + Coverage Check
**Objetivo:** Ampliar coverage a features y verificar 70%+

**Día 1-2: Editor Hooks**
- useProjectActions
- useSceneTools
- useEditorMedia

**Día 3-4: Editor UI Components**
- Catalog, Toolbar, BudgetPanel
- Tests de interacción usuario

**Día 5: Verificación y Ajustes**
- Ejecutar coverage completo
- Identificar gaps
- Ajustar para alcanzar 70%+

---

## 🛠️ Setup Técnico Necesario

### Dependencias Adicionales (si faltan)
```bash
npm install --save-dev \
  @testing-library/react-hooks \
  @testing-library/user-event \
  react-router-dom@latest \
  msw # Mock Service Worker para APIs
```

### Configuración vitest.config.ts
Ya está configurado, pero verificar:
- ✅ Coverage provider: v8
- ✅ Reporters: text, html, lcov, json
- ✅ Thresholds: 60% (subir a 70% al final)

---

## 📊 Métricas de Éxito

### Coverage Objetivo por Categoría:
- **Core (App, hooks, services):** 85%+
- **Stores:** 80%+
- **Features/Editor:** 65%+
- **Features/CRM:** 50%+ (opcional)

### Coverage Global Final:
- **Statements:** 70%+
- **Branches:** 65%+
- **Functions:** 70%+
- **Lines:** 70%+

---

## 🚀 Empezar AHORA

### Primer Paso - App.tsx Test
**Archivo más crítico:** `src/App.tsx` (17KB)

**Tests básicos a implementar:**
1. ✅ Renderiza sin errores
2. ✅ Renderiza todos los providers
3. ✅ Navegación entre rutas funciona
4. ✅ Error boundary captura errores
5. ✅ Protected routes redirigen correctamente

**Comando para empezar:**
```bash
# Crear archivo de test
touch src/__tests__/App.test.tsx

# Ejecutar tests en watch mode
npm test
```

---

## 📝 Notas Importantes

### Testing Best Practices:
1. **Arrange-Act-Assert** en cada test
2. **Mock externo:** Supabase, localStorage, Three.js
3. **Tests unitarios primero**, luego integración
4. **No testear implementación**, testear comportamiento
5. **Cobertura ≠ Calidad:** Tests significativos > cobertura alta

### Herramientas de Apoyo:
- `npm test -- --coverage`: Ver coverage actual
- `npm test -- --ui`: UI interactiva de Vitest
- `npm test -- --watch`: Modo watch para desarrollo
- `npm test -- src/path/to/file.test.ts`: Test específico

---

## ✅ Checklist de Progreso

### FASE 1: Core ⬜️
- [ ] App.tsx (0/5 tests)
- [ ] useErrorHandler (0/8 tests)
- [ ] catalogService (0/10 tests)

### FASE 2: Stores ⬜️
- [ ] useProjectStore (0/6 tests)
- [ ] useEditorStore (0/6 tests)
- [ ] useUIStore (0/5 tests)
- [ ] useSelectionStore (0/4 tests)
- [ ] useCatalogStore (0/4 tests)
- [ ] Stores restantes (0/15 tests)

### FASE 3: Editor ⬜️
- [ ] Editor hooks (0/12 tests)
- [ ] Editor UI (0/15 tests)

### FASE 4: CRM ⬜️
- [ ] Dashboard (0/8 tests)
- [ ] Pages (0/20 tests)

**Target Total:** ~118 nuevos tests = **254 tests totales**

---

## 🎉 Resultado Esperado

### Al completar Sprint 5:
- ✅ **254+ tests passing** (vs 136 actuales)
- ✅ **70%+ coverage global real**
- ✅ Componentes críticos 100% testeados
- ✅ CI/CD bloqueando PRs con coverage < 70%
- ✅ App más robusta y confiable

**Tiempo estimado:** 2 semanas full-time (o 4 semanas part-time)

---

**¿Listo para empezar? 🚀**
Comando inicial:
```bash
cd /home/claude/a42-project
touch src/__tests__/App.test.tsx
```
