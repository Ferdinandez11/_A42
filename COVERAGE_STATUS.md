# 📊 Estado del Coverage - A42

**Fecha:** Diciembre 2025  
**Estado:** ✅ Coverage real generado (tests en verde)

---

## ✅ SITUACIÓN ACTUAL

### Estado de Tests
- **Total de tests:** 509
- **Passing:** 499 ✅
- **Skipped:** 10 ⏭️
- **Failing:** 0 ❌
- **Test files:** 51

### Coverage Real (v8)
> Generado con `npm run test:coverage`

- **Statements:** **52.86%**
- **Branches:** **43.21%**
- **Functions:** **59.64%**
- **Lines:** **53.74%**

---

## 📁 DÓNDE VER EL REPORTE

- **HTML:** `coverage/index.html`
- **LCOV:** `coverage/lcov.info`

---

## ⚠️ NOTAS (NO BLOQUEANTES)

- Aparecen warnings de Testing Library/React sobre `act(...)` en algunos tests (p.ej. `Catalog`, `BudgetDetailPage`, `useProjects`).
  - **Impacto:** no rompen la suite ni el coverage, pero conviene normalizarlos para evitar tests frágiles.

---

## 🎯 RECOMENDACIÓN INMEDIATA

- Mantener el coverage como métrica real (no estimaciones) y **subir thresholds gradualmente** en CI.
