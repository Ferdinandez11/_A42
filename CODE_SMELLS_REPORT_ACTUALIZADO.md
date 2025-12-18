# 🔍 Reporte de Code Smells y Riesgos - A42 (Actualizado)

**Fecha:** Diciembre 2025  
**Auditor:** Arquitecto de Software Senior  
**Alcance:** Estado actual con tests estabilizados + mejoras recientes (AR, UI)

---

## 📋 RESUMEN EJECUTIVO

El proyecto está **estable** y con base modular clara. La deuda técnica actual es **manejable** y se concentra en: contratos de datos dinámicos (tipado), componentes grandes y algunos warnings de tests.

**Severidad general:** 🟡 **MEDIA**

**Indicadores reales (medidos):**
- **Tests:** 509 total → **499 passing**, **10 skipped**, **0 failing**
- **Coverage real (v8):** Stmts **52.86%**, Branch **43.21%**, Funcs **59.64%**, Lines **53.74%**

---

## ✅ CAMBIOS/MEJORAS RECIENTES RELEVANTES

- ✅ **Suite de tests estabilizada** (0 fallos) y coverage real disponible.
- ✅ **AR (WebXR) sin fondo negro**: ajuste de transparencia en renderer + overlay DOM durante sesión.
- ✅ Correcciones puntuales de UI/test contract (p.ej. botón “Reactivar” en archivados, mocks de stores, `className` duplicado en toolbar).

---

## 🔴 1) CONTRATOS DÉBILES / DATOS DINÁMICOS (Alta prioridad)

- En puntos clave (pricing/BOM/proyecto), se consumen estructuras dinámicas y se recurre a supresiones TypeScript.
- **Riesgo:** cambios de forma rompen CRM/PDF/editor con impacto transversal.

**Recomendación:** definir un tipo/contrato único del “Project Data” y validar/migrar al cargar.

---

## 🟠 2) COMPONENTES GRANDES (Media-Alta)

- Existen componentes grandes bien estructurados, pero con mucha responsabilidad acumulada.
- **Riesgo:** coste de mantenimiento y dificultad para añadir features sin fricción.

**Recomendación:** sólo dividir donde mezcle negocio + UI y no exista cohesión clara.

---

## 🟡 3) TESTS: WARNINGS DE `act(...)` (Media)

- Se observan warnings de `act(...)` en algunos tests.
- **Riesgo:** fragilidad de tests con cambios de React/testing.

**Recomendación:** normalizar los tests con updates async.

---

## 🟡 4) AR (WebXR) SENSIBLE A CSS/LAYOUT (Media)

- AR depende de transparencia real (renderer) y de que el DOM overlay no sea opaco.
- **Riesgo:** regresión si se reintroducen fondos opacos en ancestros del canvas.

**Recomendación:** mantener una “checklist AR” y un test manual mínimo por release.

---

## ✅ PLAN DE MEJORA (2-5 días, incremental)

1. Formalizar contrato tipado de proyecto 3D + validación.
2. Reducir warnings `act(...)` en los tests más sensibles.
3. Subir coverage en ramas (condiciones de borde) en flujos críticos.

---

*Reporte actualizado: Diciembre 2025*
