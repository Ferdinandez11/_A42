# 🔍 Reporte de Code Smells y Riesgos - A42

**Fecha:** Diciembre 2025  
**Auditor:** Arquitecto de Software Senior  
**Alcance:** Estado real post-estabilización de tests + fixes AR/UI

---

## 📋 RESUMEN EJECUTIVO

El proyecto está en un punto **estable** (suite de tests en verde) y con arquitectura modular clara. Los principales “code smells” actuales no son bloqueantes, pero afectan **mantenibilidad** y **confianza** al evolucionar (tipos dinámicos, warnings de tests, componentes grandes).

**Severidad general:** 🟡 **MEDIA** (por deuda residual y cobertura moderada)

---

## 🔴 1) CONTRATOS DÉBILES / TIPADO INCONSISTENTE (Alta prioridad)

- **Project data 3D** tratado como estructura dinámica en varios puntos (p.ej. precios/BOM), con `@ts-expect-error`.
- **Riesgo:** cambios de formato rompen cálculo, PDF y sincronización editor↔CRM.

---

## 🟠 2) COMPONENTES GRANDES (Media-Alta prioridad)

- Persisten componentes con mucha lógica/UI combinadas (p.ej. `Catalog.tsx`, `Toolbar.tsx`, páginas de CRM detalladas).
- **Riesgo:** cambios pequeños generan diffs grandes y regresiones por complejidad local.

---

## 🟡 3) TESTS: WARNINGS DE `act(...)` (Media prioridad)

- Algunos tests emiten warnings de React Testing Library sobre actualizaciones no envueltas en `act(...)`.
- **Riesgo:** tests frágiles / falsos positivos o negativos al cambiar React/testing runtime.

---

## 🟡 4) ESTILOS: INCONSISTENCIAS PUNTUALES (Media prioridad)

- Se detectaron detalles como atributos JSX duplicados (ej. `className` duplicado en `Toolbar`, ya corregido).
- **Riesgo:** comportamiento inesperado o warnings en build.

---

## 🟢 5) AR (WebXR): CONFIGURACIÓN SENSIBLE A CSS/Renderer (Baja-Media)

- Se corrigió el fondo negro en AR forzando transparencia del renderer + ancestros DOM durante sesión AR.
- **Riesgo:** cambios de layout/CSS pueden reintroducir overlay opaco.

---

## 📈 MÉTRICAS DE CONTEXTO (NO SON CODE SMELLS, PERO ENMARCAN RIESGO)

- **Tests:** 499 passing / 10 skipped / 0 failing
- **Coverage real (v8):** Lines 53.74% (ver `COVERAGE_STATUS.md`)

---

## ✅ RECOMENDACIONES (Ordenadas por impacto)

1. **Definir contrato tipado del “Project Data”** (shape estable) y centralizarlo.
2. **Eliminar warnings de `act(...)`** en tests más sensibles.
3. **Reducir complejidad de componentes grandes** sólo donde mezcle negocio + UI.
4. **Mantener checklist AR** (renderer alpha + DOM overlay) para evitar regresiones.

---

*Reporte actualizado: Diciembre 2025*
